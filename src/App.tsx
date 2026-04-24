import React, { Suspense, Component, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/common/ProtectedRoute';
import Sidebar from './components/Layout/Sidebar';
import { loadWorkingHoursFromDB } from './constants/workingHours';

// ────────────────────────────────────────────────────────────
// LAZY IMPORTS — Code-split every page-level component.
//
// Before:  All 12 pages in the main bundle (~162KB avoidable)
// After:   Each page loads on-demand as a separate chunk.
//          Employees never download admin code. Kiosk mode
//          never downloads dashboard code.
// ────────────────────────────────────────────────────────────
const UnifiedLoginPage = React.lazy(() => import('./components/Auth/UnifiedLoginPage'));
const UnifiedDashboardNew = React.lazy(() => import('./components/Dashboard/UnifiedDashboardNew'));
const AdminModePage = React.lazy(() => import('./components/Admin/AdminModePage'));
const OverallAttendancePage = React.lazy(() => import('./components/Admin/OverallAttendancePage'));
const EmployeeManagement = React.lazy(() => import('./components/Admin/EmployeeManagement'));
const AdminSetup = React.lazy(() => import('./components/Admin/AdminSetup'));
const AssignMeeting = React.lazy(() => import('./components/Admin/AssignMeeting'));
const AttendanceLogsNew = React.lazy(() => import('./components/Attendance/AttendanceLogsNew'));
const AttendancePageNew = React.lazy(() => import('./components/Attendance/AttendancePageNew'));
const LeaveManagement = React.lazy(() => import('./components/Admin/LeaveManagement'));
const KioskMode = React.lazy(() => import('./components/Admin/KioskMode'));

// ────────────────────────────────────────────────────────────
// GLOBAL LOADER — Suspense fallback for lazy-loaded routes.
// Keeps the loading UX consistent with ProtectedRoute's spinner.
// ────────────────────────────────────────────────────────────
const GlobalLoader: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center animate-pulse">
        <div className="w-6 h-6 bg-white rounded opacity-80"></div>
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-gray-900 mb-1">Loading System Module</h3>
        <p className="text-sm text-gray-500">Fetching components...</p>
      </div>
    </div>
  </div>
);

// ────────────────────────────────────────────────────────────
// ERROR BOUNDARY — Catches any unhandled render crash so
// users see a recovery screen instead of a blank white page.
//
// Must be a class component — React does not yet support
// error boundaries as function components.
// ────────────────────────────────────────────────────────────
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('💥 ErrorBoundary caught a render crash:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-6 max-w-lg text-center px-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                An unexpected error occurred while rendering the application.
                This has been logged for investigation.
              </p>
              {this.state.error && (
                <pre className="text-xs text-left bg-gray-100 border border-gray-200 rounded-lg p-3 overflow-auto max-h-32 text-red-700 mb-4">
                  {this.state.error.message}
                </pre>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Reload Application
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
                className="px-6 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ────────────────────────────────────────────────────────────
// APP LAYOUT — Sidebar + main content area
// ────────────────────────────────────────────────────────────
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gray-50 ml-0">
        <div className="p-8 min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// APP CONTENT — Route definitions wrapped in Suspense
// ────────────────────────────────────────────────────────────
const AppContent: React.FC = () => {
  const { user, employee, loading } = useAuth();

  // Load working hours configuration from the database once on app mount
  useEffect(() => {
    loadWorkingHoursFromDB();
  }, []);

  // Strict guard: hold the loading screen until auth state machine settles
  if (loading) {
    return <GlobalLoader />;
  }

  return (
    <Suspense fallback={<GlobalLoader />}>
      <Routes>
        {/* Standalone Kiosk Mode - No auth required, fullscreen interface */}
        <Route path="/kiosk" element={<KioskMode />} />
        
        {/* Unauthenticated routes */}
        <Route path="/login" element={<UnifiedLoginPage />} />
        
         {/* Authenticated routes */}
         <Route path="/" element={<Navigate to="/dashboard" replace />} />
         <Route path="/dashboard" element={
           <ProtectedRoute>
             <AppLayout>
               {/* Unified dashboard for all users - admins get both views */}
               <UnifiedDashboardNew />
             </AppLayout>
           </ProtectedRoute>
         } />
         
         {/* Employee features - accessible by all users */}
         <Route path="/attendance-logs" element={
          <ProtectedRoute>
            <AppLayout>
              <AttendancePageNew />
            </AppLayout>
          </ProtectedRoute>
        } />
        
        {/* Admin-only Routes */}
        <Route path="/admin-mode" element={
          <ProtectedRoute requireAdmin={true}>
            <AppLayout>
              <AdminModePage />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/overall-attendance" element={
          <ProtectedRoute requireAdmin={true}>
            <AppLayout>
              <OverallAttendancePage />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin-attendance" element={
          <ProtectedRoute requireAdmin={true}>
            <AppLayout>
              <AttendanceLogsNew />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/employees" element={
          <ProtectedRoute requireAdmin={true}>
            <AppLayout>
              <EmployeeManagement />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/assign-meeting" element={
          <ProtectedRoute requireAdmin={true}>
            <AppLayout>
              <AssignMeeting />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/leave-management" element={
          <ProtectedRoute requireAdmin={true}>
            <AppLayout>
              <LeaveManagement />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/setup" element={
          <ProtectedRoute requireAdmin={true}>
            <AppLayout>
              <AdminSetup />
            </AppLayout>
          </ProtectedRoute>
         } />

         <Route path="*" element={<Navigate to="/dashboard" replace />} />
       </Routes>
     </Suspense>
   );
};

// ────────────────────────────────────────────────────────────
// APP ROOT — ErrorBoundary → AuthProvider → Router → Content
// ────────────────────────────────────────────────────────────
function App() {
  return (
    <div className="h-full">
      <ErrorBoundary>
        <AuthProvider>
          <Router>
            <div className="App h-full">
              <AppContent />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#1f2937',
                    color: '#ffffff',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontWeight: '500',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    border: '1px solid #374151',
                  },
                  success: {
                    style: {
                      background: '#059669',
                    },
                  },
                  error: {
                    style: {
                      background: '#dc2626',
                    },
                  },
                }}
              />
            </div>
          </Router>
        </AuthProvider>
      </ErrorBoundary>
    </div>
  );
}

export default App;