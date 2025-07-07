import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Settings, 
  Calendar,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  BarChart3,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useState } from 'react';

const Sidebar: React.FC = () => {
  const { employee, logout } = useAuth();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

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

  const toggleMenu = (menuKey: string) => {
    setExpandedMenu(expandedMenu === menuKey ? null : menuKey);
  };

  const isAdmin = employee?.role?.toLowerCase() === 'admin';

  // New navigation structure
  const navigationItems = [
    {
      key: 'employee-mode',
      label: 'Employee Mode',
      icon: UserCheck,
      hasSubItems: true,
      subItems: [
        { to: '/employee-dashboard', icon: Home, label: 'Dashboard' },
        { to: '/attendance-logs', icon: Calendar, label: 'Attendance Logs' },
      ]
    },
    ...(isAdmin ? [{
      key: 'admin-mode',
      label: 'Admin Mode',
      icon: Settings,
      to: '/admin-mode'
    }] : []),
    ...(isAdmin ? [{
      key: 'overall-attendance',
      label: 'Overall Attendance',
      icon: BarChart3,
      to: '/overall-attendance'
    }] : []),
    ...(isAdmin ? [{
      key: 'employees',
      label: 'Employees',
      icon: Users,
      to: '/employees'
    }] : []),
  ];

  return (
    <div 
      className={`${isExpanded ? 'w-64' : 'w-16'} bg-white border-r border-gray-200 h-screen flex flex-col overflow-hidden transition-all duration-300`}
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
          
          {/* Menu Toggle Button - Better UX positioning */}
          <button
            onClick={toggleSidebar}
            className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ${
              isExpanded ? 'ml-auto' : 'mx-auto'
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
          const isActive = item.to ? location.pathname === item.to : false;
          const isMenuExpanded = expandedMenu === item.key;
          const hasActiveSubItem = item.subItems?.some(subItem => location.pathname === subItem.to);
          
          if (item.hasSubItems) {
            return (
              <div key={item.key}>
                <button
                  onClick={() => toggleMenu(item.key)}
                  className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    hasActiveSubItem || isMenuExpanded
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  } ${!isExpanded ? 'justify-center h-10 w-10' : 'h-10'}`}
                  title={!isExpanded ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {isExpanded && (
                    <>
                      <span className="ml-2 whitespace-nowrap flex-1 text-left">{item.label}</span>
                      {isMenuExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </>
                  )}
                </button>
                
                {/* Sub-menu items */}
                {isExpanded && isMenuExpanded && item.subItems && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.subItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isSubActive = location.pathname === subItem.to;
                      
                      return (
                        <NavLink
                          key={subItem.to}
                          to={subItem.to}
                          className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                            isSubActive
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                          }`}
                        >
                          <SubIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="ml-2 whitespace-nowrap">{subItem.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <NavLink
                key={item.key}
                to={item.to!}
                className={`flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                } ${!isExpanded ? 'justify-center h-10 w-10' : 'h-10'}`}
                title={!isExpanded ? item.label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {isExpanded && (
                  <span className="ml-2 whitespace-nowrap">{item.label}</span>
                )}
              </NavLink>
            );
          }
        })}
      </nav>

      {/* Date & Time - Single line format */}
      <div className="px-3 py-2 border-t border-gray-200 flex-shrink-0">
        {isExpanded ? (
          <div className="text-center">
            <p className="text-xs text-gray-700">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })} • {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xs text-gray-700 font-mono">
              {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>
        )}
      </div>

      {/* User Menu & Logout */}
      <div className="px-3 py-3 border-t border-gray-200 flex-shrink-0">
        <div className={`flex items-center ${isExpanded ? 'justify-between' : 'flex-col space-y-1.5'}`}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`flex items-center text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors ${
              !isExpanded 
                ? 'justify-center h-10 w-10' 
                : 'space-x-1.5 px-3 py-2'
            }`}
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
            className={`flex items-center text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${
              !isExpanded 
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
        
        {isExpanded && (
          <p className="text-xs text-gray-500 text-center mt-2">
            v1.0.0 • AINTRIX Global
          </p>
        )}
      </div>

      {/* Notification Overlay */}
      {showNotifications && (
        <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 w-80 z-40">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Notifications</h3>
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
                <p className="text-sm text-gray-900">System maintenance scheduled</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Attendance record updated</p>
                <p className="text-xs text-gray-500">1 day ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Break time reminder</p>
                <p className="text-xs text-gray-500">3 days ago</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;