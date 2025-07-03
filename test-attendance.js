const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, Timestamp } = require('firebase/firestore');

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

async function testAttendanceFlow() {
  try {
    console.log('🔍 Testing attendance flow...');
    
    // Test user ID (use a real one from your users collection)
    const testUserId = 'UHcZFE4bpsaXObP5iimsBVp3gCu2'; // Update this with a real user ID
    const today = '04-07-2025';
    
    console.log('Testing with user ID:', testUserId);
    console.log('Date:', today);
    
    // Check if user exists
    const userRef = doc(db, 'users', testUserId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log('❌ User not found, trying with employee1 test user...');
      
      // Try to create a test attendance record
      const attendanceRef = doc(db, 'globalAttendance', today, 'records', 'test-user-123');
      
      const testRecord = {
        userId: 'test-user-123',
        userName: 'Test User',
        userEmail: 'test@example.com',
        department: 'IT',
        date: today,
        clockIn: Timestamp.now(),
        clockOut: null,
        lunchStart: null,
        lunchEnd: null,
        breaks: [],
        hoursWorked: 0,
        isLate: false,
        lateReason: null,
        overtime: 0,
        status: 'present',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      await setDoc(attendanceRef, testRecord);
      console.log('✅ Test attendance record created successfully');
      
      // Try to read it back
      const checkDoc = await getDoc(attendanceRef);
      if (checkDoc.exists()) {
        console.log('✅ Test record verified:', checkDoc.data());
      } else {
        console.log('❌ Test record not found after creation');
      }
      
      return;
    }
    
    const userData = userDoc.data();
    console.log('✅ User found:', userData.name, userData.email);
    
    // Check if attendance record exists for today
    const attendanceRef = doc(db, 'globalAttendance', today, 'records', testUserId);
    const attendanceDoc = await getDoc(attendanceRef);
    
    if (attendanceDoc.exists()) {
      console.log('✅ Attendance record exists:', attendanceDoc.data());
    } else {
      console.log('❌ No attendance record for today');
      
      // Create a clean attendance record
      const clockInTime = new Date();
      const attendanceRecord = {
        userId: testUserId,
        userName: userData.name || 'Unknown',
        userEmail: userData.email || 'unknown@example.com',
        department: userData.department || 'Unknown',
        date: today,
        clockIn: Timestamp.fromDate(clockInTime),
        clockOut: null,
        lunchStart: null,
        lunchEnd: null,
        breaks: [],
        hoursWorked: 0,
        isLate: false,
        lateReason: null,
        overtime: 0,
        status: 'present',
        createdAt: Timestamp.fromDate(clockInTime),
        updatedAt: Timestamp.fromDate(clockInTime)
      };
      
      await setDoc(attendanceRef, attendanceRecord);
      console.log('✅ New attendance record created');
      
      // Verify creation
      const verifyDoc = await getDoc(attendanceRef);
      if (verifyDoc.exists()) {
        console.log('✅ Record verified:', verifyDoc.data());
      }
    }
    
  } catch (error) {
    console.error('❌ Error in attendance flow:', error);
  }
}

testAttendanceFlow();
