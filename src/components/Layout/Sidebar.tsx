import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Settings, 
  Calendar,
  LogOut,
  Coffee,
  UserX,
  ChevronDown,
  Menu,
  X,
  Play,
  CalendarPlus
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';

const Sidebar: React.FC = () => {
  const { employee, logout } = useAuth();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [breakMinutes, setBreakMinutes] = useState('');
  const [showAFKOverlay, setShowAFKOverlay] = useState(false);
  const [afkTime, setAfkTime] = useState(0);
  const [afkStartTime, setAfkStartTime] = useState<Date | null>(null);

  // AFK Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showAFKOverlay && afkStartTime) {
      interval = setInterval(() => {
        setAfkTime(Math.floor((Date.now() - afkStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showAFKOverlay, afkStartTime]);

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
    setShowBreakModal(true);
  };

  const submitBreakRequest = () => {
    if (breakMinutes && !isNaN(Number(breakMinutes))) {
      console.log(`Break requested for ${breakMinutes} minutes`);
      // TODO: Implement break logic
      setShowBreakModal(false);
      setBreakMinutes('');
    }
  };

  const handleAFK = () => {
    setShowAFKOverlay(true);
    setAfkStartTime(new Date());
    setAfkTime(0);
  };

  const endAFK = () => {
    setShowAFKOverlay(false);
    setAfkStartTime(null);
    setAfkTime(0);
    console.log('AFK mode ended');
    // TODO: Implement end AFK logic
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const employeeNavItems = [
    { to: '/employee-dashboard', icon: Home, label: 'Employee Dashboard' },
    { to: '/clock', icon: Play, label: 'Clock In/Out' },
    { to: '/attendance-logs', icon: Calendar, label: 'My Attendance' },
  ];

  const adminNavItems = [
    { to: '/admin-dashboard', icon: Home, label: 'Admin Dashboard' },
    { to: '/employees', icon: Users, label: 'Manage Employees' },
    { to: '/admin-attendance', icon: Calendar, label: 'All Attendance' },
    { to: '/assign-meeting', icon: CalendarPlus, label: 'Assign Meeting' },
    { to: '/setup', icon: Settings, label: 'Setup' },
  ];

  // For admin users, show both admin and employee sections
  const isAdmin = employee?.role?.toLowerCase() === 'admin';

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
      <nav className="px-2 py-3 space-y-1 border-b border-gray-200">
        {isAdmin ? (
          <>
            {/* Admin Section */}
            {isExpanded && (
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Admin Panel
              </div>
            )}
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  } ${!isExpanded ? 'justify-center h-10 w-10' : 'h-10'}`}
                  title={!isExpanded ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {isExpanded && (
                    <span className="ml-2 whitespace-nowrap transition-opacity duration-300">{item.label}</span>
                  )}
                </NavLink>
              );
            })}
            
            {/* Employee Section for Admin */}
            {isExpanded && (
              <div className="px-3 py-2 pt-4 text-xs font-semibold text-gray-500 uppercase tracking-wide border-t border-gray-100 mt-3">
                Employee Features
              </div>
            )}
            {!isExpanded && <div className="border-t border-gray-200 my-2"></div>}
            {employeeNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                  } ${!isExpanded ? 'justify-center h-10 w-10' : 'h-10'}`}
                  title={!isExpanded ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {isExpanded && (
                    <span className="ml-2 whitespace-nowrap transition-opacity duration-300">{item.label}</span>
                  )}
                </NavLink>
              );
            })}
          </>
        ) : (
          // Regular employee navigation
          <>
            {employeeNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  } ${!isExpanded ? 'justify-center h-10 w-10' : 'h-10'}`}
                  title={!isExpanded ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {isExpanded && (
                    <span className="ml-2 whitespace-nowrap transition-opacity duration-300">{item.label}</span>
                  )}
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      {/* Quick Actions - Only for regular employees */}
      {!isAdmin && (
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
                  className="h-10 w-10 flex items-center justify-center bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors mx-auto" 
                  title="Take Break"
                >
                  <Coffee className="w-4 h-4 text-yellow-600" />
                </button>
                <button 
                  onClick={handleAFK}
                  className="h-10 w-10 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-lg transition-colors mx-auto" 
                  title="AFK"
                >
                  <UserX className="w-4 h-4 text-red-600" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1"></div>

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

      {/* User Profile */}
      {employee && (
        <div className="px-3 py-3 border-t border-gray-200 flex-shrink-0">
          {isExpanded ? (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {employee.name ? employee.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {employee.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {employee.role || 'Employee'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {employee.name ? employee.name.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* Break Request Modal */}
      {showBreakModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Request Break Time
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              How many minutes do you need for your break?
            </p>
            <input
              type="number"
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value)}
              placeholder="Enter minutes (e.g., 15)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              min="1"
              max="120"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowBreakModal(false);
                  setBreakMinutes('');
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitBreakRequest}
                disabled={!breakMinutes.trim() || isNaN(Number(breakMinutes))}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
              >
                <Coffee className="w-4 h-4" />
                <span>Start Break</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AFK Overlay */}
      {showAFKOverlay && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center z-50">
          <div className="text-center text-white">
            <div className="mb-8">
              <UserX className="w-24 h-24 mx-auto mb-4 text-red-400" />
              <h2 className="text-4xl font-bold mb-2">Away From Keyboard</h2>
              <p className="text-xl text-gray-300">You are currently AFK</p>
            </div>
            
            <div className="mb-8">
              <div className="text-6xl font-mono font-bold mb-2">
                {formatTime(afkTime)}
              </div>
              <p className="text-lg text-gray-400">
                AFK since {afkStartTime?.toLocaleTimeString()}
              </p>
            </div>
            
            <button
              onClick={endAFK}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-colors flex items-center space-x-3 mx-auto"
            >
              <Play className="w-6 h-6" />
              <span>End AFK - Resume Work</span>
            </button>
          </div>
        </div>
      )}

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