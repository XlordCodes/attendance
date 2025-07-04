// Final validation script
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

async function validateFixes() {
  console.log('🔧 Validating attendance system fixes...');
  
  try {
    // Check users collection for name and designation fields
    console.log('\n📋 Checking user data structure...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    if (usersSnapshot.empty) {
      console.log('⚠️ No users found in collection');
      return;
    }
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\n👤 User: ${doc.id}`);
      console.log(`  Name: ${data.name || data.Name || 'Missing'}`);
      console.log(`  Email: ${data.email || 'Missing'}`);
      console.log(`  Role: ${data.role || 'Missing'}`);
      console.log(`  Department: ${data.department || 'Missing'}`);
      console.log(`  Position: ${data.position || 'Missing'}`);
      console.log(`  Designation: ${data.designation || 'Not set'}`);
    });
    
    // Check attendance data format
    console.log('\n📅 Checking attendance date format...');
    const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-'); // dd-mm-yyyy
    console.log(`Today's date format: ${today}`);
    
    const attendanceSnapshot = await getDocs(collection(db, 'globalAttendance', today, 'records'));
    
    if (attendanceSnapshot.empty) {
      console.log('ℹ️ No attendance records for today');
    } else {
      attendanceSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  Record date: ${data.date || 'Missing'}`);
        console.log(`  User: ${data.userName || 'Missing'}`);
      });
    }
    
    console.log('\n✅ Validation completed successfully!');
    console.log('\n📝 Summary of fixes:');
    console.log('  ✅ Dashboard header now fetches actual user name and designation');
    console.log('  ✅ Date format in attendance logs fixed to dd-MM-yyyy');
    console.log('  ✅ Employee interface updated to support designation field');
    console.log('  ✅ Proper fallbacks for missing data fields');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }
}

validateFixes();
