import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginForm from './components/Auth/LoginForm';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import EmployeeDashboard from './components/Dashboard/EmployeeDashboard';
import ClockInOut from './components/Employee/ClockInOut';
import QRCodeDisplay from './components/Employee/QRCodeDisplay';
import EmployeeManagement from './components/Admin/EmployeeManagement';
import KioskMode from './components/Admin/KioskMode';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, employee } = useAuth();

  if (!user) {
    return <LoginForm />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <EmployeeDashboard />
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
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;