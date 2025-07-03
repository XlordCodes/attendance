// Simple test to check existing users in the database
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Firebase configuration (make sure this matches your config)
const firebaseConfig = {
  // Add your config here - you can get this from src/services/firebaseConfig.ts
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.checkExistingUsers = async () => {
  try {
    console.log('🔍 Checking existing users in the database...');
    
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    
    console.log(`📊 Found ${usersSnapshot.size} users in the database:`);
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      console.log(`👤 User ID: ${doc.id}`);
      console.log(`📧 Email: ${userData.email}`);
      console.log(`👨‍💼 Name: ${userData.name}`);
      console.log(`🏢 Role: ${userData.role}`);
      console.log(`---`);
    });
    
    // Check for required users
    const requiredUsers = ['admin@aintrix.com', 'kiosk@aintrix.com'];
    const existingEmails = usersSnapshot.docs.map(doc => doc.data().email);
    
    requiredUsers.forEach(email => {
      if (existingEmails.includes(email)) {
        console.log(`✅ ${email} exists in database`);
      } else {
        console.log(`❌ ${email} is missing from database`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  }
};

// Make function available globally
console.log('Run checkExistingUsers() in the console to check the database');
