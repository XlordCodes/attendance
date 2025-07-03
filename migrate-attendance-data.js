/**
 * Firestore Migration Script
 * Migrates attendance data from users/{uid}/attendance/{date} 
 * to globalAttendance/{date}/{userName}
 * 
 * Run this script once in a Node.js environment with Firebase Admin SDK
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

// Initialize Firebase Admin SDK
// Replace with your service account key path
const serviceAccount = require('./path/to/your/serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function migrateAttendanceData() {
  console.log('🚀 Starting attendance data migration...');
  
  let totalMigrated = 0;
  let errors = 0;
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`📁 Found ${usersSnapshot.size} users to process`);
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
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
          const attendanceData = attendanceDoc.data();
          
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
            
          } catch (docError) {
            console.error(`  ❌ Error migrating ${dateId} for ${userName}:`, docError.message);
            errors++;
          }
        }
        
      } catch (userError) {
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
    
  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    process.exit(1);
  }
}

// Optional: Verification function to check the migration
async function verifyMigration() {
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
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

// Optional: Cleanup function to remove old data (USE WITH CAUTION!)
async function cleanupOldData() {
  console.log('\n🧹 WARNING: This will delete all old attendance data!');
  console.log('Press Ctrl+C within 10 seconds to cancel...');
  
  // Wait 10 seconds before proceeding
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  console.log('🗑️  Starting cleanup of old attendance data...');
  
  try {
    const usersSnapshot = await db.collection('users').get();
    let deletedCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const attendanceSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('attendance')
        .get();
      
      // Delete all attendance documents for this user
      const batch = db.batch();
      attendanceSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deletedCount += attendanceSnapshot.size;
      
      console.log(`🗑️  Deleted ${attendanceSnapshot.size} records for user ${userId}`);
    }
    
    console.log(`✅ Cleanup completed. Deleted ${deletedCount} old attendance records.`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Main execution
async function main() {
  try {
    await migrateAttendanceData();
    await verifyMigration();
    
    // Uncomment the line below if you want to clean up old data after migration
    // await cleanupOldData();
    
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
  
  console.log('\n🏁 Script completed successfully!');
  process.exit(0);
}

// Run the migration
main();
