import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

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

async function createUserForExistingUID() {
  try {
    console.log('🔄 Creating Firestore user document for existing Firebase Auth user...');
    
    // UID from console log: LeCzFtdpstaXvb51fmcfIUtahn2
    const uid = 'LeCzFtdpstaXvb51fmcfIUtahn2';
    const email = 'kailash.s27@gmail.com';
    
    const userData = {
      name: 'Kailash S',
      email: email,
      role: 'employee',
      department: 'Engineering',
      position: 'Software Developer',
      employeeId: 'EMP001',
      joinDate: '2024-01-15',
      isActive: true,
      createdAt: Timestamp.now()
    };
    
    await setDoc(doc(db, 'users', uid), userData);
    console.log(`✅ Created Firestore user document: users/${uid}`);
    console.log(`   Name: ${userData.name}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Role: ${userData.role}`);
    
    console.log('\n🎉 User document created successfully!');
    console.log('✅ The dashboard should now work properly!');
    console.log('🔄 Refresh your browser to see the changes.');
    
  } catch (error) {
    console.error('❌ Error creating user document:', error);
  }
}

createUserForExistingUID();
