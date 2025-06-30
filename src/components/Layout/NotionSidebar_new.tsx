import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth_new';

interface NotionSidebarProps {
  userRole: 'admin' | 'employee' | 'kiosk';
  currentPage: string;
  onPageChange: (page: string) => void;
}

const NotionSidebar: React.FC<NotionSidebarProps> = ({ userRole, currentPage, onPageChange }) => {
  const { logout, startAFK } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = {
    employee: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
      { id: 'login-logout', label: 'Login / Logout', icon: '🔄' },
      { id: 'wfh-request', label: 'WFH Request', icon: '🏡' },
    ],
    admin: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
      { id: 'employees', label: 'Employee Management', icon: '👥' },
      { id: 'notifications', label: 'Send Notifications', icon: '📢' },
      { id: 'wfh-approval', label: 'WFH Approvals', icon: '✅' },
      { id: 'analytics', label: 'Analytics', icon: '📊' },
    ],
    kiosk: [
      { id: 'dashboard', label: 'Kiosk Dashboard', icon: '🖥️' },
    ]
  };

  const currentMenuItems = menuItems[userRole] || menuItems.employee;

  const handleAFK = async () => {
    if (userRole === 'employee') {
      await startAFK();
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4">
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-black"
          >
            ☰
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <h1 className="text-lg font-semibold text-black">Aintrix</h1>
          </div>
          <button
            onClick={() => setIsCollapsed(true)}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-black"
          >
            ◀
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {currentMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                currentPage === item.id
                  ? 'bg-gray-100 text-black'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-black'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Employee specific actions */}
        {userRole === 'employee' && (
          <div className="mt-8 pt-4 border-t border-gray-200">
            <div className="space-y-1">
              <button
                onClick={handleAFK}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-50 hover:text-black transition-colors"
              >
                <span className="text-lg">😴</span>
                <span className="font-medium">Start AFK</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="space-y-2">
          <div className="flex items-center space-x-3 px-3 py-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-gray-600 text-sm">👤</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 hover:text-black rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotionSidebar;
