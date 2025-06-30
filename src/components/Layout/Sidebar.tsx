import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Clock, 
  Users, 
  Settings, 
  Bell,
  Calendar,
  QrCode,
  Monitor,
  Search,
  LogOut,
  Coffee,
  MapPin,
  FileText,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useState } from 'react';

const Sidebar: React.FC = () => {
  const { employee, logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const employeeNavItems = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/clock', icon: Clock, label: 'Clock In/Out' },
    { to: '/attendance-logs', icon: Calendar, label: 'My Attendance' },
    { to: '/qr-code', icon: QrCode, label: 'QR Code' },
  ];

  const adminNavItems = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/employees', icon: Users, label: 'Employees' },
    { to: '/attendance-logs', icon: Calendar, label: 'Attendance Logs' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/kiosk', icon: Monitor, label: 'Kiosk Mode' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const quickActions = [
    { icon: Clock, label: 'Quick Clock In', color: 'text-green-600' },
    { icon: Coffee, label: 'Start Break', color: 'text-yellow-600' },
    { icon: MapPin, label: 'Work From Home', color: 'text-blue-600' },
    { icon: FileText, label: 'Request Leave', color: 'text-purple-600' },
  ];

  const navItems = employee?.role === 'admin' ? adminNavItems : employeeNavItems;

  return (
    <div className="w-80 bg-white border-r border-gray-200 h-screen flex flex-col">
      {/* Header */}
      <div className="px-6 py-6 border-b border-gray-200">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gray-900 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <div>
            <h1 className="font-bold text-gray-900">AINTRIX</h1>
            <p className="text-xs text-gray-500">Attendance System</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
          />
        </div>

        {/* Current Date & Time */}
        <div className="text-center py-3 bg-gray-50 rounded-md mb-4">
          <p className="text-sm font-medium text-gray-900">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })}
          </p>
          <p className="text-xs text-gray-500">
            {new Date().toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-900 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {employee?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                Welcome back, {employee?.name?.split(' ')[0]}!
              </p>
              <p className="text-xs text-gray-500 capitalize flex items-center space-x-2">
                <span>{employee?.role}</span>
                <span>•</span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  Online
                </span>
              </p>
            </div>
          </div>
          
          {/* Notifications */}
          <div className="flex items-center space-x-2">
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-6 py-4 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                className="flex flex-col items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Icon className={`w-4 h-4 mb-1 ${action.color}`} />
                <span className="text-xs text-gray-700 font-medium">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-3">Navigation</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 mr-3" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Menu & Logout */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
        
        {showUserMenu && (
          <div className="bg-gray-50 rounded-md p-3 space-y-2">
            <button className="w-full text-left text-sm text-gray-600 hover:text-gray-900 py-1">
              Profile Settings
            </button>
            <button className="w-full text-left text-sm text-gray-600 hover:text-gray-900 py-1">
              Preferences
            </button>
            <button className="w-full text-left text-sm text-gray-600 hover:text-gray-900 py-1">
              Help & Support
            </button>
          </div>
        )}
        
        <p className="text-xs text-gray-500 text-center mt-4">
          v1.0.0 • AINTRIX Global
        </p>
      </div>
    </div>
  );
};

export default Sidebar;