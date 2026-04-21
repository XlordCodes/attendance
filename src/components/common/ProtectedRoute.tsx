import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { user, employee, loading } = useAuth();

  // ─── STATE 1: Auth is still initialising ───────────────────
  // NEVER redirect while loading — this was the root cause of
  // the redirect-loop race condition (Defect 2).
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center animate-pulse">
            <div className="w-6 h-6 bg-white rounded opacity-80"></div>
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 mb-1">Authenticating User</h3>
            <p className="text-sm text-gray-500">Verifying session...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── STATE 2: No Supabase session — genuinely unauthenticated ──
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ─── STATE 3: Session exists but employee profile is missing ──
  // This happens when:
  //   a) The employees table row hasn't been provisioned yet
  //   b) RLS denied the SELECT
  //   c) A transient network error during fetchEmployeeData
  //
  // Previously this fell through to `!employee → redirect /login`,
  // creating an infinite loop with UnifiedLoginPage's auto-redirect.
  // Now we show an inline error with a retry action.
  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-6 max-w-md text-center px-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Employee Profile Not Found
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              You are authenticated as <span className="font-medium text-gray-900">{user.email}</span>, 
              but your employee profile could not be loaded from the database.
              This usually means your profile hasn't been provisioned yet.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={async () => {
                const { supabase } = await import('../../services/supabaseClient');
                await supabase.auth.signOut();
                window.location.href = '/login';
              }}
              className="flex-1 px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
          <p className="text-xs text-gray-400">
            If this issue persists, please contact your system administrator.
          </p>
        </div>
      </div>
    );
  }

  // ─── STATE 4: Admin access check ──────────────────────────
  if (requireAdmin && employee.role?.toLowerCase() !== 'admin') {
    toast.error('Access denied: Administrator privileges required');
    return <Navigate to="/dashboard" replace />;
  }

  // ─── STATE 5: All checks passed — render children ─────────
  return <>{children}</>;
};

export default ProtectedRoute;