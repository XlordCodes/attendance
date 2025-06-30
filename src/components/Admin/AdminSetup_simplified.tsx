import React, { useState, useEffect } from 'react';
import { Shield, Database, CheckCircle, AlertCircle, RefreshCw, Search } from 'lucide-react';
import { setupInitialUsers, checkAdminEmail } from '../../utils/setupAdmins';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import toast from 'react-hot-toast';

const AdminSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [adminsData, setAdminsData] = useState<any[]>([]);
  const [checkingFirebase, setCheckingFirebase] = useState(false);
  const [testEmail, setTestEmail] = useState('kailash.s2376@gmail.com');

  const checkFirebaseAdmins = async () => {
    setCheckingFirebase(true);
    try {
      console.log('Checking Firebase admins collection...');
      const adminsRef = collection(db, 'admins');
      const adminsSnapshot = await getDocs(adminsRef);
      
      console.log(`Found ${adminsSnapshot.size} documents in admins collection`);
      
      const adminsList = adminsSnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }));
      
      setAdminsData(adminsList);
      
      if (adminsList.length === 0) {
        toast.error('No admins found in Firebase admins collection');
      } else {
        toast.success(`Found ${adminsList.length} admin document(s) in Firebase`);
      }
    } catch (error: any) {
      console.error('Error checking Firebase:', error);
      toast.error(`Firebase error: ${error.message}`);
    } finally {
      setCheckingFirebase(false);
    }
  };

  useEffect(() => {
    // Check Firebase connection on component mount
    checkFirebaseAdmins();
  }, []);

  const handleSetupInitialUsers = async () => {
    setLoading(true);
    try {
      console.log('Starting admin check...');
      const result = await setupInitialUsers();
      setSetupComplete(true);
      toast.success(result.message || 'Admin check completed successfully!');
      
      // Refresh the admin data
      checkFirebaseAdmins();
    } catch (error: any) {
      console.error('Setup error:', error);
      toast.error(error.message || 'Failed to check admins');
      
      // If no admins collection found, provide helpful message
      if (error.message.includes('No admins found')) {
        toast.error('Please add admin emails to the "admins" collection in Firebase Firestore first', {
          duration: 6000
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const testSpecificEmail = async () => {
    if (!testEmail.trim()) {
      toast.error('Please enter an email to test');
      return;
    }
    
    setLoading(true);
    try {
      const result = await checkAdminEmail(testEmail.trim());
      if (result.found) {
        toast.success(`✅ Admin email ${testEmail} found in Firebase!`);
      } else {
        toast.error(`❌ Admin email ${testEmail} not found in Firebase`);
      }
    } catch (error: any) {
      toast.error(`Error checking email: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Setup</h1>
            <p className="text-gray-600 mt-2">
              Check your Firebase admins collection and test email login
            </p>
          </div>

          {/* Firebase Connection Check */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-4 flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Firebase Connection Check
            </h2>
            
            <div className="mb-4">
              <button
                onClick={checkFirebaseAdmins}
                disabled={checkingFirebase}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2 mr-4"
              >
                {checkingFirebase ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                <span>{checkingFirebase ? 'Checking...' : 'Check Firebase Admins'}</span>
              </button>
              
              <a 
                href="/debug" 
                className="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-decoration-none"
              >
                🔍 Advanced Debugger
              </a>
            </div>

            {adminsData.length > 0 && (
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Found in Firebase admins collection:</h3>
                <div className="space-y-2">
                  {adminsData.map((admin, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex-1">
                        <span className="font-medium">ID: {admin.id}</span>
                        {admin.data.email && (
                          <span className="ml-2 text-gray-600">| Email: {admin.data.email}</span>
                        )}
                        {admin.data.name && (
                          <span className="ml-2 text-gray-600">| Name: {admin.data.name}</span>
                        )}
                        {admin.data.department && (
                          <span className="ml-2 text-gray-600">| Dept: {admin.data.department}</span>
                        )}
                      </div>
                      {admin.id === 'kailash.s2376@gmail.com' || admin.data.email === 'kailash.s2376@gmail.com' ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">✓ Target Email</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminsData.length === 0 && !checkingFirebase && (
              <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                  <span className="text-yellow-800">
                    No admin documents found in Firebase. Please add admin emails to the "admins" collection first.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Test Specific Email */}
          <div className="bg-green-50 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-green-900 mb-4 flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Test Specific Email
            </h2>
            
            <div className="flex space-x-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email to Test
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Enter email to test"
                />
              </div>
              <button
                onClick={testSpecificEmail}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center space-x-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                <span>{loading ? 'Testing...' : 'Test Email'}</span>
              </button>
            </div>
          </div>

          {/* Setup Initial Users */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-4 flex items-center">
              <RefreshCw className="w-5 h-5 mr-2" />
              Admin Check
            </h2>
            <p className="text-blue-800 mb-4">
              This will scan your Firebase admins collection and verify all admin emails.
            </p>
            
            {setupComplete ? (
              <div className="flex items-center text-green-700">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span>Admin check completed successfully!</span>
              </div>
            ) : (
              <button
                onClick={handleSetupInitialUsers}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
                <span>{loading ? 'Checking...' : 'Run Admin Check'}</span>
              </button>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">📋 Simplified Login Instructions:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>1. <strong>First:</strong> Add admin emails to the <code className="bg-yellow-200 px-1 rounded">admins</code> collection in Firebase Firestore</li>
              <li>2. Use the document ID as the email address (e.g., document ID: kailash.s2376@gmail.com)</li>
              <li>3. <strong>Login:</strong> Just enter your email address - no password required!</li>
              <li>4. The system automatically checks if your email exists in the admins collection</li>
              <li>5. <strong>Example:</strong> Create document with ID <code className="bg-yellow-200 px-1 rounded">kailash.s2376@gmail.com</code> in admins collection</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSetup;
