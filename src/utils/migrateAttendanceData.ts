import { collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

export const migrateFromArrayToSubcollection = async () => {
  try {
    console.log('🔄 Starting migration from attendance arrays to subcollections...');
    
    const usersCollection = collection(db, 'users');
    const querySnapshot = await getDocs(usersCollection);
    
    let migratedUsers = 0;
    let totalRecordsMigrated = 0;
    
    for (const userDoc of querySnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Check if user has old attendance array
      if (userData.attendance && Array.isArray(userData.attendance) && userData.attendance.length > 0) {
        console.log(`📋 Migrating ${userData.attendance.length} records for user: ${userData.name || userData.email}`);
        
        // Migrate each attendance record to subcollection
        for (const attendanceRecord of userData.attendance) {
          try {
            // Create document in subcollection with date as ID
            const attendanceRef = doc(db, 'users', userId, 'attendance', attendanceRecord.date);
            
            // Check if record already exists in subcollection
            const existingRecord = await getDoc(attendanceRef);
            if (!existingRecord.exists()) {
              await setDoc(attendanceRef, attendanceRecord);
              totalRecordsMigrated++;
            }
          } catch (error) {
            console.error(`❌ Error migrating record for date ${attendanceRecord.date}:`, error);
          }
        }
        
        // Remove the old attendance array from user document
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
          attendance: null // Remove the old array
        });
        
        migratedUsers++;
      }
    }
    
    console.log(`🎉 Migration complete!`);
    console.log(`👥 Users migrated: ${migratedUsers}`);
    console.log(`📊 Total records migrated: ${totalRecordsMigrated}`);
    
    return { 
      success: true, 
      migratedUsers, 
      totalRecordsMigrated 
    };
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
};

export const verifyMigration = async () => {
  try {
    console.log('🔍 Verifying migration...');
    
    const usersCollection = collection(db, 'users');
    const querySnapshot = await getDocs(usersCollection);
    
    let usersWithOldData = 0;
    let usersWithNewData = 0;
    
    for (const userDoc of querySnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Check for old data
      if (userData.attendance && Array.isArray(userData.attendance) && userData.attendance.length > 0) {
        console.log(`⚠️  User ${userData.name || userData.email} still has old attendance array`);
        usersWithOldData++;
      }
      
      // Check for new data
      const attendanceCollection = collection(db, 'users', userId, 'attendance');
      const attendanceSnapshot = await getDocs(attendanceCollection);
      
      if (!attendanceSnapshot.empty) {
        console.log(`✅ User ${userData.name || userData.email} has ${attendanceSnapshot.size} records in subcollection`);
        usersWithNewData++;
      }
    }
    
    console.log(`📊 Verification Results:`);
    console.log(`👥 Users with old array data: ${usersWithOldData}`);
    console.log(`👥 Users with new subcollection data: ${usersWithNewData}`);
    
    return {
      usersWithOldData,
      usersWithNewData,
      migrationComplete: usersWithOldData === 0
    };
  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  }
};

export const cleanupOldAttendanceArrays = async () => {
  try {
    console.log('🧹 Cleaning up old attendance arrays...');
    
    const usersCollection = collection(db, 'users');
    const querySnapshot = await getDocs(usersCollection);
    
    let cleanedUsers = 0;
    
    for (const userDoc of querySnapshot.docs) {
      const userData = userDoc.data();
      
      // Remove old attendance arrays
      if (userData.attendance) {
        const userDocRef = doc(db, 'users', userDoc.id);
        await updateDoc(userDocRef, {
          attendance: null
        });
        
        console.log(`🗑️  Cleaned up user: ${userData.name || userData.email}`);
        cleanedUsers++;
      }
    }
    
    console.log(`🎉 Cleanup complete! Cleaned ${cleanedUsers} users.`);
    return { success: true, cleanedUsers };
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
};
