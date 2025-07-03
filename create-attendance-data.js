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

// Create today's attendance record for test user
async function createTestAttendanceData() {
  try {
    console.log('🚀 Creating test attendance data...');
    
    const today = '07-03-2025'; // Match the date in your screenshot
    const clockInTime = new Date('2025-03-07T09:00:00');
    const now = new Date();
    
    // Test data for Kailash
    const kailashRecord = {
      userId: 'test-user-kailash',
      userName: 'Kailash',
      userEmail: 'kailash@aintrix.com',
      clockIn: Timestamp.fromDate(clockInTime),
      clockOut: null,
      hoursWorked: 0,
      breaks: [],
      totalAfkTime: 0,
      isLate: false,
      lateReason: null,
      status: 'present',
      location: null,
      overtime: 0,
      createdAt: Timestamp.fromDate(clockInTime),
      updatedAt: Timestamp.now()
    };
    
    // Test data for Admin
    const adminRecord = {
      userId: 'test-user-admin',
      userName: 'Admin',
      userEmail: 'admin@aintrix.com',
      clockIn: Timestamp.fromDate(new Date('2025-03-07T08:30:00')),
      clockOut: null,
      hoursWorked: 0,
      breaks: [],
      totalAfkTime: 0,
      isLate: false,
      lateReason: null,
      status: 'present',
      location: null,
      overtime: 0,
      createdAt: Timestamp.fromDate(new Date('2025-03-07T08:30:00')),
      updatedAt: Timestamp.now()
    };
    
    // Create records in the exact structure: globalAttendance/{date}/records/{userName}
    await setDoc(doc(db, 'globalAttendance', today, 'records', 'Kailash'), kailashRecord);
    console.log('✅ Created Kailash attendance record');
    
    await setDoc(doc(db, 'globalAttendance', today, 'records', 'Admin'), adminRecord);
    console.log('✅ Created Admin attendance record');
    
    // Also create some historical data for yesterday
    const yesterday = '06-03-2025';
    const yesterdayKailash = {
      ...kailashRecord,
      clockIn: Timestamp.fromDate(new Date('2025-03-06T09:15:00')),
      clockOut: Timestamp.fromDate(new Date('2025-03-06T18:00:00')),
      hoursWorked: 8.75,
      isLate: true,
      lateReason: 'Traffic',
      status: 'completed',
      breaks: [
        {
          startTime: Timestamp.fromDate(new Date('2025-03-06T12:00:00')),
          endTime: Timestamp.fromDate(new Date('2025-03-06T13:00:00')),
          type: 'lunch',
          duration: 60
        }
      ],
      createdAt: Timestamp.fromDate(new Date('2025-03-06T09:15:00')),
      updatedAt: Timestamp.fromDate(new Date('2025-03-06T18:00:00'))
    };
    
    await setDoc(doc(db, 'globalAttendance', yesterday, 'records', 'Kailash'), yesterdayKailash);
    console.log('✅ Created yesterday Kailash attendance record');
    
    console.log('🎉 Test attendance data created successfully!');
    console.log('📊 Data structure:');
    console.log(`   globalAttendance/${today}/records/Kailash`);
    console.log(`   globalAttendance/${today}/records/Admin`);
    console.log(`   globalAttendance/${yesterday}/records/Kailash`);
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  }
}

// Run the function
createTestAttendanceData();
