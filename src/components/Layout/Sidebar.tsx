import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Clock, 
  Users, 
  Settings, 
  Bell,
  Calendar,
  QrCode,
  Monitor
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const Sidebar: React.FC = () => {
  const { employee } = useAuth();
  const location = useLocation();

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

  const navItems = employee?.role === 'admin' ? adminNavItems : employeeNavItems;

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">AttendanceApp</h1>
        <p className="text-sm text-gray-500 mt-1">
          {employee?.name} • {employee?.role}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          v1.0.0 • Production Ready
        </div>
      </div>
    </div>
  );
};

export default Sidebar;