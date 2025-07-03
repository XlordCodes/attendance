import { useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import EmployeeDashboardNew from './EmployeeDashboardNew';
import AttendanceLogsNew from '../Attendance/AttendanceLogsNew';

const UnifiedDashboard: React.FC = () => {
  const { employee } = useAuth();
  const [activeTab, setActiveTab] = useState<'employee' | 'admin'>('employee');
  
  const isAdmin = employee?.role?.toLowerCase() === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isAdmin ? 'AINTRIX Admin Dashboard' : 'AINTRIX Employee Dashboard'}
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {employee?.name}! 
                {isAdmin && ' You have admin privileges.'}
              </p>
            </div>
            
            {/* Tab Switcher for Admin */}
            {isAdmin && (
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
            )}
            
            <div className="text-right">
              <div className="text-2xl font-mono text-gray-900">
                {format(new Date(), 'HH:mm:ss')}
              </div>
              <div className="text-sm text-gray-500">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
