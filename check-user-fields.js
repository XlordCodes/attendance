// Quick check to see what fields are in the users collection
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function checkUserFields() {
  console.log('🔍 Checking user fields in Firestore...');
  
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`User ${doc.id}:`);
      console.log('Fields:', Object.keys(data));
      console.log('Data:', data);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error checking user fields:', error);
  }
}

checkUserFields();
