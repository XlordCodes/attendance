// Quick script to verify user data and create a test attendance record
const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const { getFirestore, doc, getDoc, setDoc, collection, getDocs, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyD2PFqJj3OAU0bECzqQxGGS5s7KSV4w8XQ",
  authDomain: "attendance-2024-f00c7.firebaseapp.com",
  projectId: "attendance-2024-f00c7",
  storageBucket: "attendance-2024-f00c7.appspot.com",
  messagingSenderId: "1086537346092",
  appId: "1:1086537346092:web:c0a86ccb88f7f8f6b7c8f1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTestAttendanceRecords() {
  try {
    console.log('🔧 Creating test attendance records...');
    
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`Found ${usersSnapshot.size} users`);
    
    const today = '04-07-2025';
    console.log('Creating records for date:', today);
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      console.log(`\n👤 Processing user: ${userData.name} (${userId})`);
      
      // Check if attendance record already exists
      const attendanceRef = doc(db, 'globalAttendance', today, 'records', userId);
      const existingRecord = await getDoc(attendanceRef);
      
      if (existingRecord.exists()) {
        console.log('✅ Attendance record already exists');
        console.log('Record data:', existingRecord.data());
        continue;
      }
      
      // Create a test attendance record
      const clockInTime = new Date();
      clockInTime.setHours(9, Math.floor(Math.random() * 60), 0, 0); // Random time between 9:00-9:59
      
      const attendanceRecord = {
        userId: userId,
        userName: userData.name || 'Unknown User',
        userEmail: userData.email || '',
        department: userData.department || 'IT',
        date: today,
        clockIn: Timestamp.fromDate(clockInTime),
        clockOut: null,
        lunchStart: null,
        lunchEnd: null,
        breaks: [],
        hoursWorked: 0,
        isLate: clockInTime.getHours() > 9 || (clockInTime.getHours() === 9 && clockInTime.getMinutes() > 0),
        lateReason: null,
        overtime: 0,
        status: 'present',
        createdAt: Timestamp.fromDate(clockInTime),
        updatedAt: Timestamp.fromDate(clockInTime)
      };
      
      await setDoc(attendanceRef, attendanceRecord);
      console.log('✅ Created attendance record for', userData.name);
    }
    
    console.log('\n🎉 All test records created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating test records:', error);
  }
}

createTestAttendanceRecords();
