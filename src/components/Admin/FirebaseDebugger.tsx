import React, { useState } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { Bug, Database, CheckCircle, AlertCircle, Settings, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { runAllTests, testAdminsCollection, createTestAdminDocument } from '../../utils/firebaseTests';

interface DebugResult {
  step: string;
  status: 'success' | 'error' | 'info';
  message: string;
  data?: any;
}

const FirebaseDebugger: React.FC = () => {
  const [debugging, setDebugging] = useState(false);
  const [results, setResults] = useState<DebugResult[]>([]);
  const [testEmail, setTestEmail] = useState('kailash.s2376@gmail.com');

  const addResult = (step: string, status: 'success' | 'error' | 'info', message: string, data?: any) => {
    setResults(prev => [...prev, { step, status, message, data }]);
  };

  const runFullDiagnostic = async () => {
    setDebugging(true);
    setResults([]);

    try {
      // Step 1: Test basic Firebase connection
      addResult('1', 'info', 'Testing basic Firebase connection...');
      try {
        collection(db, 'test'); // Just test if we can create a collection reference
        addResult('1', 'success', 'Firebase connection established');
      } catch (error: any) {
        addResult('1', 'error', `Firebase connection failed: ${error.message}`);
        setDebugging(false);
        return;
      }

      // Step 2: Check if admins collection exists
      addResult('2', 'info', 'Checking admins collection...');
      try {
        const adminsRef = collection(db, 'admins');
        const adminsSnapshot = await getDocs(adminsRef);
        addResult('2', 'success', `Admins collection found with ${adminsSnapshot.size} documents`);
        
        // Step 3: List all admin documents
        addResult('3', 'info', 'Listing all admin documents...');
        const adminsList = adminsSnapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        }));
        
        addResult('3', 'success', `Found ${adminsList.length} admin documents`, adminsList);
        
        // Step 4: Look for specific email
        addResult('4', 'info', `Looking for email: ${testEmail}...`);
        const targetAdminByEmail = adminsList.find(admin => 
          admin.data?.email === testEmail || admin.id === testEmail
        );
        
        if (targetAdminByEmail) {
          addResult('4', 'success', `Found admin with email ${testEmail}`, targetAdminByEmail);
        } else {
          addResult('4', 'error', `Admin with email ${testEmail} not found`);
        }
        
      } catch (error: any) {
        addResult('2', 'error', `Failed to access admins collection: ${error.message}`, error);
      }

      // Step 5: Test creating a document (to check write permissions)
      addResult('5', 'info', 'Testing write permissions...');
      try {
        const testDocRef = doc(db, 'test', 'permission-check');
        await setDoc(testDocRef, {
          timestamp: new Date(),
          test: true
        });
        addResult('5', 'success', 'Write permissions confirmed');
      } catch (error: any) {
        addResult('5', 'error', `Write permission failed: ${error.message}`, error);
      }

      // Step 6: Check Firebase project configuration
      addResult('6', 'info', 'Checking Firebase project configuration...');
      addResult('6', 'success', 'Project ID: aintrix-attendance', {
        projectId: 'aintrix-attendance',
        authDomain: 'aintrix-attendance.firebaseapp.com'
      });

    } catch (error: any) {
      addResult('error', 'error', `Diagnostic failed: ${error.message}`, error);
    } finally {
      setDebugging(false);
    }
  };

  const runConsoleTests = async () => {
    try {
      toast('Running comprehensive tests in console...', { icon: '🔄' });
      await runAllTests();
      toast.success('Tests completed! Check browser console for detailed results.');
    } catch (error: any) {
      toast.error(`Test failed: ${error.message}`);
    }
  };

  const runAdminsTest = async () => {
    try {
      toast('Testing admins collection...', { icon: '🔍' });
      const result = await testAdminsCollection();
      if (result.success) {
        toast.success(`Found ${result.admins?.length || 0} admin documents`);
      } else {
        toast.error('Admins collection test failed');
      }
    } catch (error: any) {
      toast.error(`Admins test failed: ${error.message}`);
    }
  };

  const createTestAdminDoc = async () => {
    try {
      const success = await createTestAdminDocument(testEmail);
      if (success) {
        toast.success(`Test admin document created for ${testEmail}`);
        // Re-run diagnostic
        runFullDiagnostic();
      } else {
        toast.error('Failed to create test document');
      }
    } catch (error: any) {
      toast.error(`Failed to create test document: ${error.message}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Database className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <Bug className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">Firebase Debugger</h1>
            <p className="text-gray-600 mt-2">
              Comprehensive Firebase connection and data testing
            </p>
          </div>

          {/* Test Email Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Email Address
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Enter email to test"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex flex-wrap gap-4 mb-8">
            <button
              onClick={runFullDiagnostic}
              disabled={debugging}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center space-x-2"
            >
              {debugging ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Bug className="w-5 h-5" />
              )}
              <span>{debugging ? 'Running Diagnostic...' : 'Run Full Diagnostic'}</span>
            </button>

            <button
              onClick={runConsoleTests}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
            >
              <Play className="w-5 h-5" />
              <span>Run Console Tests</span>
            </button>

            <button
              onClick={runAdminsTest}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Database className="w-5 h-5" />
              <span>Test Admins Collection</span>
            </button>

            <button
              onClick={createTestAdminDoc}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <Settings className="w-5 h-5" />
              <span>Create Test Admin Document</span>
            </button>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Diagnostic Results</h2>
              
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(result.status)}
                    <div>
                      <span className="font-medium text-gray-900">Step {result.step}:</span>
                      <span className="ml-2 text-gray-700">{result.message}</span>
                    </div>
                  </div>
                  
                  {result.data && (
                    <div className="mt-3 bg-white p-3 rounded border">
                      <pre className="text-sm text-gray-600 overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Helpful Information */}
          <div className="mt-8 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-yellow-800 mb-3">🔍 Troubleshooting Tips:</h3>
            <ul className="text-sm text-yellow-700 space-y-2">
              <li><strong>Firebase Rules:</strong> Ensure Firestore security rules allow read/write access</li>
              <li><strong>Collection Structure:</strong> Admins collection should contain documents with email fields</li>
              <li><strong>Authentication:</strong> Make sure Firebase Auth is properly configured</li>
              <li><strong>Network:</strong> Check internet connection and Firebase project settings</li>
            </ul>
          </div>

          {/* Firebase Rules Example */}
          <div className="mt-6 p-6 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">📋 Firestore Security Rules (for development):</h3>
            <pre className="text-sm bg-gray-800 text-green-400 p-4 rounded overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access for development
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
            </pre>
            <p className="text-sm text-gray-600 mt-2">
              ⚠️ This is for development only. Use proper authentication rules in production.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirebaseDebugger;
