import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  arrayRemove,
  Timestamp
} from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

interface MigrationStats {
  usersProcessed: number;
  recordsMigrated: number;
  errors: string[];
}

/**
 * Migration script to move attendance data from user document arrays 
 * to subcollections for better scalability
 */
export class AttendanceMigrationService {
  
  /**
   * Migrate all attendance data from arrays to subcollections
   */
  async migrateAllAttendanceData(): Promise<MigrationStats> {
    const stats: MigrationStats = {
      usersProcessed: 0,
      recordsMigrated: 0,
      errors: []
    };

    try {
      console.log('🚀 Starting attendance data migration...');
      
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      
      console.log(`📊 Found ${usersSnapshot.size} users to process`);

      for (const userDoc of usersSnapshot.docs) {
        try {
          const userId = userDoc.id;
          const userData = userDoc.data();
          
          console.log(`👤 Processing user: ${userData.email || userId}`);
          
          // Check if user has attendance array
          if (!userData.attendance || !Array.isArray(userData.attendance)) {
            console.log(`⏭️ User ${userId} has no attendance data to migrate`);
            stats.usersProcessed++;
            continue;
          }

          const attendanceRecords = userData.attendance;
          console.log(`📝 Found ${attendanceRecords.length} attendance records to migrate`);

          // Migrate each attendance record to subcollection
          for (const record of attendanceRecords) {
            try {
              await this.migrateAttendanceRecord(userId, record);
              stats.recordsMigrated++;
            } catch (recordError: any) {
              const errorMsg = `Failed to migrate record for user ${userId}, date ${record.date}: ${recordError.message}`;
              console.error(errorMsg);
              stats.errors.push(errorMsg);
            }
          }

          // After successful migration, remove the attendance array from user document
          await this.cleanupUserAttendanceArray(userId, attendanceRecords);
          
          stats.usersProcessed++;
          console.log(`✅ Completed migration for user: ${userData.email || userId}`);
          
        } catch (userError: any) {
          const errorMsg = `Failed to process user ${userDoc.id}: ${userError.message}`;
          console.error(errorMsg);
          stats.errors.push(errorMsg);
        }
      }

      console.log('🎉 Migration completed!');
      console.log(`📊 Stats: ${stats.usersProcessed} users processed, ${stats.recordsMigrated} records migrated`);
      if (stats.errors.length > 0) {
        console.log(`⚠️ ${stats.errors.length} errors occurred during migration`);
      }

      return stats;
    } catch (error: any) {
      console.error('❌ Migration failed:', error);
      stats.errors.push(`Migration failed: ${error.message}`);
      return stats;
    }
  }

  /**
   * Migrate a single attendance record to subcollection
   */
  private async migrateAttendanceRecord(userId: string, record: any): Promise<void> {
    try {
      const date = record.date;
      if (!date) {
        throw new Error('Attendance record has no date');
      }

      // Create subcollection document reference
      const attendanceDocRef = doc(db, 'users', userId, 'attendance', date);
      
      // Check if document already exists
      const existingDoc = await getDoc(attendanceDocRef);
      if (existingDoc.exists()) {
        console.log(`⏭️ Attendance record for ${date} already exists, skipping...`);
        return;
      }

      // Convert the record to proper format
      const migratedRecord = {
        userId,
        userName: record.userName || record.employeeName || 'Unknown',
        userEmail: record.userEmail || 'unknown@email.com',
        department: record.department || 'Unknown',
        date: date,
        clockIn: record.clockIn || null,
        clockOut: record.clockOut || null,
        lunchStart: record.lunchStart || null,
        lunchEnd: record.lunchEnd || null,
        breakTimes: record.breakTimes || [],
        location: record.location || null,
        earlyLogoutReason: record.earlyLogoutReason || null,
        overtime: record.overtime || 0,
        status: record.status || 'present',
        totalHours: record.totalHours || 0,
        totalBreakHours: record.totalBreakHours || 0,
        createdAt: record.createdAt || Timestamp.now(),
        updatedAt: record.updatedAt || Timestamp.now()
      };

      // Save to subcollection
      await setDoc(attendanceDocRef, migratedRecord);
      
      console.log(`✅ Migrated attendance record for date: ${date}`);
    } catch (error) {
      console.error(`❌ Failed to migrate record for date ${record.date}:`, error);
      throw error;
    }
  }

  /**
   * Remove attendance array from user document after successful migration
   */
  private async cleanupUserAttendanceArray(userId: string, attendanceRecords: any[]): Promise<void> {
    try {
      const userDocRef = doc(db, 'users', userId);
      
      // Remove each attendance record from the array
      for (const record of attendanceRecords) {
        await updateDoc(userDocRef, {
          attendance: arrayRemove(record)
        });
      }
      
      console.log(`🧹 Cleaned up attendance array for user: ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to cleanup attendance array for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Migrate attendance data for a specific user only
   */
  async migrateUserAttendanceData(userId: string): Promise<MigrationStats> {
    const stats: MigrationStats = {
      usersProcessed: 0,
      recordsMigrated: 0,
      errors: []
    };

    try {
      console.log(`🚀 Starting attendance data migration for user: ${userId}`);
      
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error(`User ${userId} not found`);
      }

      const userData = userDoc.data();
      
      if (!userData.attendance || !Array.isArray(userData.attendance)) {
        console.log(`⏭️ User ${userId} has no attendance data to migrate`);
        return stats;
      }

      const attendanceRecords = userData.attendance;
      console.log(`📝 Found ${attendanceRecords.length} attendance records to migrate`);

      // Migrate each attendance record to subcollection
      for (const record of attendanceRecords) {
        try {
          await this.migrateAttendanceRecord(userId, record);
          stats.recordsMigrated++;
        } catch (recordError: any) {
          const errorMsg = `Failed to migrate record for date ${record.date}: ${recordError.message}`;
          console.error(errorMsg);
          stats.errors.push(errorMsg);
        }
      }

      // After successful migration, remove the attendance array
      await this.cleanupUserAttendanceArray(userId, attendanceRecords);
      
      stats.usersProcessed = 1;
      console.log(`✅ Completed migration for user: ${userId}`);

      return stats;
    } catch (error: any) {
      console.error(`❌ Migration failed for user ${userId}:`, error);
      stats.errors.push(`Migration failed: ${error.message}`);
      return stats;
    }
  }

  /**
   * Verify migration by checking if subcollection data exists
   */
  async verifyMigration(userId: string): Promise<{ success: boolean; details: string }> {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        return { success: false, details: 'User not found' };
      }

      const userData = userDoc.data();
      
      // Check if attendance array still exists
      const hasAttendanceArray = userData.attendance && Array.isArray(userData.attendance) && userData.attendance.length > 0;
      
      // Check if subcollection has data
      const attendanceSubcollection = collection(db, 'users', userId, 'attendance');
      const subcollectionSnapshot = await getDocs(attendanceSubcollection);
      const hasSubcollectionData = subcollectionSnapshot.size > 0;

      if (hasSubcollectionData && !hasAttendanceArray) {
        return { 
          success: true, 
          details: `Migration successful. Found ${subcollectionSnapshot.size} records in subcollection, no array data remaining.` 
        };
      } else if (hasAttendanceArray && hasSubcollectionData) {
        return { 
          success: false, 
          details: `Migration incomplete. Both array (${userData.attendance.length} records) and subcollection (${subcollectionSnapshot.size} records) have data.` 
        };
      } else if (!hasAttendanceArray && !hasSubcollectionData) {
        return { 
          success: true, 
          details: 'No attendance data found (which is valid for new users).' 
        };
      } else {
        return { 
          success: false, 
          details: `Migration needed. Found ${userData.attendance?.length || 0} records in array, ${subcollectionSnapshot.size} in subcollection.` 
        };
      }
    } catch (error: any) {
      return { success: false, details: `Verification failed: ${error.message}` };
    }
  }
}

export const attendanceMigrationService = new AttendanceMigrationService();

// Make functions available in browser console for testing
if (typeof window !== 'undefined') {
  (window as any).migrateAllAttendanceData = () => attendanceMigrationService.migrateAllAttendanceData();
  (window as any).migrateUserAttendanceData = (userId: string) => attendanceMigrationService.migrateUserAttendanceData(userId);
  (window as any).verifyMigration = (userId: string) => attendanceMigrationService.verifyMigration(userId);
  
  console.log('🔧 Migration functions available:');
  console.log('- migrateAllAttendanceData() - Migrate all users');
  console.log('- migrateUserAttendanceData(userId) - Migrate specific user');
  console.log('- verifyMigration(userId) - Verify migration for user');
}
