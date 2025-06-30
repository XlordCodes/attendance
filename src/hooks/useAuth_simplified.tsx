import { useState, useEffect, createContext, useContext } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { Employee } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: any | null;
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
  const [user, setUser] = useState<any | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in localStorage on app load
    const storedEmail = localStorage.getItem('currentUserEmail');
    if (storedEmail) {
      loadEmployeeFromEmail(storedEmail);
    } else {
      setLoading(false);
    }
  }, []);

  const loadEmployeeFromEmail = async (email: string) => {
    try {
      setLoading(true);
      console.log(`Loading employee data for: ${email}`);
      
      // Check if email exists in admins collection
      const adminsRef = collection(db, 'admins');
      const adminsSnapshot = await getDocs(adminsRef);
      
      console.log(`Found ${adminsSnapshot.size} documents in admins collection`);
      
      let adminData: any = null;
      for (const doc of adminsSnapshot.docs) {
        const data = doc.data();
        console.log(`Checking admin doc: ${doc.id}`, data);
        
        if (doc.id === email || data.email === email) {
          adminData = { id: doc.id, ...data };
          console.log(`✅ Found matching admin:`, adminData);
          break;
        }
      }
      
      if (adminData) {
        // Create mock user object
        const mockUser = {
          uid: email,
          email: email,
          displayName: adminData.name || email.split('@')[0],
        };
        
        // Create employee object for admin
        const adminEmployee: Employee = {
          id: email,
          employeeId: `ADMIN_${Date.now()}`,
          name: adminData.name || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          email: email,
          role: 'admin',
          department: adminData.department || 'Administration',
          isActive: true,
          createdAt: new Date(),
          qrCode: '',
          password: 'admin123'
        };
        
        setUser(mockUser);
        setEmployee(adminEmployee);
        localStorage.setItem('currentUserEmail', email);
      } else {
        throw new Error('Admin not found in admins collection');
      }
    } catch (error: any) {
      console.error('Error loading employee:', error);
      setUser(null);
      setEmployee(null);
      localStorage.removeItem('currentUserEmail');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string) => {
    try {
      setLoading(true);
      console.log(`🔐 Attempting to login with email: ${email}`);
      
      // Validate email format
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }
      
      await loadEmployeeFromEmail(email);
      toast.success(`Welcome! Logged in as ${email}`);
      console.log(`✅ Login successful for: ${email}`);
      
    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      let errorMessage = error.message || 'Login failed';
      
      if (error.message.includes('Admin not found')) {
        errorMessage = `Email ${email} not found in admins collection. Please add it to Firebase Firestore first.`;
      }
      
      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      setEmployee(null);
      localStorage.removeItem('currentUserEmail');
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
