import { useState, useEffect, createContext, useContext } from 'react';
import { auth, db } from '../firebase/config';
import { Employee } from '../types';

interface AuthContextType {
  user: any | null;
  employee: Employee | null;
  loading: boolean;
  login: (employeeId: string, password: string) => Promise<void>;
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
    // Mock auth state change for demo
    const unsubscribe = auth.onAuthStateChanged(async (user: any) => {
      if (user) {
        // Mock employee data for demo
        const mockEmployee: Employee = {
          id: user.uid,
          employeeId: user.uid === 'emp001' ? 'EMP001' : 'ADMIN001',
          name: user.uid === 'emp001' ? 'John Doe' : 'Admin User',
          email: user.email,
          password: '',
          role: user.uid === 'emp001' ? 'employee' : 'admin',
          department: user.uid === 'emp001' ? 'Engineering' : 'Administration',
          isActive: true,
          createdAt: new Date(),
          qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        };
        setEmployee(mockEmployee);
      } else {
        setEmployee(null);
      }
      setUser(user);
      setLoading(false);
    });

    // For demo, simulate initial load
    setTimeout(() => {
      setLoading(false);
    }, 1000);

    return unsubscribe;
  }, []);

  const login = async (employeeId: string, password: string) => {
    try {
      const email = `${employeeId}@company.com`;
      const result = await auth.signInWithEmailAndPassword(email, password);
      setUser(result.user);
    } catch (error) {
      throw new Error('Invalid credentials. Please check your Employee ID and password.');
    }
  };

  const logout = async () => {
    await auth.signOut();
    setUser(null);
    setEmployee(null);
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