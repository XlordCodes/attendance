import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import UnifiedLoginPage from './components/Auth/UnifiedLoginPage';
import Sidebar from './components/Layout/Sidebar';
import EmployeeDashboard from './components/Dashboard/EmployeeDashboard';
import AdminDashboardNew from './components/Dashboard/AdminDashboardNew';
import KioskDashboard from './components/Kiosk/KioskDashboard';
import ClockInOut from './components/Employee/ClockInOut';
import QRCodeDisplay from './components/Employee/QRCodeDisplay';
import EmployeeManagement from './components/Admin/EmployeeManagement';
import KioskMode from './components/Admin/KioskMode';
import AdminSetup from './components/Admin/AdminSetup';
import AttendanceLogs from './components/Attendance/AttendanceLogs';
import AttendancePage from './components/Attendance/AttendancePage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, employee, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center animate-pulse">
            <div className="w-6 h-6 bg-white rounded opacity-80"></div>
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 mb-1">Loading AINTRIX</h3>
            <p className="text-sm text-gray-500">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !employee) {
    return <UnifiedLoginPage />;
  }

  // Handle different user roles/modes
  if (employee.role === 'kiosk') {
    return <KioskDashboard />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="p-8 h-full">
          {children}
        </div>
      </main>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, employee } = useAuth();

  // If there's no user, show login form
  if (!user) {
    return (
      <Routes>
        <Route path="/setup" element={<AdminSetup />} />
        <Route path="*" element={<UnifiedLoginPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          {employee?.role === 'admin' ? <AdminDashboardNew /> : <EmployeeDashboard />}
        </ProtectedRoute>
      } />
      <Route path="/clock" element={
        <ProtectedRoute>
          <ClockInOut />
        </ProtectedRoute>
      } />
      <Route path="/qr-code" element={
        <ProtectedRoute>
          <QRCodeDisplay />
        </ProtectedRoute>
      } />
      <Route path="/attendance-logs" element={
        <ProtectedRoute>
          {employee?.role === 'admin' ? <AttendanceLogs /> : <AttendancePage />}
        </ProtectedRoute>
      } />
      
      {/* Admin Routes */}
      {employee?.role === 'admin' && (
        <>
          <Route path="/employees" element={
            <ProtectedRoute>
              <EmployeeManagement />
            </ProtectedRoute>
          } />
          <Route path="/kiosk" element={
            <ProtectedRoute>
              <KioskMode />
            </ProtectedRoute>
          } />
          <Route path="/setup" element={
            <ProtectedRoute>
              <AdminSetup />
            </ProtectedRoute>
          } />
        </>
      )}
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
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
  );
}

export default App;