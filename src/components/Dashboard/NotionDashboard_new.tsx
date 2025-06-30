import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth_new';
import NotionSidebar from '../Layout/NotionSidebar_new';
import LoginLogout from '../Employee/LoginLogout_new';
import KioskMode from '../Kiosk/KioskMode_new';
import AFKOverlay from '../Employee/AFKOverlay_new';

const NotionDashboard: React.FC = () => {
  const { user, authUser, userRole } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAFK, setIsAFK] = useState(false);

  // Check if user is authenticated
  if (!user && !authUser) {
    return null;
  }

  // Handle kiosk mode - full screen interface
  if (userRole === 'kiosk') {
    return <KioskMode />;
  }

  // Handle AFK overlay
  if (isAFK) {
    return <AFKOverlay onEndAFK={() => setIsAFK(false)} />;
  }

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardContent />;
      case 'login-logout':
        return <LoginLogout />;
      case 'notifications':
        return <NotificationsContent />;
      case 'wfh-approval':
        return <WFHApprovalContent />;
      case 'wfh-request':
        return <WFHRequestContent />;
      case 'employees':
        return <EmployeesContent />;
      case 'analytics':
        return <AnalyticsContent />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="flex h-screen bg-white">
      <NotionSidebar 
        userRole={userRole || 'employee'} 
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-black text-white px-6 py-4">
          <h1 className="text-xl font-semibold">Dashboard</h1>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

// Dashboard Content Component
const DashboardContent: React.FC = () => {
  const { authUser, userRole } = useAuth();
  
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-black mb-4">
          Welcome to Aintrix Attendance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-black mb-2">User Role</h3>
            <p className="text-gray-600 capitalize">{userRole || 'Employee'}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-black mb-2">Email</h3>
            <p className="text-gray-600">{authUser?.email || 'N/A'}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-black mb-2">Status</h3>
            <p className="text-green-600">Active</p>
          </div>
        </div>
      </div>
      
      {userRole === 'employee' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 bg-black text-white rounded-lg hover:bg-gray-800">
              🚀 Login/Logout
            </button>
            <button className="p-4 bg-gray-100 text-black rounded-lg hover:bg-gray-200">
              🏡 WFH Request
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Notifications Content
const NotificationsContent: React.FC = () => {
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState('all');

  const handleSendNotification = () => {
    if (!message.trim()) return;
    
    // TODO: Implement notification sending
    console.log('Sending notification:', { message, recipients });
    setMessage('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-black mb-4">Send Notifications</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipients
            </label>
            <select
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="all">All Employees</option>
              <option value="department">Department</option>
              <option value="individual">Individual</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter your message..."
            />
          </div>
          
          <button
            onClick={handleSendNotification}
            className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800"
          >
            📢 Send Notification
          </button>
        </div>
      </div>
    </div>
  );
};

// WFH Approval Content
const WFHApprovalContent: React.FC = () => {
  const [requests] = useState([
    { id: 1, employee: 'John Doe', date: '2024-01-15', reason: 'Personal appointment', status: 'pending' },
    { id: 2, employee: 'Jane Smith', date: '2024-01-16', reason: 'Medical checkup', status: 'pending' }
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-black mb-4">WFH Approval Requests</h2>
        
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium text-black">{request.employee}</h3>
                  <p className="text-sm text-gray-600">Date: {request.date}</p>
                  <p className="text-sm text-gray-600">Reason: {request.reason}</p>
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                    ✅ Approve
                  </button>
                  <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">
                    ❌ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// WFH Request Content (for employees)
const WFHRequestContent: React.FC = () => {
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmitRequest = () => {
    if (!date || !reason.trim()) return;
    
    // TODO: Implement WFH request submission
    console.log('Submitting WFH request:', { date, reason });
    setDate('');
    setReason('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-black mb-4">Request Work From Home</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Please provide a reason for your WFH request..."
            />
          </div>
          
          <button
            onClick={handleSubmitRequest}
            className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800"
          >
            🏡 Submit Request
          </button>
        </div>
      </div>
    </div>
  );
};

// Employees Content
const EmployeesContent: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-black mb-4">Employee Management</h2>
        <p className="text-gray-600">
          Employee data is managed through Firebase Authentication. 
          No employee details are stored in Firestore as per system requirements.
        </p>
        
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-black mb-2">Current System:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Employee authentication via Firebase Auth</li>
            <li>• No personal data stored in database</li>
            <li>• Attendance records only</li>
            <li>• Role-based access control</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Analytics Content
const AnalyticsContent: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-black mb-4">Analytics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-black">24</div>
            <div className="text-sm text-gray-600">Total Employees</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">18</div>
            <div className="text-sm text-gray-600">Present Today</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">3</div>
            <div className="text-sm text-gray-600">WFH Requests</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotionDashboard;
