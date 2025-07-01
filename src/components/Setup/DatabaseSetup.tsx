import React, { useState } from 'react';
import { setupEmployeeDatabase } from '../../utils/setupEmployeeDatabase';
import toast from 'react-hot-toast';

const DatabaseSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleSetup = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      await setupEmployeeDatabase();
      setCompleted(true);
      toast.success('Employee database setup completed successfully!');
    } catch (error) {
      console.error('Setup error:', error);
      toast.error('Error setting up employee database. Check console for details.');
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
            Click the button below to set up all employee accounts in the database.
            This will create accounts for all provided email addresses with password = email.
          </p>
          
          <button
            onClick={handleSetup}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up employees...' : 'Setup Employee Database'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-100 rounded-lg">
            <h3 className="font-medium text-green-900 mb-2">✅ Setup Completed!</h3>
            <p className="text-green-800 text-sm mb-2">
              All employee accounts have been created successfully.
            </p>
            <div className="text-green-800 text-sm space-y-1">
              <p><strong>Test Accounts:</strong></p>
              <p>• employee@aintrix.com / admin123</p>
              <p>• admin@aintrix.com / admin123</p>
              <p>• kiosk@aintrix.com / admin123</p>
              <br />
              <p><strong>Production Admin:</strong></p>
              <p>• kailash.s2376@gmail.com / kailash.s2376@gmail.com</p>
            </div>
          </div>
          
          <div className="p-4 bg-blue-100 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Employee Accounts Created:</h4>
            <div className="text-blue-800 text-xs space-y-1">
              <p>• shanmugapriyagangadurai@gmail.com</p>
              <p>• eamathew2909@gmail.com</p>
              <p>• Ayishasiddiqua3112@gmail.com</p>
              <p>• sannyj16@gmail.com</p>
              <p>• bsnabii67@gmail.com</p>
              <p>• jeevarithik24@gmail.com</p>
              <p>• yousuf38152006@gmail.com</p>
              <p>• siddharth.ks1566@gmail.com</p>
              <p>• afiyaa1805@gmail.com</p>
              <p>• jazim0014@gmail.com</p>
              <p>• raj234996@gmail.com</p>
              <p>• masfar391@gmail.com</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseSetup;
