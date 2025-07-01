import { doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

/**
 * Initialize the attendance system with subcollection structure
 * This ensures all users have the proper structure set up
 */
export const initializeAttendanceSubcollections = async () => {
  try {
    console.log('🔄 Initializing attendance subcollection structure...');
    
    const usersCollection = collection(db, 'users');
    const querySnapshot = await getDocs(usersCollection);
    
    let initializedUsers = 0;
    
    for (const userDoc of querySnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Create a placeholder document in the attendance subcollection
      // This ensures the subcollection exists and can be queried
      const placeholderRef = doc(db, 'users', userId, 'attendance', '_placeholder');
      
      try {
        await setDoc(placeholderRef, {
          _isPlaceholder: true,
          _createdAt: new Date(),
          _note: 'This document ensures the attendance subcollection exists'
        });
        
        console.log(`✅ Initialized attendance subcollection for: ${userData.name || userData.email}`);
        initializedUsers++;
      } catch (error) {
        console.error(`❌ Failed to initialize for user ${userId}:`, error);
      }
    }
    
    console.log(`🎉 Initialization complete! Set up subcollections for ${initializedUsers} users.`);
    
    return {
      success: true,
      initializedUsers,
      message: `Attendance subcollections initialized for ${initializedUsers} users`
    };
  } catch (error) {
    console.error('❌ Error initializing attendance subcollections:', error);
    throw error;
  }
};

/**
 * Clean up placeholder documents after real attendance data exists
 */
export const cleanupPlaceholders = async () => {
  try {
    console.log('🧹 Cleaning up placeholder documents...');
    
    const usersCollection = collection(db, 'users');
    const querySnapshot = await getDocs(usersCollection);
    
    let cleanedCount = 0;
    
    for (const userDoc of querySnapshot.docs) {
      const userId = userDoc.id;
      
      // Check attendance subcollection
      const attendanceCollection = collection(db, 'users', userId, 'attendance');
      const attendanceSnapshot = await getDocs(attendanceCollection);
      
      let hasRealData = false;
      let placeholderDocId = null;
      
      attendanceSnapshot.forEach((attendanceDoc) => {
        if (attendanceDoc.id === '_placeholder') {
          placeholderDocId = attendanceDoc.id;
        } else {
          hasRealData = true;
        }
      });
      
      // If user has real attendance data and a placeholder, remove the placeholder
      if (hasRealData && placeholderDocId) {
        const placeholderRef = doc(db, 'users', userId, 'attendance', placeholderDocId);
        await deleteDoc(placeholderRef);
        console.log(`🗑️  Removed placeholder for user: ${userId}`);
        cleanedCount++;
      }
    }
    
    console.log(`🎉 Cleanup complete! Removed ${cleanedCount} placeholder documents.`);
    
    return {
      success: true,
      cleanedCount,
      message: `Cleaned up ${cleanedCount} placeholder documents`
    };
  } catch (error) {
    console.error('❌ Error cleaning up placeholders:', error);
    throw error;
  }
};

/**
 * Verify the attendance subcollection structure for all users
 */
export const verifySubcollectionStructure = async () => {
  try {
    console.log('🔍 Verifying attendance subcollection structure...');
    
    const usersCollection = collection(db, 'users');
    const querySnapshot = await getDocs(usersCollection);
    
    const results = {
      totalUsers: 0,
      usersWithSubcollections: 0,
      usersWithData: 0,
      usersWithPlaceholdersOnly: 0,
      usersWithoutSubcollections: 0
    };
    
    for (const userDoc of querySnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      results.totalUsers++;
      
      // Check attendance subcollection
      const attendanceCollection = collection(db, 'users', userId, 'attendance');
      const attendanceSnapshot = await getDocs(attendanceCollection);
      
      if (attendanceSnapshot.empty) {
        results.usersWithoutSubcollections++;
        console.log(`❌ No subcollection for: ${userData.name || userData.email}`);
      } else {
        results.usersWithSubcollections++;
        
        let hasRealData = false;
        let hasPlaceholder = false;
        
        attendanceSnapshot.forEach((attendanceDoc) => {
          if (attendanceDoc.id === '_placeholder') {
            hasPlaceholder = true;
          } else {
            hasRealData = true;
          }
        });
        
        if (hasRealData) {
          results.usersWithData++;
          console.log(`✅ User has attendance data: ${userData.name || userData.email} (${attendanceSnapshot.size} records)`);
        } else if (hasPlaceholder) {
          results.usersWithPlaceholdersOnly++;
          console.log(`🔲 User has placeholder only: ${userData.name || userData.email}`);
        }
      }
    }
    
    console.log('📊 Structure Verification Results:');
    console.log(`👥 Total Users: ${results.totalUsers}`);
    console.log(`📁 Users with Subcollections: ${results.usersWithSubcollections}`);
    console.log(`📊 Users with Real Data: ${results.usersWithData}`);
    console.log(`🔲 Users with Placeholders Only: ${results.usersWithPlaceholdersOnly}`);
    console.log(`❌ Users without Subcollections: ${results.usersWithoutSubcollections}`);
    
    return results;
  } catch (error) {
    console.error('❌ Error verifying structure:', error);
    throw error;
  }
};
