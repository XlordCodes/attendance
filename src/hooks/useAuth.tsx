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
  login: (email: string) => Promise<void>;
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
      setLoading(true);
      
      if (firebaseUser) {
        try {
          // Try to get employee data from Firestore
          const employeeDoc = await getDoc(doc(db, 'employees', firebaseUser.uid));
          
          if (employeeDoc.exists()) {
            const employeeData = employeeDoc.data() as Omit<Employee, 'id'>;
            setEmployee({
              id: firebaseUser.uid,
              ...employeeData,
            });
          } else {
            // If employee document doesn't exist, try to find by email
            const employeesQuery = query(
              collection(db, 'employees'),
              where('email', '==', firebaseUser.email)
            );
            const employeeSnapshot = await getDocs(employeesQuery);
            
            if (!employeeSnapshot.empty) {
              const employeeDoc = employeeSnapshot.docs[0];
              const employeeData = employeeDoc.data() as Omit<Employee, 'id'>;
              setEmployee({
                id: employeeDoc.id,
                ...employeeData,
              });
            } else {
              // Employee not found in database
              toast.error('Employee record not found. Please contact admin.');
              await signOut(auth);
            }
          }
        } catch (error) {
          console.error('Error fetching employee data:', error);
          toast.error('Error loading employee data');
          await signOut(auth);
        }
      } else {
        setEmployee(null);
      }
      
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string) => {
    try {
      setLoading(true);
      
      // Use admin123 as the standard password for all users
      const standardPassword = 'admin123';
      
      // First, check if employee exists in Firestore
      const employeesQuery = query(
        collection(db, 'employees'),
        where('email', '==', email)
      );
      const employeeSnapshot = await getDocs(employeesQuery);
      
      if (employeeSnapshot.empty) {
        throw new Error('Employee not found. Please contact admin to add your account or run the setup first.');
      }
      
      try {
        // Try to sign in with Firebase Auth
        await signInWithEmailAndPassword(auth, email, standardPassword);
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
          throw new Error('Account not set up in authentication system. Please contact admin.');
        } else if (authError.code === 'auth/wrong-password') {
          throw new Error('Authentication error. Please contact admin.');
        } else {
          throw authError;
        }
      }
      
    } catch (error: any) {
      throw new Error(error.message || 'Login failed. Please try again.');
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