import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import EmployeeDashboardNew from './EmployeeDashboardNew';

const UnifiedDashboard: React.FC = () => {
  const { employee } = useAuth();
  
  // Check admin role
  const isAdmin = employee?.role?.toLowerCase() === 'admin';

  // Debug logging to see what's happening
  useEffect(() => {
    console.log('🔍 Employee data:', employee);
    console.log('🔍 role field:', employee?.role);
    console.log('🔍 isAdmin:', isAdmin);
  }, [employee, isAdmin]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Navigation Helper */}
        {isAdmin && (
          <div className="flex justify-center mb-6">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                className="px-4 py-2 rounded-md text-sm font-medium bg-white text-gray-900 shadow-sm"
              >
                Employee View
              </button>
              <button
                onClick={() => window.location.href = '/admin-mode'}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                Admin Mode
              </button>
            </div>
          </div>
        )}

        {/* Always show Employee View */}
        <EmployeeDashboardNew />
      </div>
    </div>
  );
};

export default UnifiedDashboard;
