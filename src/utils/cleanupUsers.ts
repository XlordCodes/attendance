import { collection, getDocs, doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

/**
 * Utility script to clean up existing user documents in Firestore
 * Removes password fields and ensures proper data structure
 */
export const cleanupUserDocuments = async () => {
  try {
    console.log('🧹 Starting user document cleanup...');
    
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    console.log(`📊 Found ${snapshot.docs.length} user documents to process`);
    
    const updates = [];
    
    for (const document of snapshot.docs) {
      const data = document.data();
      const docId = document.id;
      
      console.log(`🔍 Processing document ${docId}:`, data);
      
      // Check if document has password field (security issue!)
      if (data.password) {
        console.log(`🚨 Found password field in document ${docId}, removing...`);
        
        // Remove password field
        updates.push(
          updateDoc(doc(db, 'users', docId), {
            password: deleteField()
          })
        );
      }
      
      // Ensure all required fields exist with proper structure
      const updateData: any = {};
      
      if (!data.name && data.Name) {
        updateData.name = data.Name;
      }
      if (!data.role && data.Role) {
        updateData.role = data.Role.toLowerCase();
      }
      if (!data.isActive && data.isActive !== false) {
        updateData.isActive = true;
      }
      if (!data.createdAt) {
        updateData.createdAt = new Date();
      }
      
      if (Object.keys(updateData).length > 0) {
        console.log(`📝 Updating document ${docId} with:`, updateData);
        updates.push(
          updateDoc(doc(db, 'users', docId), updateData)
        );
      }
    }
    
    // Execute all updates
    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`✅ Successfully updated ${updates.length} documents`);
    } else {
      console.log('✅ No updates needed - all documents are clean');
    }
    
    // Fetch and return cleaned data
    const cleanSnapshot = await getDocs(usersRef);
    const cleanedUsers = cleanSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('🎉 Cleanup complete! Current users:', cleanedUsers);
    return cleanedUsers;
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
};

export default cleanupUserDocuments;
