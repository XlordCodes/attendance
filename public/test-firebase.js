// Simple test to check Firebase connection
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Check if we can import the Firebase config
let app, auth, db;

try {
  // Import the config - we'll use dynamic import to handle potential errors
  const firebaseConfig = {
    apiKey: "AIzaSyBGJhGt5kCZ-X4F0LH5a1FOuqf7QG0f9xg",
    authDomain: "aintrix-attendance.firebaseapp.com",
    projectId: "aintrix-attendance",
    storageBucket: "aintrix-attendance.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdefg"
  };

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  console.log('✅ Firebase initialized successfully');
  console.log('🔧 Auth instance:', auth ? 'Created' : 'Failed');
  console.log('🗄️ Firestore instance:', db ? 'Created' : 'Failed');

  // Test basic authentication
  window.testLogin = async () => {
    try {
      console.log('🔐 Testing login with test credentials...');
      const userCredential = await signInWithEmailAndPassword(auth, 'employee1@test.com', 'password123');
      console.log('✅ Login successful:', userCredential.user.email);
      return userCredential;
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      return null;
    }
  };

  window.testLoginAdmin = async () => {
    try {
      console.log('🔐 Testing admin login...');
      const userCredential = await signInWithEmailAndPassword(auth, 'admin@aintrix.com', 'admin123');
      console.log('✅ Admin login successful:', userCredential.user.email);
      return userCredential;
    } catch (error) {
      console.error('❌ Admin login failed:', error.message);
      return null;
    }
  };

} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
}

console.log('🧪 Firebase test script loaded. Try running:');
console.log('- testLogin() to test employee login');
console.log('- testLoginAdmin() to test admin login');
