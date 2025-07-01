import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

export const debugUserData = async (email: string) => {
  try {
    console.log('🔍 Debugging user data for:', email);
    
    // Check users collection
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    console.log(`📊 Total users in collection: ${usersSnapshot.size}`);
    
    // Find user by email
    const userQuery = query(usersRef, where('email', '==', email));
    const userSnapshot = await getDocs(userQuery);
    
    if (!userSnapshot.empty) {
      const userData = userSnapshot.docs[0].data();
      console.log('✅ User found by email query:', {
        id: userSnapshot.docs[0].id,
        ...userData
      });
      return userData;
    } else {
      console.log('❌ User not found by email query');
      
      // List all users for debugging
      console.log('📋 All users in collection:');
      usersSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ID: ${doc.id}`, data);
      });
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error debugging user data:', error);
    return null;
  }
};

export const listAllUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    console.log('📋 All users in Firestore:');
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ID: ${doc.id}`, {
        name: data.name,
        email: data.email,
        role: data.role
      });
    });
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('❌ Error listing users:', error);
    return [];
  }
};
