import React from 'react';
import { Settings, Shield, ExternalLink } from 'lucide-react';

const AdminSetup: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Setup</h1>
          <p className="text-gray-600">
            User management is now handled through Firebase Console
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Create Users</h3>
            <p className="text-sm text-blue-800 mb-3">
              To add new users to the system:
            </p>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Go to Firebase Console</li>
              <li>Navigate to Authentication → Users</li>
              <li>Add user with email and password</li>
              <li>Go to Firestore Database</li>
              <li>Create document in "users" collection</li>
              <li>Add user details (name, role, etc.)</li>
            </ol>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">User Document Structure</h3>
            <pre className="text-xs text-green-800 bg-green-100 p-2 rounded">
{`{
  "name": "User Name",
  "email": "user@example.com",
  "role": "admin" | "employee",
  "department": "IT",
  "position": "Job Title",
  "isActive": true,
  "createdAt": "timestamp"
}`}
            </pre>
          </div>

          <div className="text-center space-y-2">
            <button
              onClick={() => window.open('https://console.firebase.google.com', '_blank')}
              className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center justify-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Firebase Console</span>
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors inline-flex items-center justify-center space-x-2"
            >
              <Shield className="w-4 h-4" />
              <span>Go to Login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSetup;
