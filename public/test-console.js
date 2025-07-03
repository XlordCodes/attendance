// Test script to run in browser console
// Navigate to http://localhost:5178/db-setup first, then run this in browser console

console.log("Testing login setup...");

// This will help test the setup
const testSetup = async () => {
  try {
    // Import the setup function
    const { setupAdminKioskUsers } = await import('./src/utils/setupAdminKiosk.ts');
    
    console.log('Running setup...');
    await setupAdminKioskUsers();
    console.log('Setup completed successfully!');
    
    // Test login
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    const { auth } = await import('./src/services/firebaseConfig.ts');
    
    console.log('Testing admin login...');
    const adminResult = await signInWithEmailAndPassword(auth, 'admin@aintrix.com', 'admin123');
    console.log('Admin login successful:', adminResult.user.email);
    
    await auth.signOut();
    
    console.log('Testing kiosk login...');
    const kioskResult = await signInWithEmailAndPassword(auth, 'kiosk@aintrix.com', 'admin123');
    console.log('Kiosk login successful:', kioskResult.user.email);
    
    await auth.signOut();
    
    console.log('All tests passed! ✅');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testSetup();
