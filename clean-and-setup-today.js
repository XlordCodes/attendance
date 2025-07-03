import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp, deleteDoc, getDocs, collection } from 'firebase/firestore';

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

async function cleanAndCreateTodaysData() {
  try {
    console.log('🧹 Cleaning old test data and creating fresh data for today...');
    
    // Today's date in the correct format
    const today = '04-07-2025'; // July 4, 2025
    
    // Clean ALL old date collections - including the current visible ones
    const oldDates = ['07-03-2025', '06-03-2025', '04-07-2025']; // Include today to ensure clean start
    for (const oldDate of oldDates) {
      try {
        console.log(`🗑️ Cleaning old date: ${oldDate}`);
        
        // Get all records in the old date
        const recordsRef = collection(db, 'globalAttendance', oldDate, 'records');
        const recordsSnapshot = await getDocs(recordsRef);
        
        // Delete each record
        for (const recordDoc of recordsSnapshot.docs) {
          await deleteDoc(recordDoc.ref);
          console.log(`   ✅ Deleted record: ${recordDoc.id}`);
        }
        
        // Delete the date document itself
        await deleteDoc(doc(db, 'globalAttendance', oldDate));
        console.log(`   ✅ Deleted date document: ${oldDate}`);
      } catch (error) {
        console.log(`   ℹ️ Date ${oldDate} already clean or doesn't exist`);
      }
    }
    
    // Create ONLY basic test users with Firebase Auth UIDs
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
    
    // Create user documents
    for (const user of users) {
      await setDoc(doc(db, 'users', user.id), user);
      console.log(`👤 Created user: ${user.name} (${user.email})`);
    }
    
    // Create today's attendance records - but only minimal data, let the app create the rest
    console.log(`📅 Creating minimal attendance structure for today: ${today}`);
    
    // Create the date document structure but no actual attendance records yet
    // This will be created when users clock in
    await setDoc(doc(db, 'globalAttendance', today), {
      date: today,
      createdAt: Timestamp.now()
    });
    
    console.log('🎉 Database cleaned and prepared for today!');
    console.log('📊 Structure created:');
    console.log(`   - globalAttendance/${today}/ (ready for records)`);
    console.log('   - users/3eGGTImaMcgzGLJ6kgmBzOsrNfz1 (Test Employee 1)');
    console.log('   - users/jBuskEsH1tTughCoqg10diMIMk03 (Test Employee 2)');
    console.log('   - users/WrNshbNELDU8NZT2kkxQSYiki2F2 (System Administrator)');
    console.log('');
    console.log('🔐 Login with:');
    console.log('   Employee 1: employee1@test.com / password123');
    console.log('   Employee 2: employee2@test.com / password123');
    console.log('   Admin: admin@test.com / password123');
    console.log('');
    console.log('💡 Now attendance records will be created dynamically when users clock in!');
    
  } catch (error) {
    console.error('❌ Error cleaning and creating data:', error);
  }
}

cleanAndCreateTodaysData();
