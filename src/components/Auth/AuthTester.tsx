import React, { useState } from 'react';
import { collection, getDocs, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../../services/firebaseConfig';
import toast from 'react-hot-toast';

const AuthTester: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, message]);
    console.log(message);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testFullFlow = async () => {
    setLoading(true);
    clearResults();
    
    try {
      addResult('🚀 Starting full authentication test...');
      
      // Step 1: Setup users (create Firestore documents for existing Firebase Auth users)
      addResult('📝 Step 1: Creating Firestore documents for existing users...');
      try {
        // Create Firestore documents for your existing Firebase Auth users
        const usersToCreate = [
          {
            uid: 'dwsnNsKvjxcFFAw1yFZgAzGM', // Replace with actual UID from console
            email: 'yousuf38152006@gmail.com',
            name: 'Yousuf',
            role: 'admin'
          },
          {
            uid: 'jDV1AQUXRZqMvHNA2S0JjWg', // Replace with actual UID from console
            email: 'kailash.s2376@gmail.com', 
            name: 'Kailash',
            role: 'employee'
          }
        ];
        
        for (const user of usersToCreate) {
          try {
            const userDoc = await doc(db, 'users', user.uid);
            const userSnap = await getDoc(userDoc);
            
            if (!userSnap.exists()) {
              await setDoc(userDoc, {
                email: user.email,
                name: user.name,
                department: user.role === 'admin' ? 'Administration' : 'Development',
                position: user.role === 'admin' ? 'System Administrator' : 'Employee',
                role: user.role,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
              });
              addResult(`✅ Created Firestore document for ${user.email}`);
            } else {
              addResult(`✅ Firestore document already exists for ${user.email}`);
            }
          } catch (error: any) {
            addResult(`❌ Error creating document for ${user.email}: ${error.message}`);
          }
        }
        
        addResult('✅ User setup completed');
      } catch (error: any) {
        addResult(`⚠️ Setup error: ${error.message}`);
      }
      
      // Step 2: Check Firestore users
      addResult('📊 Step 2: Checking users in Firestore...');
      const usersSnapshot = await getDocs(collection(db, 'users'));
      addResult(`Found ${usersSnapshot.size} users in database:`);
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        addResult(`  👤 ${userData.email} (${userData.role}) - ID: ${doc.id}`);
      });
      
      // Step 3: Test authentication
      const testUsers = [
        { email: 'yousuf38152006@gmail.com', password: 'YOUR_ACTUAL_PASSWORD', role: 'admin' },
        { email: 'kailash.s2376@gmail.com', password: 'YOUR_ACTUAL_PASSWORD', role: 'employee' }
      ];
      
      for (const testUser of testUsers) {
        addResult(`\n🔐 Step 3: Testing authentication for ${testUser.email}...`);
        
        try {
          // Check if user exists in Firestore
          const userQuery = query(
            collection(db, 'users'),
            where('email', '==', testUser.email),
            where('role', '==', testUser.role)
          );
          const userSnapshot = await getDocs(userQuery);
          
          if (userSnapshot.empty) {
            addResult(`❌ User ${testUser.email} not found in Firestore`);
            continue;
          }
          
          const userDoc = userSnapshot.docs[0];
          const userData = userDoc.data();
          addResult(`✅ Found in Firestore: ${userData.name} (${userData.role})`);
          
          // Test Firebase Auth
          const userCredential = await signInWithEmailAndPassword(
            auth,
            testUser.email,
            testUser.password
          );
          
          addResult(`✅ Firebase Auth successful for ${testUser.email}`);
          addResult(`   Firebase UID: ${userCredential.user.uid}`);
          addResult(`   Firestore ID: ${userDoc.id}`);
          
          if (userCredential.user.uid === userDoc.id) {
            addResult(`✅ Perfect! UIDs match`);
          } else {
            addResult(`⚠️ UID mismatch - this might cause issues`);
          }
          
          // Sign out for next test
          await signOut(auth);
          addResult(`👋 Signed out ${testUser.email}`);
          
        } catch (error: any) {
          addResult(`❌ Authentication failed for ${testUser.email}: ${error.message}`);
        }
      }
      
      addResult('\n🎉 Full test completed!');
      toast.success('Authentication test completed - check results');
      
    } catch (error: any) {
      addResult(`❌ Test failed: ${error.message}`);
      toast.error('Test failed - check console');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">🔍 Authentication System Tester</h1>
        
        <div className="mb-6">
          <button
            onClick={testFullFlow}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 mr-4"
          >
            {loading ? 'Testing...' : 'Run Full Authentication Test'}
          </button>
          
          <button
            onClick={clearResults}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Clear Results
          </button>
        </div>
        
        {results.length > 0 && (
          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="font-bold mb-2">Test Results:</h3>
            <div className="font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className={`
                  ${result.includes('✅') ? 'text-green-700' : ''}
                  ${result.includes('❌') ? 'text-red-700' : ''}
                  ${result.includes('⚠️') ? 'text-yellow-700' : ''}
                  ${result.includes('🚀') || result.includes('🎉') ? 'text-blue-700 font-bold' : ''}
                `}>
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthTester;
