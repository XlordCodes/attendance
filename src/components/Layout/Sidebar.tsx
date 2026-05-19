import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Settings,
  Calendar,
  LogOut,
  Menu,
  X,
  BarChart3,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useState } from 'react';
import SettingsModal from '../Settings/SettingsModal';
import { formatOffice, formatOfficeTimeShort, getOfficeNow } from '../../utils/timezoneUtils';

const Sidebar: React.FC = () => {
  const { employee, logout } = useAuth();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const isAdmin = employee?.role?.toLowerCase() === 'admin';

  // Navigation structure - Flattened for both roles to stay clickable in collapsed state
  const navigationItems = [
    // Direct access for all roles
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/attendance-logs', icon: Calendar, label: 'Attendance Logs' },
    // Admin-only items
    ...(isAdmin ? [
      {
        key: 'admin-mode',
        label: 'Admin Mode',
        icon: UserCheck,
        to: '/admin-mode'
      },
      {
        key: 'overall-attendance',
        label: 'Overall Attendance',
        icon: BarChart3,
        to: '/overall-attendance'
      },
      {
        key: 'employees',
        label: 'Employees',
        icon: Users,
        to: '/employees'
      }
    ] : []),
  ];

  return (
    <div
      className={`${isExpanded ? 'w-64' : 'w-16'} bg-white dark:bg-slate-800 border-r border-gray-100 dark:border-slate-700 h-screen flex flex-col overflow-hidden transition-all duration-300`}
    >
      {/* Header with Menu Toggle */}
      <div className="px-3 py-3 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          {isExpanded && (
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-gray-900 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-xs">A</span>
              </div>
              <div className="transition-opacity duration-300">
                <h1 className="font-semibold text-gray-900 dark:text-slate-200 whitespace-nowrap text-sm">AINTRIX</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Attendance System</p>
              </div>
            </div>
          )}

          {/* Menu Toggle Button */}
          <button
            onClick={toggleSidebar}
            className={`p-2 text-gray-700 dark:text-gray-300 hover:bg-[#E5EDF1] dark:hover:bg-slate-700 hover:text-black rounded-lg ${isExpanded ? 'ml-auto' : 'mx-auto'
              }`}
            title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {isExpanded ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-2 py-3 space-y-1 flex-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;

          return (
            <NavLink
              key={item.key || item.to}
              to={item.to!}
              className={`flex items-center px-3 py-3 text-sm transition-all duration-200 ${isActive
                  ? 'bg-[#96C2DB]/10 text-black font-semibold border-l-4 border-[#96C2DB] rounded-r-xl'
                  : 'text-gray-600 dark:text-gray-400 font-medium hover:bg-[#E5EDF1] dark:hover:bg-slate-700 hover:text-black rounded-xl'
                } ${!isExpanded ? 'justify-center h-10 w-10' : 'h-10'}`}
              title={!isExpanded ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {isExpanded && (
                <span className="ml-2 whitespace-nowrap">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Date & Time - Single line format */}
      <div className="px-3 py-2 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
        {isExpanded ? (
          <div className="text-center">
            <p className="text-xs text-gray-700 dark:text-gray-300">
              {formatOffice(getOfficeNow(), 'EEE, MMM d')} • {formatOfficeTimeShort(getOfficeNow())}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xs text-gray-700 dark:text-gray-300 font-mono">
              {formatOfficeTimeShort(getOfficeNow())}
            </p>
          </div>
        )}
      </div>

      {/* User Menu & Logout */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
        <div className={`flex items-center ${isExpanded ? 'justify-between' : 'flex-col space-y-1.5'}`}>
          <button
            onClick={() => setShowSettings(true)}
            className={`flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${!isExpanded
                ? 'justify-center h-10 w-10'
                : 'space-x-1.5 px-3 py-2'
              }`}
            title="Settings"
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            {isExpanded && (
              <span className="whitespace-nowrap text-xs">Settings</span>
            )}
          </button>

          <button
            onClick={handleLogout}
            className={`flex items-center text-sm text-gray-600 dark:text-gray-400 hover:bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 transition-colors  rounded-xl transition-colors ${!isExpanded
                ? 'justify-center h-10 w-10'
                : 'space-x-1.5 px-3 py-2'
              }`}
            title="Logout"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {isExpanded && (
              <span className="whitespace-nowrap text-xs">Logout</span>
            )}
          </button>
        </div>

        {isExpanded && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            AINTRIX Global
          </p>
        )}
      </div>

      {/* Notification Overlay */}
      {showNotifications && (
        <div className="fixed top-4 right-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-600 w-80 z-40">
          <div className="p-4 border-b border-gray-200 dark:border-slate-600 flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-slate-200">Notifications</h3>
            <button
              onClick={() => setShowNotifications(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-slate-200">System maintenance scheduled</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-slate-200">Attendance record updated</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">1 day ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-slate-200">Break time reminder</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">3 days ago</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default Sidebar;