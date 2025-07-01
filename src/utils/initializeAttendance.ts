import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { attendanceService } from '../services/attendanceService';

export const initializeUserAttendance = async () => {
  try {
    console.log('🔄 Checking attendance subcollections for all users...');
    
    const usersCollection = collection(db, 'users');
    const querySnapshot = await getDocs(usersCollection);
    
    let checkedCount = 0;
    
    for (const userDoc of querySnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Check if user has any attendance records in subcollection
      const attendanceHistory = await attendanceService.getAttendanceHistory(userId, 5);
      
      console.log(`✅ Checked user: ${userData.name || userData.email} - ${attendanceHistory.length} attendance records found`);
      checkedCount++;
    }
    
    console.log(`🎉 Check complete! Verified ${checkedCount} user(s).`);
    return { success: true, updatedCount: checkedCount };
  } catch (error) {
    console.error('❌ Error checking user attendance:', error);
    throw error;
  }
};

export const getUserAttendanceSample = async (userId: string) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.log('User not found');
      return null;
    }
    
    const userData = userDoc.data();
    
    // Get attendance records from subcollection
    const attendanceRecords = await attendanceService.getAttendanceHistory(userId, 10);
    
    console.log('User data:', {
      name: userData.name,
      email: userData.email,
      attendanceRecords: attendanceRecords.length,
      attendance: attendanceRecords
    });
    
    return {
      ...userData,
      attendance: attendanceRecords
    };
  } catch (error) {
    console.error('Error getting user attendance:', error);
    return null;
  }
};
