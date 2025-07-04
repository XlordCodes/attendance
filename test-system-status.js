// Test system status after fixes
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC8W3dGOxQxl-KvXIdOGPEp8YFZGW8GdSg",
  authDomain: "aintrix-attendance.firebaseapp.com",
  projectId: "aintrix-attendance",
  storageBucket: "aintrix-attendance.firebasestorage.app",
  messagingSenderId: "404717579471",
  appId: "1:404717579471:web:7c8b4a1bb2ff65c2cde8b4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testSystem() {
  console.log('🔍 Testing system status...');
  
  try {
    // Check users collection
    console.log('\n📋 Checking users collection...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`✅ Found ${usersSnapshot.size} users`);
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- User: ${data.name || data.email} (${doc.id})`);
      console.log(`  Role: ${data.role || 'Unknown'}`);
      console.log(`  Department: ${data.department || 'Unknown'}`);
    });
    
    // Check today's attendance
    console.log('\n📋 Checking today\'s attendance...');
    const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-'); // dd-mm-yyyy
    const attendanceSnapshot = await getDocs(collection(db, 'globalAttendance', today, 'records'));
    console.log(`✅ Found ${attendanceSnapshot.size} attendance records for ${today}`);
    
    attendanceSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.userName}: Clock In: ${data.clockIn ? new Date(data.clockIn.toDate()).toLocaleTimeString() : 'Not clocked in'}`);
      if (data.lunchStart) {
        console.log(`  Lunch Start: ${new Date(data.lunchStart.toDate()).toLocaleTimeString()}`);
      }
      if (data.lunchEnd) {
        console.log(`  Lunch End: ${new Date(data.lunchEnd.toDate()).toLocaleTimeString()}`);
      }
    });
    
    console.log('\n✅ System test completed successfully!');
  } catch (error) {
    console.error('❌ System test failed:', error);
  }
}

testSystem();
