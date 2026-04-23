import { useState, useEffect, createContext, useContext, useMemo, useRef } from 'react';
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

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
};

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
  const isBooting = useRef(true);
  const fetchRequestId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    const initializeSession = async () => {
      try {
        const { data: { session } } = await withTimeout(supabase.auth.getSession(), 12000);
        if (cancelled) return;

        if (session?.user) {
          setUser(session.user);
          await withTimeout(fetchEmployeeData(session.user), 30000);
        } else {
          setUser(null);
          setEmployee(null);
        }
      } catch (err: any) {
        console.error('❌ [TELEMETRY] initializeSession Failed:', err.stack || err);
        toast.error('Connection timed out. Please refresh the page.');
      } finally {
        isBooting.current = false;
        setLoading(false);
      }
    };

    initializeSession();

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;

      console.log('🔄 Auth state changed:', event, session?.user?.email || 'signed out');

      if (isBooting.current && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
        console.log('🛡️ [TELEMETRY] Ignored early auth event during boot sequence:', event);
        return;
      }
      
      if (event === 'INITIAL_SESSION') return;

      try {
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
          // Token refresh succeeded; no need to refetch employee profile if we already have it
          if (!employee) {
            // Defer fetch to next tick to avoid Supabase queue contention
            setTimeout(async () => {
              await withTimeout(fetchEmployeeData(session.user), 30000);
            }, 500);
          }
          return;
        }

        if (event === 'SIGNED_IN') {
          if (cancelled) return;
          setUser(session?.user || null);
          setLoading(false); // Always unblock UI immediately

          if (session?.user) {
            // Only fetch employee if we don't already have it cached
            if (!employee) {
              // Defer to next event loop tick to let Supabase finish internal refresh
              setTimeout(async () => {
                await withTimeout(fetchEmployeeData(session.user), 30000);
              }, 500);
            } else {
              // Employee already in memory — token refresh handled silently by Supabase
            }
          } else {
            setEmployee(null);
          }
        } 
        
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

    subscription = authSubscription;

    return () => {
      cancelled = true;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // ──────────────────────────────────────────────────────────
  // PARALLELISED EMPLOYEE LOOKUP with per-query timeout & request deduplication
  // Each query gets its own timeout to ensure Promise.allSettled always settles.
  // Stale responses are ignored via requestId monotonicity check.
  // ──────────────────────────────────────────────────────────
  const fetchEmployeeData = async (authUser: User) => {
    const currentRequestId = ++fetchRequestId.current;

    try {
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
          .limit(1)
      ]);

      if (currentRequestId !== fetchRequestId.current) {
        return;
      }

      if (
        idResult.status === 'fulfilled' &&
        idResult.value.data &&
        !idResult.value.error
      ) {
        setEmployee(mapDbToEmployee(idResult.value.data));
        return;
      }

      if (
        emailResult.status === 'fulfilled' &&
        emailResult.value.data &&
        emailResult.value.data.length > 0
      ) {
        setEmployee(mapDbToEmployee(emailResult.value.data[0]));
        return;
      }

      if (employee) {
        toast.error('Unable to refresh profile. Using cached data.');
        return;
      }

      toast.error('User record not found. Please contact admin.');
      setEmployee(null);
    } catch (error) {
      if (currentRequestId !== fetchRequestId.current) return;

      if (employee) {
        toast.error('Unable to refresh profile. Using cached data.');
        return;
      }

      toast.error('Error loading user data');
      setEmployee(null);
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

  // ✅ CONTEXT RE-RENDER LOOP PREVENTION
  // Memoize context value to prevent infinite re-renders across the entire app
  // Every state change was previously causing full app re-render cascade
  const value = useMemo(() => ({
    user,
    employee,
    loading,
    login,
    logout,
  }), [user, employee, loading, login, logout]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};
