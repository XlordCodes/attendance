import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

interface UserData {
  email: string;
  name: string;
  department: string;
  position: string;
  role: 'admin' | 'employee';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Based on your Firebase console data
const existingUsers: { uid: string; userData: Omit<UserData, 'createdAt' | 'updatedAt'> }[] = [
  {
    uid: 'dwsnNsKvjxcFFAw1yFZgAzGM...', // Replace with actual UID from Firebase console
    userData: {
      email: 'yousuf38152006@gmail.com',
      name: 'Yousuf',
      department: 'Administration',
      position: 'System Administrator',
      role: 'admin',
      isActive: true
    }
  },
  {
    uid: 'jDV1AQUXRZqMvHNA2S0JjWg...', // Replace with actual UID from Firebase console  
    userData: {
      email: 'kailash.s2376@gmail.com',
      name: 'Kailash',
      department: 'Development',
      position: 'Employee',
      role: 'employee',
      isActive: true
    }
  }
];

export const createFirestoreUsersForExistingAuth = async (): Promise<void> => {
  console.log('🚀 Creating Firestore user documents for existing Firebase Auth users...');
  
  for (const { uid, userData } of existingUsers) {
    try {
      console.log(`📝 Processing user: ${userData.email}`);
      
      // Check if user document already exists
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (userDoc.exists()) {
        console.log(`✅ User document already exists for: ${userData.email}`);
        continue;
      }
      
      // Create user document in Firestore users collection
      await setDoc(doc(db, 'users', uid), {
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`✅ Created Firestore document for: ${userData.email} with UID: ${uid}`);
      
    } catch (error: any) {
      console.error(`❌ Error creating user document for ${userData.email}:`, error.message);
      throw error;
    }
  }
  
  console.log('🎉 Firestore user documents created successfully!');
};

export const listAllUsers = async (): Promise<void> => {
  console.log('📊 Listing all users in Firestore...');
  
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`Found ${usersSnapshot.size} users in Firestore:`);
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      console.log(`👤 ID: ${doc.id}`);
      console.log(`📧 Email: ${userData.email}`);
      console.log(`👨‍💼 Name: ${userData.name}`);
      console.log(`🏢 Role: ${userData.role}`);
      console.log(`---`);
    });
  } catch (error) {
    console.error('❌ Error listing users:', error);
  }
};

// Export for use in console
if (typeof window !== 'undefined') {
  (window as any).createFirestoreUsers = createFirestoreUsersForExistingAuth;
  (window as any).listAllUsers = listAllUsers;
  console.log('Available functions:');
  console.log('- createFirestoreUsers() - Create Firestore documents for existing Firebase Auth users');
  console.log('- listAllUsers() - List all users in Firestore');
}
