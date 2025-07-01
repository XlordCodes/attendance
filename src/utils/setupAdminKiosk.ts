import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';

interface UserData {
  email: string;
  name: string;
  department: string;
  position: string;
  role: 'admin' | 'kiosk';
}

const adminKioskUsers: UserData[] = [
  {
    email: 'admin@aintrix.com',
    name: 'Admin User',
    department: 'Administration',
    position: 'System Administrator',
    role: 'admin'
  },
  {
    email: 'kiosk@aintrix.com',
    name: 'Kiosk User',
    department: 'Operations',
    position: 'Kiosk Terminal',
    role: 'kiosk'
  }
];

export const setupAdminKioskUsers = async (): Promise<void> => {
  console.log('🚀 Setting up admin and kiosk users in users collection...');
  
  for (const userData of adminKioskUsers) {
    try {
      console.log(`📝 Creating user: ${userData.email}`);
      
      // Create user with email and password (admin123)
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        'admin123'
      );
      
      const user = userCredential.user;
      console.log(`✅ Firebase Auth user created: ${userData.email} with UID: ${user.uid}`);
      
      // Create user document in Firestore users collection using the Firebase Auth UID
      await setDoc(doc(db, 'users', user.uid), {
        email: userData.email,
        name: userData.name,
        department: userData.department,
        position: userData.position,
        role: userData.role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`✅ Firestore document created for: ${userData.email} with ID: ${user.uid}`);
      
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`⚠️ User ${userData.email} already exists in Firebase Auth, skipping...`);
        continue;
      }
      console.error(`❌ Error creating user ${userData.email}:`, error.message);
      throw error; // Re-throw to stop setup if there's a real error
    }
  }
  
  console.log('🎉 Admin and kiosk setup completed successfully!');
};
