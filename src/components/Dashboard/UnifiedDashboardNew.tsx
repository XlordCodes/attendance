import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import EmployeeDashboardNew from './EmployeeDashboardNew';
import AttendanceLogsNew from '../Attendance/AttendanceLogsNew';

const UnifiedDashboard: React.FC = () => {
  const { employee } = useAuth();
  const [activeTab, setActiveTab] = useState<'employee' | 'admin'>('employee');
  
  const isAdmin = employee?.role?.toLowerCase() === 'admin';

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
                My Attendance
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'admin'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Admin Overview
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
          <AttendanceLogsNew />
        )}
      </div>
    </div>
  );
};

export default UnifiedDashboard;
