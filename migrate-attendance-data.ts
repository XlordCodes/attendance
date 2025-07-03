/**
 * Firestore Migration Script (TypeScript version)
 * Migrates attendance data from users/{uid}/attendance/{date} 
 * to globalAttendance/{date}/{userName}
 */

import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import * as serviceAccount from './path/to/your/serviceAccountKey.json';

// Initialize Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccount as ServiceAccount)
});

const db: Firestore = getFirestore();

interface UserData {
  name?: string;
  displayName?: string;
  email?: string;
  [key: string]: any;
}

interface AttendanceData {
  [key: string]: any;
}

async function migrateAttendanceData(): Promise<void> {
  console.log('🚀 Starting attendance data migration...');
  
  let totalMigrated = 0;
  let errors = 0;
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`📁 Found ${usersSnapshot.size} users to process`);
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data() as UserData;
      const userName = userData.name || userData.displayName || `user_${userId}`;
      
      console.log(`👤 Processing user: ${userName} (${userId})`);
      
      try {
        // Get all attendance records for this user
        const attendanceSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('attendance')
          .get();
        
        console.log(`  📅 Found ${attendanceSnapshot.size} attendance records`);
        
        for (const attendanceDoc of attendanceSnapshot.docs) {
          const dateId = attendanceDoc.id; // e.g., "2025-07-03"
          const attendanceData = attendanceDoc.data() as AttendanceData;
          
          try {
            // Create the new document path: globalAttendance/{date}/{userName}
            const newDocRef = db
              .collection('globalAttendance')
              .doc(dateId)
              .collection('records')
              .doc(userName);
            
            // Copy all fields as-is, but add some metadata
            const migratedData = {
              ...attendanceData,
              // Add metadata for tracking
              originalUserId: userId,
              userName: userName,
              migratedAt: new Date(),
              migratedFrom: `users/${userId}/attendance/${dateId}`
            };
            
            // Write to new location
            await newDocRef.set(migratedData);
            
            console.log(`  ✅ Migrated ${dateId} for ${userName}`);
            totalMigrated++;
            
          } catch (docError: any) {
            console.error(`  ❌ Error migrating ${dateId} for ${userName}:`, docError.message);
            errors++;
          }
        }
        
      } catch (userError: any) {
        console.error(`❌ Error processing user ${userName}:`, userError.message);
        errors++;
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log(`📊 Total documents migrated: ${totalMigrated}`);
    console.log(`⚠️  Errors encountered: ${errors}`);
    
    if (errors === 0) {
      console.log('✨ Migration successful with no errors!');
    } else {
      console.log('⚠️  Some errors occurred. Please review the logs above.');
    }
    
  } catch (error: any) {
    console.error('💥 Fatal error during migration:', error);
    process.exit(1);
  }
}

async function verifyMigration(): Promise<void> {
  console.log('\n🔍 Verifying migration...');
  
  try {
    // Count documents in old structure
    const usersSnapshot = await db.collection('users').get();
    let oldStructureCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const attendanceSnapshot = await db
        .collection('users')
        .doc(userDoc.id)
        .collection('attendance')
        .get();
      oldStructureCount += attendanceSnapshot.size;
    }
    
    // Count documents in new structure
    const globalAttendanceSnapshot = await db.collection('globalAttendance').get();
    let newStructureCount = 0;
    
    for (const dateDoc of globalAttendanceSnapshot.docs) {
      const recordsSnapshot = await db
        .collection('globalAttendance')
        .doc(dateDoc.id)
        .collection('records')
        .get();
      newStructureCount += recordsSnapshot.size;
    }
    
    console.log(`📊 Old structure documents: ${oldStructureCount}`);
    console.log(`📊 New structure documents: ${newStructureCount}`);
    
    if (oldStructureCount === newStructureCount) {
      console.log('✅ Migration verification PASSED - Document counts match!');
    } else {
      console.log('⚠️  Migration verification FAILED - Document counts do not match!');
    }
    
  } catch (error: any) {
    console.error('❌ Error during verification:', error);
  }
}

async function main(): Promise<void> {
  try {
    await migrateAttendanceData();
    await verifyMigration();
    
    console.log('\n🏁 Script completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Run the migration
main();
