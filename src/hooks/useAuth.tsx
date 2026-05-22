import { useState, useEffect, createContext, useContext } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Employee } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<unknown>;
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
    let cancelled = false;

    // ────────────────────────────────────────────────────────
    // THE HYDRATION FAILSAFE
    // We explicitly call getSession() to predictably hydrate the initial state
    // and release the loading lock. This prevents the INITIAL_SESSION race condition.
    // ────────────────────────────────────────────────────────
    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (session?.user) {
          setUser(session.user);
          await fetchEmployeeData(session.user);
        } else {
          setUser(null);
          setEmployee(null);
        }
      } catch (err) {
        console.error('❌ Hydration failsafe error:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;

      console.log('🔄 Auth state changed:', event, session?.user?.email || 'signed out');

      // Boot is strictly handled by initializeSession
      if (event === 'INITIAL_SESSION') return;

      try {
        // Token refresh: user/employee unchanged, just update the JWT seamlessly.
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
          return;
        }

        if (event === 'SIGNED_IN') {
          setLoading(true);

          if (session?.user) {
            setUser(session.user);
            // fetchEmployeeData guarantees graceful resolution (Promise.allSettled)
            await fetchEmployeeData(session.user);
          } else {
            setUser(null);
            setEmployee(null);
          }
        } 
        
        // Handle Session Dropped
        else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESH_FAILED') {
          setEmployee(null);
          setUser(null);
          toast.error('Session expired. Please log in again.');
          window.location.href = '/';
        }
      } catch (err) {
        console.error('❌ Invariant Error traversing auth state machine:', err);
      } finally {
        if (event === 'SIGNED_IN' && !cancelled) {
            setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // ──────────────────────────────────────────────────────────
  // PARALLELISED EMPLOYEE LOOKUP  (Defect 7 fix)
  //
  // Previously:  id lookup → wait → on failure → email lookup
  //              Total: ~300-400ms sequential
  //
  // Now:         id lookup ┐
  //              email lookup ┤  → prefer id result
  //              Total: ~150-200ms (single RTT)
  // ──────────────────────────────────────────────────────────
  const fetchEmployeeData = async (authUser: User) => {
    try {
      console.log('👤 Fetching user data for UID:', authUser.id);

      // Fire both lookups in parallel
      const [idResult, emailResult] = await Promise.allSettled([
        supabase
          .from('employees')
          .select('*')
          .eq('id', authUser.id)
          .single(),
        supabase
          .from('employees')
          .select('*')
          .eq('email', authUser.email)
          .limit(1),
      ]);

      // Prefer the primary-key (id) lookup
      if (
        idResult.status === 'fulfilled' &&
        idResult.value.data &&
        !idResult.value.error
      ) {
        console.log('✅ User data loaded (by id):', idResult.value.data);
        setEmployee(mapDbToEmployee(idResult.value.data));
        return;
      }

      // Fall back to email lookup
      if (
        emailResult.status === 'fulfilled' &&
        emailResult.value.data &&
        emailResult.value.data.length > 0
      ) {
        console.log('✅ User data loaded (by email):', emailResult.value.data[0]);
        setEmployee(mapDbToEmployee(emailResult.value.data[0]));
        return;
      }

      // Both lookups failed — user is authenticated but has no employee row
      console.error('❌ User record not found in database for', authUser.email);
      toast.error('User record not found. Please contact admin.');
      // employee remains null — ProtectedRoute will show the error state
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
      toast.error('Error loading user data');
      // employee remains null — same fallback
    }
  };

  const mapDbToEmployee = (dbData: any): Employee => {
    return {
      id: dbData.id,
      uid: dbData.uid || dbData.id,
      employeeId: dbData.employee_id,
      name: dbData.name,
      email: dbData.email,
      role: dbData.role,
      department: dbData.department,
      position: dbData.position,
      designation: dbData.designation,
      isActive: dbData.is_active,
      joinDate: dbData.join_date,
      createdAt: new Date(dbData.created_at),
      lastLogin: dbData.last_login ? new Date(dbData.last_login) : undefined
    };
  };

  const login = async (email: string, password: string) => {
    try {
      // NOTE: Do NOT call setLoading(true) here.
      // onAuthStateChange will fire SIGNED_IN and handle
      // loading state + fetchEmployeeData automatically.
      // Setting loading here would cause a flicker.

      console.log('🔐 Starting login process for:', email);

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        // Map Supabase error messages to user-friendly strings
        const msg = authError.message;
        if (msg?.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials.');
        } else if (msg?.includes('Email not confirmed')) {
          throw new Error('Please confirm your email address before logging in.');
        } else if (msg?.includes('Too many requests')) {
          throw new Error('Too many failed login attempts. Please try again later.');
        } else if (msg?.includes('User account locked')) {
          throw new Error('This account has been disabled. Please contact admin.');
        } else {
          throw new Error(`Authentication failed: ${msg}`);
        }
      }

      console.log('✅ Supabase Auth successful for:', email);

      // Fire-and-forget: update last_login timestamp
      // Not awaited — non-critical, should not block login flow
      supabase
        .from('employees')
        .update({ last_login: new Date().toISOString() })
        .eq('id', authData.user.id)
        .then(({ error }) => {
          if (error) console.warn('⚠️ Failed to update last_login:', error.message);
        });

      // Check if user exists in employees table for welcome message
      const { data: userData } = await supabase
        .from('employees')
        .select('name')
        .eq('id', authData.user.id)
        .single();

      if (userData) {
        toast.success(`Welcome back, ${userData.name}!`);
      } else {
        // Fallback: Try email
        const { data: employeesByEmail } = await supabase
          .from('employees')
          .select('name')
          .eq('email', email)
          .limit(1);

        if (employeesByEmail && employeesByEmail.length > 0) {
          toast.success(`Welcome back, ${employeesByEmail[0].name}!`);
        } else {
          toast.success('Login successful!');
        }
      }

      return authData;
    } catch (error: unknown) {
      console.error('❌ Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed. Please try again.';
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setEmployee(null);
      toast.success('Logged out successfully');

      // Full page reload to clear all state — intentional.
      window.location.href = '/';
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
