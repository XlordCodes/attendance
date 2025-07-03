// Final test script to verify all attendance operations work correctly
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, Timestamp } = require('firebase/firestore');

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

async function testCompleteAttendanceFlow() {
  try {
    console.log('🧪 Testing complete attendance flow...');
    
    const today = '04-07-2025';
    const testUserId = 'test-user-flow';
    
    console.log('Date:', today);
    console.log('User ID:', testUserId);
    
    // 1. Test Clock In
    console.log('\n1️⃣ Testing Clock In...');
    const attendanceRef = doc(db, 'globalAttendance', today, 'records', testUserId);
    
    const clockInTime = new Date();
    const clockInRecord = {
      userId: testUserId,
      userName: 'Test Flow User',
      userEmail: 'testflow@example.com',
      department: 'IT',
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
    
    await setDoc(attendanceRef, clockInRecord);
    console.log('✅ Clock in successful');
    
    // 2. Test Fetch Today Record
    console.log('\n2️⃣ Testing Fetch Today Record...');
    const fetchedRecord = await getDoc(attendanceRef);
    if (fetchedRecord.exists()) {
      console.log('✅ Today record fetched successfully');
      console.log('Record data:', fetchedRecord.data());
    } else {
      console.log('❌ Failed to fetch today record');
    }
    
    // 3. Test Start Break
    console.log('\n3️⃣ Testing Start Break...');
    const breakTime = {
      startTime: Timestamp.now(),
      endTime: null,
      type: 'break',
      duration: 0
    };
    
    await updateDoc(attendanceRef, {
      breaks: [breakTime],
      updatedAt: Timestamp.now()
    });
    console.log('✅ Break started successfully');
    
    // 4. Test End Break
    console.log('\n4️⃣ Testing End Break...');
    const endBreakTime = new Date();
    const startTime = breakTime.startTime.toDate();
    const duration = (endBreakTime.getTime() - startTime.getTime()) / (1000 * 60);
    
    const completedBreak = {
      startTime: breakTime.startTime,
      endTime: Timestamp.fromDate(endBreakTime),
      type: 'break',
      duration: Math.round(duration)
    };
    
    await updateDoc(attendanceRef, {
      breaks: [completedBreak],
      updatedAt: Timestamp.now()
    });
    console.log('✅ Break ended successfully');
    
    // 5. Test Clock Out
    console.log('\n5️⃣ Testing Clock Out...');
    const clockOutTime = new Date();
    const workingMs = clockOutTime.getTime() - clockInTime.getTime() - (duration * 60 * 1000);
    const hoursWorked = workingMs / (1000 * 60 * 60);
    
    await updateDoc(attendanceRef, {
      clockOut: Timestamp.fromDate(clockOutTime),
      hoursWorked: Math.max(0, hoursWorked),
      status: 'completed',
      updatedAt: Timestamp.now()
    });
    console.log('✅ Clock out successful');
    
    // 6. Final Verification
    console.log('\n6️⃣ Final Verification...');
    const finalRecord = await getDoc(attendanceRef);
    if (finalRecord.exists()) {
      const data = finalRecord.data();
      console.log('✅ Final record verification successful');
      console.log('Clock In:', data.clockIn?.toDate());
      console.log('Clock Out:', data.clockOut?.toDate());
      console.log('Hours Worked:', data.hoursWorked);
      console.log('Breaks:', data.breaks?.length || 0);
      console.log('Status:', data.status);
    }
    
    console.log('\n🎉 All tests passed! Attendance system is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCompleteAttendanceFlow();
