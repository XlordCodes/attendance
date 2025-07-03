// Test script to verify clock out functionality
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc, Timestamp } = require('firebase/firestore');

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

async function testClockOut() {
  try {
    console.log('🧪 Testing Clock Out functionality...');
    
    const userId = 'UHcZFE4bpsaXObP5iimsBVp3gCu2'; // The user from the screenshot
    const today = '04-07-2025';
    
    console.log('User ID:', userId);
    console.log('Date:', today);
    
    // Get current attendance record
    const attendanceRef = doc(db, 'globalAttendance', today, 'records', userId);
    const attendanceDoc = await getDoc(attendanceRef);
    
    if (!attendanceDoc.exists()) {
      console.log('❌ No attendance record found');
      return;
    }
    
    const attendanceData = attendanceDoc.data();
    console.log('Current record:', {
      clockIn: attendanceData.clockIn?.toDate(),
      clockOut: attendanceData.clockOut?.toDate(),
      status: attendanceData.status
    });
    
    if (attendanceData.clockOut) {
      console.log('❌ Already clocked out');
      return;
    }
    
    if (!attendanceData.clockIn) {
      console.log('❌ No clock in record found');
      return;
    }
    
    // Perform clock out
    console.log('\n⏰ Performing clock out...');
    const clockOutTime = new Date();
    const clockInTime = attendanceData.clockIn.toDate();
    const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
    
    const updateData = {
      clockOut: Timestamp.fromDate(clockOutTime),
      hoursWorked: Math.round(hoursWorked * 100) / 100,
      status: 'completed',
      updatedAt: Timestamp.now()
      // Note: NOT including earlyLogoutReason since it's undefined
    };
    
    await updateDoc(attendanceRef, updateData);
    console.log('✅ Clock out successful!');
    
    // Verify the update
    const updatedDoc = await getDoc(attendanceRef);
    const updatedData = updatedDoc.data();
    console.log('\n📋 Updated record:');
    console.log('Clock In:', updatedData.clockIn?.toDate());
    console.log('Clock Out:', updatedData.clockOut?.toDate());
    console.log('Hours Worked:', updatedData.hoursWorked);
    console.log('Status:', updatedData.status);
    
    console.log('\n🎉 Clock out test completed successfully!');
    
  } catch (error) {
    console.error('❌ Clock out test failed:', error);
  }
}

testClockOut();
