// Quick test script to verify authentication
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';

export const testLogin = async () => {
  console.log('Testing login functionality...');
  
  const testAccounts = [
    { email: 'admin@aintrix.com', password: 'admin123', expectedRole: 'admin' },
    { email: 'employee@aintrix.com', password: 'admin123', expectedRole: 'employee' }
  ];
  
  for (const account of testAccounts) {
    try {
      console.log(`Testing ${account.email}...`);
      
      // Try to sign in
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        account.email, 
        account.password
      );
      
      console.log(`✅ Login successful for ${account.email}`);
      
      // Get user data from Firestore
      const employeeDoc = await getDoc(doc(db, 'employees', userCredential.user.uid));
      
      if (employeeDoc.exists()) {
        const employeeData = employeeDoc.data();
        console.log(`✅ Employee data found:`, employeeData);
        
        if (employeeData.role === account.expectedRole) {
          console.log(`✅ Role matches: ${employeeData.role}`);
        } else {
          console.log(`❌ Role mismatch. Expected: ${account.expectedRole}, Got: ${employeeData.role}`);
        }
      } else {
        console.log(`❌ No employee document found for ${account.email}`);
      }
      
      // Sign out
      await auth.signOut();
      console.log(`✅ Signed out ${account.email}`);
      
    } catch (error: any) {
      console.log(`❌ Login failed for ${account.email}:`, error.message);
    }
    
    console.log('---');
  }
  
  console.log('Login test complete!');
};
