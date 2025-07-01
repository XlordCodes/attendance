// Test script to debug authentication and user fetching
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';
import { setupAdminKioskUsers } from './setupAdminKiosk';

export const debugAuthentication = async () => {
  console.log('🔍 Starting authentication debug...');
  
  // Step 1: Ensure users are set up
  console.log('Step 1: Setting up admin and kiosk users...');
  try {
    await setupAdminKioskUsers();
    console.log('✅ Setup completed');
  } catch (error) {
    console.log('⚠️ Setup might have failed or users already exist:', error);
  }
  
  // Step 2: Check what's in the users collection
  console.log('\nStep 2: Checking users collection...');
  const usersSnapshot = await getDocs(collection(db, 'users'));
  console.log(`📊 Found ${usersSnapshot.size} users in database:`);
  
  usersSnapshot.forEach((doc) => {
    const userData = doc.data();
    console.log(`👤 ID: ${doc.id}, Email: ${userData.email}, Role: ${userData.role}`);
  });
  
  // Step 3: Test authentication for each user
  const testUsers = [
    { email: 'admin@aintrix.com', password: 'admin123', role: 'admin' },
    { email: 'kiosk@aintrix.com', password: 'admin123', role: 'kiosk' }
  ];
  
  for (const testUser of testUsers) {
    console.log(`\n🔐 Testing authentication for: ${testUser.email}`);
    
    try {
      // Step 3a: Check if user exists in Firestore
      const userQuery = query(
        collection(db, 'users'),
        where('email', '==', testUser.email)
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        console.log(`❌ User ${testUser.email} not found in Firestore`);
        continue;
      }
      
      const userDoc = userSnapshot.docs[0];
      const userData = userDoc.data();
      console.log(`✅ Found user in Firestore:`, userData);
      
      // Step 3b: Test Firebase Auth login
      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          testUser.email,
          testUser.password
        );
        console.log(`✅ Firebase Auth successful for: ${testUser.email}`);
        console.log(`Firebase UID: ${userCredential.user.uid}`);
        console.log(`Firestore Doc ID: ${userDoc.id}`);
        
        // Check if UIDs match
        if (userCredential.user.uid === userDoc.id) {
          console.log(`✅ UIDs match perfectly!`);
        } else {
          console.log(`⚠️ UID mismatch! Firebase: ${userCredential.user.uid}, Firestore: ${userDoc.id}`);
        }
        
        // Sign out for next test
        await auth.signOut();
        
      } catch (authError: any) {
        console.log(`❌ Firebase Auth failed for ${testUser.email}:`, authError.message);
      }
      
    } catch (error) {
      console.log(`❌ Error testing ${testUser.email}:`, error);
    }
  }
  
  console.log('\n🏁 Authentication debug completed!');
};

// Export for use in console
if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuthentication;
  console.log('Run debugAuth() in the console to test authentication');
}
