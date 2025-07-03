import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';

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

async function updateUserDocuments() {
  try {
    console.log('🔄 Updating Firestore user documents with Firebase Auth UIDs...');
    
    // Delete old user documents
    const oldUserIds = ['test-user-employee1', 'test-user-employee2', 'test-user-admin'];
    for (const oldId of oldUserIds) {
      try {
        await deleteDoc(doc(db, 'users', oldId));
        console.log(`🗑️ Deleted old user document: ${oldId}`);
      } catch (error) {
        console.log(`   ℹ️ Old user ${oldId} doesn't exist or already deleted`);
      }
    }

    // Create new user documents with Firebase Auth UIDs
    const users = [
      {
        id: '3eGGTImaMcgzGLJ6kgmBzOsrNfz1', // Firebase Auth UID for employee1@test.com
        name: 'Test Employee 1',
        email: 'employee1@test.com',
        role: 'employee',
        department: 'Engineering',
        position: 'Software Engineer',
        employeeId: 'EMP001',
        joinDate: '2024-01-15',
        isActive: true,
        createdAt: Timestamp.now()
      },
      {
        id: 'jBuskEsH1tTughCoqg10diMIMk03', // Firebase Auth UID for employee2@test.com
        name: 'Test Employee 2',
        email: 'employee2@test.com',
        role: 'employee',
        department: 'Marketing',
        position: 'Marketing Specialist',
        employeeId: 'EMP002',
        joinDate: '2024-02-01',
        isActive: true,
        createdAt: Timestamp.now()
      },
      {
        id: 'WrNshbNELDU8NZT2kkxQSYiki2F2', // Firebase Auth UID for admin@test.com
        name: 'System Administrator',
        email: 'admin@test.com',
        role: 'admin',
        department: 'IT',
        position: 'System Administrator',
        employeeId: 'ADM001',
        joinDate: '2023-01-01',
        isActive: true,
        createdAt: Timestamp.now()
      }
    ];
    
    // Create user documents with Firebase Auth UIDs
    for (const user of users) {
      const { id, ...userData } = user;
      await setDoc(doc(db, 'users', id), userData);
      console.log(`👤 Created user: ${userData.name} (${userData.email}) with UID: ${id}`);
    }
    
    console.log('\n🎉 User documents updated with Firebase Auth UIDs!');
    console.log('\n📊 Database structure:');
    console.log('   users/');
    console.log('   ├── 3eGGTImaMcgzGLJ6kgmBzOsrNfz1  (Test Employee 1)');
    console.log('   ├── jBuskEsH1tTughCoqg10diMIMk03  (Test Employee 2)');
    console.log('   └── WrNshbNELDU8NZT2kkxQSYiki2F2  (System Administrator)');
    console.log('\n🔐 Login credentials unchanged:');
    console.log('   Employee 1: employee1@test.com / password123');
    console.log('   Employee 2: employee2@test.com / password123');
    console.log('   Admin: admin@test.com / password123');
    console.log('\n✅ Authentication should now work properly!');
    
  } catch (error) {
    console.error('❌ Error updating user documents:', error);
  }
}

updateUserDocuments();
