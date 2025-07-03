import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

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
const auth = getAuth(app);

async function createFirebaseAuthUsers() {
  try {
    console.log('🔐 Creating Firebase Authentication users...');
    
    const testUsers = [
      { email: 'employee1@test.com', password: 'password123', name: 'Test Employee 1' },
      { email: 'employee2@test.com', password: 'password123', name: 'Test Employee 2' },
      { email: 'admin@test.com', password: 'password123', name: 'System Administrator' }
    ];

    for (const user of testUsers) {
      try {
        console.log(`👤 Creating Firebase Auth user for: ${user.email}`);
        const userCredential = await createUserWithEmailAndPassword(auth, user.email, user.password);
        console.log(`   ✅ Created Firebase Auth user: ${user.email} (UID: ${userCredential.user.uid})`);
        
        // Sign out after creating each user to avoid conflicts
        await signOut(auth);
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          console.log(`   ℹ️ User ${user.email} already exists in Firebase Auth`);
        } else {
          console.error(`   ❌ Error creating user ${user.email}:`, error.message);
        }
      }
    }

    console.log('\n🎉 Firebase Authentication users setup complete!');
    console.log('\n🔐 You can now login with:');
    console.log('   Employee 1: employee1@test.com / password123');
    console.log('   Employee 2: employee2@test.com / password123');
    console.log('   Admin: admin@test.com / password123');
    
  } catch (error) {
    console.error('❌ Error setting up Firebase Auth users:', error);
  }
}

createFirebaseAuthUsers();
