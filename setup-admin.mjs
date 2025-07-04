import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
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
const auth = getAuth(app);
const db = getFirestore(app);

async function createCompleteAdminUser() {
  try {
    console.log('🚀 Creating complete admin user...');
    
    const adminData = {
      email: 'admin@aintrix.com',
      password: 'admin123',
      employeeId: 'EMP001',
      userData: {
        employeeId: 'EMP001',
        name: 'System Administrator',
        email: 'admin@aintrix.com',
        password: 'admin123',
        role: 'admin',
        department: 'Management',
        isActive: true,
        createdAt: new Date()
      }
    };
    
    // Step 1: Create Firebase Auth user
    let userCredential;
    try {
      console.log('🔐 Creating Firebase Auth user...');
      userCredential = await createUserWithEmailAndPassword(auth, adminData.email, adminData.password);
      console.log(`✅ Firebase Auth user created with UID: ${userCredential.user.uid}`);
    } catch (authError) {
      if (authError.code === 'auth/email-already-in-use') {
        console.log('⚠️ User already exists, signing in...');
        userCredential = await signInWithEmailAndPassword(auth, adminData.email, adminData.password);
        console.log(`✅ Signed in existing user with UID: ${userCredential.user.uid}`);
      } else {
        throw authError;
      }
    }
    
    const uid = userCredential.user.uid;
    
    // Step 2: Create Firestore document with Firebase UID as document ID
    console.log('📄 Creating Firestore document...');
    const userDataWithUid = {
      ...adminData.userData,
      id: uid,
      uid: uid
    };
    
    await setDoc(doc(db, 'users', uid), userDataWithUid);
    console.log(`✅ Firestore document created at users/${uid}`);
    
    // Sign out to clean up
    await signOut(auth);
    
    console.log('\n🎉 Complete admin user created successfully!');
    console.log('🔐 Login credentials:');
    console.log(`   Email: ${adminData.email}`);
    console.log(`   Password: ${adminData.password}`);
    console.log(`   Employee ID: ${adminData.employeeId}`);
    console.log(`   Firebase UID: ${uid}`);
    console.log('\n💡 Note: Use EMAIL for login, not Employee ID');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

createCompleteAdminUser();
