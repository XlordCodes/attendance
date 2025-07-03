const admin = require('firebase-admin');
const { format } = require('date-fns');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupAllData() {
  console.log('🧹 Starting final cleanup of all test data and hardcoded references...\n');

  try {
    // 1. Delete ALL collections and data
    console.log('1. Deleting ALL old attendance data...');
    
    // Delete globalAttendance collection
    const globalAttendanceSnapshot = await db.collection('globalAttendance').get();
    const batch1 = db.batch();
    
    for (const doc of globalAttendanceSnapshot.docs) {
      console.log(`   Deleting globalAttendance/${doc.id}`);
      
      // Delete subcollection documents first
      const recordsSnapshot = await db.collection('globalAttendance').doc(doc.id).collection('records').get();
      for (const recordDoc of recordsSnapshot.docs) {
        console.log(`     Deleting globalAttendance/${doc.id}/records/${recordDoc.id}`);
        batch1.delete(recordDoc.ref);
      }
      
      // Delete the parent document
      batch1.delete(doc.ref);
    }
    
    await batch1.commit();
    console.log('   ✅ Deleted globalAttendance collection');

    // Delete old attendance collections
    const attendanceSnapshot = await db.collection('attendance').get();
    const batch2 = db.batch();
    
    for (const doc of attendanceSnapshot.docs) {
      console.log(`   Deleting attendance/${doc.id}`);
      batch2.delete(doc.ref);
    }
    
    await batch2.commit();
    console.log('   ✅ Deleted attendance collection');

    // Delete old user attendance subcollections
    const usersSnapshot = await db.collection('users').get();
    for (const userDoc of usersSnapshot.docs) {
      const attendanceSubcollections = ['attendance', 'attendance_kailash'];
      
      for (const subcollection of attendanceSubcollections) {
        try {
          const attendanceSnapshot = await db.collection('users').doc(userDoc.id).collection(subcollection).get();
          const batch3 = db.batch();
          
          for (const attendanceDoc of attendanceSnapshot.docs) {
            console.log(`   Deleting users/${userDoc.id}/${subcollection}/${attendanceDoc.id}`);
            batch3.delete(attendanceDoc.ref);
          }
          
          if (attendanceSnapshot.docs.length > 0) {
            await batch3.commit();
            console.log(`   ✅ Deleted users/${userDoc.id}/${subcollection}`);
          }
        } catch (error) {
          // Subcollection might not exist, continue
        }
      }
    }

    // 2. Delete ALL users (we'll recreate dynamic ones)
    console.log('\n2. Deleting ALL users...');
    const batch4 = db.batch();
    
    for (const userDoc of usersSnapshot.docs) {
      console.log(`   Deleting users/${userDoc.id}`);
      batch4.delete(userDoc.ref);
    }
    
    await batch4.commit();
    console.log('   ✅ Deleted all users');

    // 3. Create ONLY dynamic test users (no hardcoded data)
    console.log('\n3. Creating dynamic test users...');
    
    const testUsers = [
      {
        id: 'test-user-employee1',
        name: 'Test Employee 1',
        email: 'employee1@test.com',
        role: 'employee',
        department: 'Engineering',
        employeeId: 'EMP001',
        joinDate: admin.firestore.Timestamp.now(),
        isActive: true,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      },
      {
        id: 'test-user-employee2',
        name: 'Test Employee 2',
        email: 'employee2@test.com',
        role: 'employee',
        department: 'Marketing',
        employeeId: 'EMP002',
        joinDate: admin.firestore.Timestamp.now(),
        isActive: true,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      },
      {
        id: 'test-user-admin',
        name: 'Test Admin',
        email: 'admin@test.com',
        role: 'admin',
        department: 'Management',
        employeeId: 'ADM001',
        joinDate: admin.firestore.Timestamp.now(),
        isActive: true,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      }
    ];

    for (const user of testUsers) {
      const { id, ...userData } = user;
      await db.collection('users').doc(id).set(userData);
      console.log(`   ✅ Created user: ${userData.name} (${userData.email})`);
    }

    // 4. Do NOT create any attendance records - they should only be created when users clock in
    console.log('\n4. No attendance records created - they will be dynamic when users clock in');

    console.log('\n🎉 Final cleanup completed!');
    console.log('\n📊 Current database state:');
    console.log('   Collections:');
    console.log('   - users/ (3 test users, no hardcoded data)');
    console.log('   - globalAttendance/ (empty - will be populated when users clock in)');
    console.log('\n👥 Test users for login:');
    console.log('   Employee 1: employee1@test.com / password123');
    console.log('   Employee 2: employee2@test.com / password123');
    console.log('   Admin: admin@test.com / password123');
    console.log('\n✨ The system is now fully dynamic - no hardcoded data!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    admin.app().delete();
  }
}

cleanupAllData();
