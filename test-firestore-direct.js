import { collection, getDocs } from 'firebase/firestore';
import { db } from './src/services/firebaseConfig.js';

// Quick test script to check Firestore data
const testFirestoreData = async () => {
  try {
    console.log('🔍 Testing direct Firestore access...');
    
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    console.log(`📊 Found ${snapshot.docs.length} documents in users collection`);
    
    snapshot.docs.forEach(doc => {
      console.log(`📄 Document ID: ${doc.id}`);
      console.log('📋 Data:', doc.data());
      console.log('---');
    });
    
    return {
      success: true,
      count: snapshot.docs.length,
      documents: snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))
    };
  } catch (error) {
    console.error('❌ Firestore test failed:', error);
    return { success: false, error };
  }
};

export { testFirestoreData };
