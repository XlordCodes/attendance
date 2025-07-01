import React, { useState } from 'react';
import { setupAdminKioskUsers } from '../../utils/setupAdminKiosk';
import toast from 'react-hot-toast';

const DatabaseSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleSetup = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      await setupAdminKioskUsers();
      setCompleted(true);
      toast.success('Admin and Kiosk accounts setup completed successfully!');
    } catch (error) {
      console.error('Setup error:', error);
      toast.error('Error setting up admin and kiosk accounts. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Database Setup</h2>
      
      {!completed ? (
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Click the button below to set up admin and kiosk accounts:
            <br />• admin@aintrix.com / admin123
            <br />• kiosk@aintrix.com / admin123
          </p>
          
          <button
            onClick={handleSetup}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up accounts...' : 'Setup Admin & Kiosk Accounts'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-100 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">✅ Setup Completed!</h3>
            <p className="text-green-800 text-sm mb-2">
              Admin and Kiosk accounts have been created successfully.
            </p>
            <div className="text-green-700 text-xs space-y-1">
              <p>• admin@aintrix.com / admin123</p>
              <p>• kiosk@aintrix.com / admin123</p>
            </div>
          </div>
          
          <p className="text-sm text-gray-600">
            You can now login with these credentials. Employees can be added through the admin panel.
          </p>
        </div>
      )}
    </div>
  );
};

export default DatabaseSetup;
