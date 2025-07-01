import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Settings, 
  Calendar,
  QrCode,
  Monitor,
  LogOut,
  Coffee,
  UserX,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useState } from 'react';

const Sidebar: React.FC = () => {
  const { employee, logout } = useAuth();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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

  const handleBreakRequest = () => {
    const breakTime = prompt('How many minutes for break?');
    if (breakTime && !isNaN(Number(breakTime))) {
      console.log(`Break requested for ${breakTime} minutes`);
      // TODO: Implement break logic
    }
  };

  const handleAFK = () => {
    console.log('AFK mode activated');
    // TODO: Implement AFK logic
  };

  const employeeNavItems = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/attendance-logs', icon: Calendar, label: 'My Attendance' },
    { to: '/qr-code', icon: QrCode, label: 'QR Code' },
  ];

  const adminNavItems = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/employees', icon: Users, label: 'Employees' },
    { to: '/attendance-logs', icon: Calendar, label: 'Attendance Logs' },
    { to: '/kiosk', icon: Monitor, label: 'Kiosk Mode' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const navItems = employee?.role === 'admin' ? adminNavItems : employeeNavItems;

  return (
    <div 
      className={`${isExpanded ? 'w-64' : 'w-14'} bg-white border-r border-gray-200 h-screen flex flex-col overflow-hidden transition-all duration-300`}
    >
      {/* Header with Menu Toggle */}
      <div className="px-3 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          {isExpanded && (
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-gray-900 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">A</span>
              </div>
              <div className="transition-opacity duration-300">
                <h1 className="font-bold text-gray-900 whitespace-nowrap text-sm">AINTRIX</h1>
                <p className="text-xs text-gray-500 whitespace-nowrap">Attendance System</p>
              </div>
            </div>
          )}
          
          {/* Menu Toggle Button */}
          <button
            onClick={toggleSidebar}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors mx-auto"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation - Moved to top */}
      <nav className="px-2 py-3 space-y-1 border-b border-gray-200">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center px-2 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              } ${!isExpanded ? 'justify-center' : ''}`}
              title={!isExpanded ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {isExpanded && (
                <span className="ml-2 whitespace-nowrap transition-opacity duration-300">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Quick Actions - Updated */}
      <div className="px-3 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="space-y-2">
          {/* Take Break and AFK */}
          {isExpanded ? (
            <div className="grid grid-cols-2 gap-1.5">
              <button 
                onClick={handleBreakRequest}
                className="flex flex-col items-center p-2 bg-yellow-50 hover:bg-yellow-100 rounded-md transition-colors"
              >
                <Coffee className="w-3 h-3 mb-1 text-yellow-600" />
                <span className="text-xs text-gray-700 font-medium">Break</span>
              </button>
              <button 
                onClick={handleAFK}
                className="flex flex-col items-center p-2 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
              >
                <UserX className="w-3 h-3 mb-1 text-red-600" />
                <span className="text-xs text-gray-700 font-medium">AFK</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <button 
                onClick={handleBreakRequest}
                className="w-full flex items-center justify-center p-2 bg-yellow-50 hover:bg-yellow-100 rounded-md transition-colors" 
                title="Take Break"
              >
                <Coffee className="w-3 h-3 text-yellow-600" />
              </button>
              <button 
                onClick={handleAFK}
                className="w-full flex items-center justify-center p-2 bg-red-50 hover:bg-red-100 rounded-md transition-colors" 
                title="AFK"
              >
                <UserX className="w-3 h-3 text-red-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* User Menu & Logout */}
      <div className="px-3 py-3 border-t border-gray-200 flex-shrink-0">
        <div className={`flex items-center ${isExpanded ? 'justify-between' : 'flex-col space-y-1.5'}`}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`flex items-center space-x-1.5 text-sm text-gray-600 hover:text-gray-900 p-1.5 rounded-md hover:bg-gray-100 transition-colors ${!isExpanded ? 'justify-center' : ''}`}
            title="Settings"
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            {isExpanded && (
              <>
                <span className="whitespace-nowrap text-xs">Settings</span>
                <ChevronDown className={`w-3 h-3 transition-all duration-300 ${showUserMenu ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>
          
          <button
            onClick={handleLogout}
            className={`flex items-center space-x-1.5 px-2 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors ${!isExpanded ? 'justify-center' : ''}`}
            title="Logout"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {isExpanded && (
              <span className="whitespace-nowrap text-xs">Logout</span>
            )}
          </button>
        </div>
        
        {showUserMenu && isExpanded && (
          <div className="bg-gray-50 rounded-md p-2 mt-2 space-y-1">
            <button className="w-full text-left text-xs text-gray-600 hover:text-gray-900 py-1">
              Profile Settings
            </button>
            <button className="w-full text-left text-xs text-gray-600 hover:text-gray-900 py-1">
              Preferences
            </button>
            <button className="w-full text-left text-xs text-gray-600 hover:text-gray-900 py-1">
              Help & Support
            </button>
          </div>
        )}

        {/* Date & Time - Moved to bottom */}
        {isExpanded && (
          <div className="text-center py-2 mt-3 bg-gray-50 rounded-md">
            <p className="text-xs font-semibold text-gray-900">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>
        )}
        
        {isExpanded && (
          <p className="text-xs text-gray-500 text-center mt-2">
            v1.0.0 • AINTRIX Global
          </p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;