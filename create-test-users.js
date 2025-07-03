import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBc-O_9NLyBEyBd92lEeTmM7apb5N7VbXc",
  authDomain: "aintrix-attendance.firebaseapp.com",
  projectId: "aintrix-attendance",
  storageBucket: "aintrix-attendance.firebasestorage.app",
  messagingSenderId: "964724840136",
  appId: "1:964724840136:web:a75cbea81e8a0852d277fd",
  measurementId: "G-HP5J9X1ZT9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTestUsers() {
  try {
    console.log('👤 Creating test users...');
    
    // Kailash user
    const kailashUser = {
      name: 'Kailash',
      email: 'kailash@aintrix.com',
      role: 'employee',
      department: 'Development',
      position: 'Developer',
      createdAt: new Date(),
      isActive: true
    };
    
    // Admin user  
    const adminUser = {
      name: 'Admin',
      email: 'admin@aintrix.com',
      role: 'admin',
      department: 'Management',
      position: 'Administrator',
      createdAt: new Date(),
      isActive: true
    };
    
    // Create user documents with specific IDs
    await setDoc(doc(db, 'users', 'test-user-kailash'), kailashUser);
    console.log('✅ Created Kailash user document');
    
    await setDoc(doc(db, 'users', 'test-user-admin'), adminUser);
    console.log('✅ Created Admin user document');
    
    console.log('🎉 Test users created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating test users:', error);
  }
}

createTestUsers();
