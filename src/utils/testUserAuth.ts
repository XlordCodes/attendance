// Test authentication with users collection
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';

export const testUserAuthentication = async () => {
  console.log('🔐 Testing User Authentication with Users Collection...');
  
  const testAccounts = [
    { email: 'admin@aintrix.com', password: 'admin123', expectedRole: 'admin' },
    { email: 'kiosk@aintrix.com', password: 'admin123', expectedRole: 'kiosk' }
  ];

  for (const account of testAccounts) {
    try {
      console.log(`\n📧 Testing login for: ${account.email}`);
      
      // Step 1: Test Firebase Auth login
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        account.email, 
        account.password
      );
      console.log(`✅ Firebase Auth successful for: ${account.email}`);
      
      // Step 2: Test Firestore user document fetch by UID
      const userDocByUid = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDocByUid.exists()) {
        const userData = userDocByUid.data();
        console.log(`✅ User document found by UID:`, userData);
        
        if (userData.role === account.expectedRole) {
          console.log(`✅ Role matches expected: ${userData.role}`);
        } else {
          console.log(`❌ Role mismatch. Expected: ${account.expectedRole}, Got: ${userData.role}`);
        }
      } else {
        console.log(`❌ No user document found by UID`);
        
        // Step 3: Fallback - Test fetch by email
        console.log(`🔍 Trying to find user by email...`);
        const usersQuery = query(
          collection(db, 'users'),
          where('email', '==', account.email)
        );
        const usersSnapshot = await getDocs(usersQuery);
        
        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          const userData = userDoc.data();
          console.log(`✅ User found by email:`, userData);
        } else {
          console.log(`❌ No user found by email either`);
        }
      }
      
      // Step 4: Test role-based query
      console.log(`🔍 Testing role-based query for ${account.expectedRole}...`);
      const roleQuery = query(
        collection(db, 'users'),
        where('email', '==', account.email),
        where('role', '==', account.expectedRole)
      );
      const roleSnapshot = await getDocs(roleQuery);
      
      if (!roleSnapshot.empty) {
        console.log(`✅ Role-based query successful`);
      } else {
        console.log(`❌ Role-based query failed`);
      }
      
      // Sign out
      await auth.signOut();
      console.log(`✅ Signed out successfully`);
      
    } catch (error: any) {
      console.log(`❌ Error testing ${account.email}:`, error.message);
    }
    
    console.log('─'.repeat(50));
  }
  
  console.log('🏁 Authentication test completed!');
};

// Test users collection structure
export const testUsersCollection = async () => {
  console.log('\n📊 Testing Users Collection Structure...');
  
  try {
    const usersRef = collection(db, 'users');
    const allUsersSnapshot = await getDocs(usersRef);
    
    console.log(`📈 Total users in collection: ${allUsersSnapshot.size}`);
    
    allUsersSnapshot.forEach((doc) => {
      const userData = doc.data();
      console.log(`👤 User: ${userData.email} | Role: ${userData.role} | Active: ${userData.isActive}`);
    });
    
  } catch (error) {
    console.error('❌ Error fetching users collection:', error);
  }
};
