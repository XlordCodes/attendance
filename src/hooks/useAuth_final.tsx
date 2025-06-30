import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, AuthUser } from '../services/authService';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  loginAdmin: (email: string, password: string) => Promise<void>;
  loginKiosk: (kioskId: string, password: string) => Promise<void>;
  loginEmployee: (email: string, password: string, location: GeolocationPosition, qrToken: string) => Promise<void>;
  logout: () => Promise<void>;
  startAFK: () => Promise<void>;
  endAFK: () => Promise<void>;
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state
    const initAuth = async () => {
      try {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          const role = await authService.getUserRole(currentUser.uid);
          if (role) {
            const authUser: AuthUser = {
              uid: currentUser.uid,
              email: currentUser.email!,
              displayName: currentUser.displayName || currentUser.email!.split('@')[0],
              role,
              isActive: true,
              createdAt: new Date(),
              lastLogin: new Date()
            };
            setUser(authUser);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const loginAdmin = async (email: string, password: string) => {
    try {
      setLoading(true);
      const authUser = await authService.loginAdmin(email, password);
      setUser(authUser);
      toast.success('Admin login successful');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginKiosk = async (kioskId: string, password: string) => {
    try {
      setLoading(true);
      const authUser = await authService.loginKiosk(kioskId, password);
      setUser(authUser);
      toast.success('Kiosk mode activated');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginEmployee = async (email: string, password: string, location: GeolocationPosition, qrToken: string) => {
    try {
      setLoading(true);
      const authUser = await authService.loginEmployee(email, password, location, qrToken);
      setUser(authUser);
      toast.success('Login successful');
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error: any) {
      toast.error('Logout failed');
    }
  };

  const startAFK = async () => {
    if (user) {
      try {
        await authService.startAFK(user.uid);
        toast.success('AFK mode started');
      } catch (error: any) {
        toast.error('Failed to start AFK mode');
      }
    }
  };

  const endAFK = async () => {
    if (user) {
      try {
        await authService.endAFK(user.uid);
        toast.success('AFK mode ended');
      } catch (error: any) {
        toast.error('Failed to end AFK mode');
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      loginAdmin,
      loginKiosk,
      loginEmployee,
      logout,
      startAFK,
      endAFK
    }}>
      {children}
    </AuthContext.Provider>
  );
};
