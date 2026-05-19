import { Bell, LogOut, Search, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useState } from 'react';
import SettingsModal from '../Settings/SettingsModal';
import { formatOffice, getOfficeNow } from '../../utils/timezoneUtils';

const Header = () => {
  const { employee, logout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-none px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg text-gray-900 dark:text-slate-200">
            Welcome back, {employee?.name?.split(' ')[0]}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatOffice(getOfficeNow(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 w-64 bg-[#E5EDF1] dark:bg-slate-700 border-0 rounded-xl text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#96C2DB]/40"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 bg-[#E5EDF1] text-gray-700 dark:text-gray-300 hover:bg-[#96C2DB]/20 rounded-xl">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          
          {/* User Profile */}
          <div className="flex items-center space-x-3 bg-gray-50 dark:bg-slate-700 rounded-md px-3 py-2">
            <div className="w-8 h-8 bg-[#E5EDF1] text-gray-700 dark:text-gray-300 rounded-xl flex items-center justify-center">
              <span className="font-medium text-sm">
                {employee?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="hidden md:block">
              <p className="font-medium text-sm text-gray-900 dark:text-slate-200">{employee?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{employee?.role}</p>
            </div>
          </div>

          {/* Settings */}
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 bg-[#E5EDF1] text-gray-700 dark:text-gray-300 hover:bg-[#96C2DB]/20 rounded-xl"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 bg-[#E5EDF1] text-gray-700 dark:text-gray-300 hover:bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 transition-colors  rounded-xl"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </header>
  );
};

export default Header;