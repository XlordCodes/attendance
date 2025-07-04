import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import EmployeeDashboardNew from './EmployeeDashboardNew';
import AdminDashboardNew from './AdminDashboardNew';

const UnifiedDashboard: React.FC = () => {
  const { employee } = useAuth();
  const [activeTab, setActiveTab] = useState<'employee' | 'admin'>('employee');
  
  // Check both possible role field names (Role and role) for compatibility
  const isAdmin = employee?.Role === 'Admin' || 
                  employee?.role?.toLowerCase() === 'admin';

  // Debug logging to see what's happening
  useEffect(() => {
    console.log('🔍 Employee data:', employee);
    console.log('🔍 Role field:', employee?.Role);
    console.log('🔍 role field:', employee?.role);
    console.log('🔍 isAdmin:', isAdmin);
  }, [employee, isAdmin]);

  // Automatically switch to admin mode when admin logs in
  useEffect(() => {
    if (isAdmin) {
      console.log('✅ Switching to admin mode');
      setActiveTab('admin');
    }
  }, [isAdmin]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Tab Switcher */}
        {isAdmin && (
          <div className="flex justify-center mb-6">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('employee')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'employee'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Employee View
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'admin'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Admin Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Employee View (Always visible, but primary for non-admins) */}
        {(!isAdmin || activeTab === 'employee') && (
          <EmployeeDashboardNew />
        )}

        {/* Admin View (Only for admins) */}
        {isAdmin && activeTab === 'admin' && (
          <AdminDashboardNew />
        )}
      </div>
    </div>
  );
};

export default UnifiedDashboard;
