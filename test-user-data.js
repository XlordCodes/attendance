const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, getDocs, collection } = require('firebase/firestore');

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

async function testUserData() {
  try {
    console.log('🔍 Testing user data structure...');
    
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`Found ${usersSnapshot.size} users`);
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      console.log('\n📄 User Document:');
      console.log('ID:', doc.id);
      console.log('Has name field:', userData.name ? '✅' : '❌');
      console.log('Has email field:', userData.email ? '✅' : '❌');
      console.log('Has role field:', userData.role ? '✅' : '❌');
      console.log('Data:', {
        id: doc.id,
        name: userData.name,
        email: userData.email,
        role: userData.role
      });
    });
    
    // Test if we can access today's attendance
    const today = new Date().toLocaleDateString('en-GB').split('/').reverse().join('-');
    console.log('\n🗓️ Testing attendance for date:', today);
    
    const attendanceDoc = await getDoc(doc(db, 'globalAttendance', today));
    if (attendanceDoc.exists()) {
      console.log('✅ Today\'s attendance document exists');
    } else {
      console.log('❌ No attendance document for today');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testUserData();
