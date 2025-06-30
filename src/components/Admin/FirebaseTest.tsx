import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';

const FirebaseTest: React.FC = () => {
  const [status, setStatus] = useState('Testing Firebase connection...');
  const [admins, setAdmins] = useState<any[]>([]);

  useEffect(() => {
    testFirebase();
  }, []);

  const testFirebase = async () => {
    try {
      console.log('Testing Firebase connection...');
      setStatus('Connecting to Firebase...');
      
      const adminsRef = collection(db, 'admins');
      const snapshot = await getDocs(adminsRef);
      
      console.log('Admins collection size:', snapshot.size);
      
      const adminsList = snapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }));
      
      setAdmins(adminsList);
      setStatus(`✅ Connected! Found ${adminsList.length} admin documents`);
      
    } catch (error: any) {
      console.error('Firebase test error:', error);
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Firebase Connection Test</h1>
          
          <div className="mb-4">
            <p className="text-lg">{status}</p>
          </div>

          <button
            onClick={testFirebase}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
          >
            Test Again
          </button>

          {admins.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-2">Admin Documents Found:</h2>
              <div className="space-y-2">
                {admins.map((admin, index) => (
                  <div key={index} className="bg-gray-100 p-3 rounded">
                    <p><strong>Document ID:</strong> {admin.id}</p>
                    <p><strong>Data:</strong> {JSON.stringify(admin.data, null, 2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Go to Firebase Console → Firestore Database</li>
              <li>Create a collection called "admins"</li>
              <li>Add documents with email addresses like "kailash.s2376@gmail.com"</li>
              <li>You can either:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>Use the email as the document ID</li>
                  <li>Or create a document with an "email" field containing the email</li>
                </ul>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirebaseTest;
