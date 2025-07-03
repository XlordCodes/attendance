import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBc-O_9NLyBEyBD92lEeTmM7apb5N7VbXc",
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

async function createUserForCurrentEmail() {
  try {
    console.log('🔐 Creating user for kailash.s27@gmail.com...');
    
    const email = 'kailash.s27@gmail.com';
    const password = 'password123';
    
    try {
      // Try to create the user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      console.log(`✅ Created Firebase Auth user: ${email} (UID: ${uid})`);
      
      // Create corresponding Firestore user document
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
      
      await signOut(auth);
      console.log('✅ Signed out after creation');
      
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('ℹ️ User already exists, trying to sign in to get UID...');
        
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const uid = userCredential.user.uid;
          
          console.log(`✅ Found existing user UID: ${uid}`);
          
          // Update Firestore user document with correct UID
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
          console.log(`✅ Updated Firestore user document: users/${uid}`);
          
          await signOut(auth);
          console.log('✅ Signed out after update');
          
        } catch (signInError) {
          console.error('❌ Failed to sign in with existing user:', signInError.message);
        }
      } else {
        console.error('❌ Error creating user:', error.message);
      }
    }
    
    console.log('\n🎉 User setup complete!');
    console.log('🔐 You can now login with:');
    console.log(`   Email: ${email}`);
    console.log('   Password: password123');
    console.log('\n✅ Refresh your browser and try logging in again!');
    
  } catch (error) {
    console.error('❌ Error in user setup:', error);
  }
}

createUserForCurrentEmail();
