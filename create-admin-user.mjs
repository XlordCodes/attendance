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

async function createAdminUser() {
  try {
    console.log('🔐 Creating admin user...');
    
    // Check if we need to create Firebase Auth user too
    // For now, create Firestore document that matches email-based auth
    const adminUser = {
      id: 'admin-user-001',
      employeeId: 'EMP001',
      name: 'System Administrator',
      email: 'admin@aintrix.com',
      password: 'admin123',
      role: 'admin',
      department: 'Management',
      isActive: true,
      createdAt: new Date()
    };
    
    // Create user document - the document ID should match Firebase Auth UID
    // For testing, let's use a known ID
    await setDoc(doc(db, 'users', 'admin-user-001'), adminUser);
    console.log('✅ Created admin user document');
    
    // Also create with email lookup for auth compatibility
    await setDoc(doc(db, 'users', 'admin-by-email'), {
      ...adminUser,
      id: 'admin-by-email'
    });
    console.log('✅ Created admin user with email lookup');
    
    console.log('🎉 Admin user created successfully!');
    console.log('🔐 You can now login with:');
    console.log('   Email: admin@aintrix.com');
    console.log('   Password: admin123');
    console.log('   OR Employee ID: EMP001 / password123');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

createAdminUser();
