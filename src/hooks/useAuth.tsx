import { useState, useEffect, createContext, useContext } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';
import { Employee } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  login: (email: string, password: string, role?: string) => Promise<unknown>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔄 Auth state changed:', firebaseUser?.email || 'signed out');
      setLoading(true);
      
      if (firebaseUser) {
        try {
          console.log('👤 Fetching user data for UID:', firebaseUser.uid);
          
          // Try to get user data from Firestore users collection by UID first
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as Omit<Employee, 'id'>;
            const employeeData = {
              id: firebaseUser.uid,
              ...userData,
            };
            
            console.log('✅ User data loaded from Firestore:', employeeData);
            setEmployee(employeeData);
          } else {
            console.log('⚠️ No user document found by UID, trying email lookup...');
            
            // Fallback: Try to find by email in users collection
            const usersQuery = query(
              collection(db, 'users'),
              where('email', '==', firebaseUser.email)
            );
            const usersSnapshot = await getDocs(usersQuery);
            
            if (!usersSnapshot.empty) {
              const userDocByEmail = usersSnapshot.docs[0];
              const userData = userDocByEmail.data() as Omit<Employee, 'id'>;
              const employeeData = {
                id: userDocByEmail.id,
                ...userData,
              };
              
              console.log('✅ User data found by email:', employeeData);
              setEmployee(employeeData);
            } else {
              console.error('❌ User record not found in Firestore');
              toast.error('User record not found. Please contact admin.');
              await signOut(auth);
            }
          }
        } catch (error) {
          console.error('❌ Error fetching user data:', error);
          toast.error('Error loading user data');
          await signOut(auth);
        }
      } else {
        console.log('👋 User signed out');
        setEmployee(null);
      }
      
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string, role?: string) => {
    try {
      setLoading(true);
      
      console.log('🔐 Starting login process for:', email, 'Role:', role);
      
      // Step 1: First authenticate with Firebase Auth
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ Firebase Auth successful for:', email);
        
        // Step 2: Check if user exists in Firestore users collection
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('✅ User found in Firestore:', userData);
          
          // Step 3: Check role if specified
          if (role && userData.role && userData.role.toLowerCase() !== role.toLowerCase()) {
            // If specific role requested but user doesn't have that role
            if (role === 'admin' && userData.role.toLowerCase() !== 'admin') {
              throw new Error('Access denied. Admin privileges required.');
            }
            // Note: Admin users can access employee portal, so we don't restrict that
          }
          
          return userCredential;
          
        } else {
          console.log('⚠️ No user document found in Firestore, trying email lookup...');
          
          // Fallback: Try to find by email in users collection
          const usersQuery = query(
            collection(db, 'users'),
            where('email', '==', email)
          );
          const usersSnapshot = await getDocs(usersQuery);
          
          if (usersSnapshot.empty) {
            throw new Error('User profile not found in database. Please contact admin to set up your profile.');
          }
          
          const userDocByEmail = usersSnapshot.docs[0];
          const userData = userDocByEmail.data();
          console.log('✅ User found by email:', userData);
          
          // Check role if specified
          if (role && userData.role && userData.role.toLowerCase() !== role.toLowerCase()) {
            if (role === 'admin' && userData.role.toLowerCase() !== 'admin') {
              throw new Error('Access denied. Admin privileges required.');
            }
          }
          
          return userCredential;
        }
        } catch (authError: unknown) {
          console.error('❌ Firebase Auth error:', authError);
          
          if (authError instanceof Error) {
            const errorCode = (authError as { code?: string }).code;
            
            if (errorCode === 'auth/user-not-found') {
              throw new Error('Account not found. Please check your email address.');
            } else if (errorCode === 'auth/wrong-password') {
              throw new Error('Invalid password. Please check your credentials.');
            } else if (errorCode === 'auth/invalid-email') {
              throw new Error('Invalid email format.');
            } else if (errorCode === 'auth/too-many-requests') {
              throw new Error('Too many failed login attempts. Please try again later.');
            } else if (errorCode === 'auth/user-disabled') {
              throw new Error('This account has been disabled. Please contact admin.');
            } else {
              throw new Error(`Authentication failed: ${authError.message}`);
            }
          } else {
            throw new Error('Authentication failed. Please try again.');
          }
        }
      
    } catch (error: unknown) {
      console.error('❌ Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed. Please try again.';
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setEmployee(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error during logout');
    }
  };

  const value = {
    user,
    employee,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};