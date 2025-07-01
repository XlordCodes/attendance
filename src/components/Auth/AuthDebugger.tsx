import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../services/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';

const AuthDebugger: React.FC = () => {
  const [email, setEmail] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const debugUser = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Debug: Checking user:', email);
      
      // Try to find user by email in users collection
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email.toLowerCase())
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      if (usersSnapshot.empty) {
        setResults({
          status: 'NOT_FOUND',
          message: 'User not found in Firestore users collection',
          email: email
        });
      } else {
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        setResults({
          status: 'FOUND',
          message: 'User found in Firestore',
          email: email,
          userData: userData,
          docId: userDoc.id
        });
      }
    } catch (error) {
      console.error('Debug error:', error);
      setResults({
        status: 'ERROR',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        email: email
      });
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email');
      return;
    }

    setLoading(true);
    try {
      // Try to login with default password
      const userCredential = await signInWithEmailAndPassword(auth, email, 'admin123');
      toast.success('Login successful!');
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setResults({
          status: 'LOGIN_SUCCESS',
          message: 'Login successful - User found by UID',
          email: email,
          userData: userData,
          uid: userCredential.user.uid
        });
      } else {
        setResults({
          status: 'LOGIN_SUCCESS_NO_DOC',
          message: 'Login successful but no Firestore document found by UID',
          email: email,
          uid: userCredential.user.uid
        });
      }
    } catch (error) {
      console.error('Login test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResults({
        status: 'LOGIN_FAILED',
        message: `Login failed: ${errorMessage}`,
        email: email
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Authentication Debugger</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email to debug:
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter email address"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={debugUser}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check User in DB'}
          </button>
          
          <button
            onClick={testLogin}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Login (admin123)'}
          </button>
        </div>

        {results && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Debug Results:</h3>
            <pre className="text-sm bg-white p-3 rounded border overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Quick Test Emails:</h4>
          <div className="space-y-1 text-sm text-blue-800">
            <button onClick={() => setEmail('yousuf38152006@gmail.com')} className="block hover:underline">
              yousuf38152006@gmail.com (should be admin)
            </button>
            <button onClick={() => setEmail('kailash.s2376@gmail.com')} className="block hover:underline">
              kailash.s2376@gmail.com (should be admin)
            </button>
            <button onClick={() => setEmail('employee@aintrix.com')} className="block hover:underline">
              employee@aintrix.com (should be employee)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthDebugger;
