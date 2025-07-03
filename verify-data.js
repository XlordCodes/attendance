// Simple test to verify current user data and attendance
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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

async function verifyCurrentData() {
  try {
    console.log('🔍 Verifying current user and attendance data...\n');
    
    const userId = 'UHcZFE4bpsaXObP5iimsBVp3gCu2'; // Current user from screenshot
    const today = '04-07-2025';
    
    // Check user data
    console.log('1️⃣ Checking user data...');
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('✅ User found:', userData.name);
      console.log('   Email:', userData.email);
      console.log('   Department:', userData.department);
      console.log('   Role:', userData.role);
    } else {
      console.log('❌ User not found');
      return;
    }
    
    // Check today's attendance
    console.log('\n2️⃣ Checking today\'s attendance...');
    const attendanceRef = doc(db, 'globalAttendance', today, 'records', userId);
    const attendanceDoc = await getDoc(attendanceRef);
    
    if (attendanceDoc.exists()) {
      const attendanceData = attendanceDoc.data();
      console.log('✅ Attendance record found');
      console.log('   Clock In:', attendanceData.clockIn?.toDate());
      console.log('   Clock Out:', attendanceData.clockOut?.toDate() || 'Still working');
      console.log('   Hours Worked:', attendanceData.hoursWorked || 0);
      console.log('   Status:', attendanceData.status);
      console.log('   Breaks:', attendanceData.breaks?.length || 0);
      
      if (attendanceData.clockIn && attendanceData.clockOut) {
        const clockIn = attendanceData.clockIn.toDate();
        const clockOut = attendanceData.clockOut.toDate();
        const actualHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        console.log('   Calculated Hours:', actualHours.toFixed(2));
      } else if (attendanceData.clockIn) {
        const clockIn = attendanceData.clockIn.toDate();
        const now = new Date();
        const currentHours = (now.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        console.log('   Current Working Hours:', currentHours.toFixed(2));
      }
    } else {
      console.log('❌ No attendance record for today');
    }
    
    console.log('\n🎉 Verification complete!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

verifyCurrentData();
