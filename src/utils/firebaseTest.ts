import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

export const testFirebaseConnection = async () => {
  try {
    console.log('🔧 Testing Firebase connection...');
    
    // Test reading from users collection
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    console.log('✅ Firebase connection successful!');
    console.log(`📊 Found ${snapshot.docs.length} documents in users collection`);
    
    return {
      success: true,
      documentCount: snapshot.docs.length,
      message: 'Firebase connection successful'
    };
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    
    return {
      success: false,
      error: error,
      message: `Firebase connection failed: ${(error as Error).message}`
    };
  }
};
