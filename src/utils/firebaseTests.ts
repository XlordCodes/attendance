import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

/**
 * Manual test functions for debugging Firebase issues
 */

export const testFirebaseConnection = async () => {
  console.log('🔍 Testing Firebase connection...');
  
  try {
    // Test 1: Basic collection reference
    console.log('Test 1: Creating collection reference...');
    const testRef = collection(db, 'test');
    console.log('✅ Collection reference created successfully');
    
    // Test 2: Try to read a non-existent collection (should not throw error)
    console.log('Test 2: Testing read permissions...');
    const testSnapshot = await getDocs(testRef);
    console.log(`✅ Read test completed. Found ${testSnapshot.size} documents`);
    
    // Test 3: Try to write a test document
    console.log('Test 3: Testing write permissions...');
    const testDocRef = doc(db, 'test', 'connection-test');
    await setDoc(testDocRef, {
      timestamp: new Date(),
      test: 'Firebase connection test'
    });
    console.log('✅ Write test completed successfully');
    
    // Test 4: Try to read the document we just wrote
    console.log('Test 4: Reading back test document...');
    const testDocSnap = await getDoc(testDocRef);
    if (testDocSnap.exists()) {
      console.log('✅ Read back test completed successfully', testDocSnap.data());
    } else {
      console.log('❌ Could not read back test document');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return false;
  }
};

export const testAdminsCollection = async () => {
  console.log('🔍 Testing admins collection...');
  
  try {
    // Test 1: Check if admins collection exists and is readable
    console.log('Test 1: Reading admins collection...');
    const adminsRef = collection(db, 'admins');
    const adminsSnapshot = await getDocs(adminsRef);
    
    console.log(`✅ Admins collection accessible. Found ${adminsSnapshot.size} documents`);
    
    // Test 2: List all documents in admins collection
    console.log('Test 2: Listing all admin documents...');
    const admins = adminsSnapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));
    
    console.log('📋 Admin documents found:');
    admins.forEach((admin, index) => {
      console.log(`  ${index + 1}. ID: ${admin.id}`);
      console.log(`     Data:`, admin.data);
    });
    
    // Test 3: Look for specific email
    const targetEmail = 'kailash.s2376@gmail.com';
    console.log(`Test 3: Looking for email: ${targetEmail}...`);
    
    const targetAdmin = admins.find(admin => 
      admin.data?.email === targetEmail || admin.id === targetEmail
    );
    
    if (targetAdmin) {
      console.log(`✅ Found admin with email ${targetEmail}:`, targetAdmin);
    } else {
      console.log(`❌ Admin with email ${targetEmail} not found`);
      console.log('💡 Try creating the admin document manually:');
      console.log(`   1. Go to Firebase Console > Firestore Database`);
      console.log(`   2. Create collection: admins`);
      console.log(`   3. Add document with ID: ${targetEmail}`);
      console.log(`   4. Or add document with field: email = ${targetEmail}`);
    }
    
    return { success: true, admins, targetAdmin };
    
  } catch (error: any) {
    console.error('❌ Admins collection test failed:', error);
    
    // Check if it's a permission error
    if (error.code === 'permission-denied') {
      console.log('🔐 Permission denied. Check Firestore security rules:');
      console.log('   For development, you can use:');
      console.log('   rules_version = "2";');
      console.log('   service cloud.firestore {');
      console.log('     match /databases/{database}/documents {');
      console.log('       match /{document=**} {');
      console.log('         allow read, write: if true;');
      console.log('       }');
      console.log('     }');
      console.log('   }');
    }
    
    return { success: false, error };
  }
};

export const createTestAdminDocument = async (email: string = 'kailash.s2376@gmail.com') => {
  console.log(`🔍 Creating test admin document for: ${email}...`);
  
  try {
    // Method 1: Create document with email as ID
    const adminDocRef = doc(db, 'admins', email);
    await setDoc(adminDocRef, {
      email: email,
      name: 'Kailash S',
      department: 'Administration',
      role: 'admin',
      createdAt: new Date(),
      createdBy: 'debug-script'
    });
    
    console.log(`✅ Test admin document created successfully with ID: ${email}`);
    
    // Verify the document was created
    const verifyDoc = await getDoc(adminDocRef);
    if (verifyDoc.exists()) {
      console.log('✅ Document verification successful:', verifyDoc.data());
    } else {
      console.log('❌ Document verification failed');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to create test admin document:', error);
    return false;
  }
};

// Run all tests
export const runAllTests = async () => {
  console.log('🚀 Starting comprehensive Firebase tests...');
  console.log('================================');
  
  // Test 1: Basic Firebase connection
  const connectionTest = await testFirebaseConnection();
  console.log('================================');
  
  if (!connectionTest) {
    console.log('❌ Basic connection failed. Stopping tests.');
    return;
  }
  
  // Test 2: Admins collection
  const adminsTest = await testAdminsCollection();
  console.log('================================');
  
  if (!adminsTest.success) {
    console.log('❌ Admins collection test failed. You may need to check Firestore rules.');
    console.log('💡 Try creating the admin document manually or running createTestAdminDocument()');
  }
  
  console.log('🏁 All tests completed!');
  console.log('================================');
};
