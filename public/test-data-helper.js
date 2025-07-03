// Browser console helper for creating test attendance data
// Run this in the browser console when the app is loaded

const createTestAttendanceData = () => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  
  console.log('🎯 Test Data Helper for Attendance System');
  console.log('=========================================');
  console.log(`Date: ${dateStr}`);
  console.log('');
  
  // Sample attendance record structure for the new globalAttendance collection
  const sampleRecord = {
    userId: 'user-123',
    userName: 'Test Employee 1',
    userEmail: 'employee1@test.com',
    department: 'Development',
    date: dateStr,
    clockIn: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30, 0),
    clockOut: null,
    lunchStart: null,
    lunchEnd: null,
    breaks: [
      {
        id: 'break-1',
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 15, 0),
        reason: 'Coffee break',
        type: 'break',
        duration: 15
      }
    ],
    lateReason: 'Traffic',
    isLate: true,
    overtime: 0,
    status: 'late',
    totalHours: 0,
    hoursWorked: 0,
    totalBreakHours: 0.25,
    totalAfkTime: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  console.log('📋 Sample Attendance Record Structure:');
  console.log(JSON.stringify(sampleRecord, null, 2));
  console.log('');
  
  console.log('🔧 To create this data manually in Firestore:');
  console.log(`1. Go to Firebase Console > Firestore Database`);
  console.log(`2. Create collection: 'globalAttendance'`);
  console.log(`3. Create document: '${dateStr}'`);
  console.log(`4. Create subcollection: 'records'`);
  console.log(`5. Create document: 'Test Employee 1'`);
  console.log(`6. Add the above data as fields`);
  console.log('');
  
  console.log('📧 Test Login Credentials:');
  console.log('Employee 1: employee1@test.com / password123');
  console.log('Employee 2: employee2@test.com / password123');
  console.log('Admin: admin@test.com / password123');
  console.log('');
  
  console.log('⚡ To use the Clock In/Out functionality:');
  console.log('1. Log in with employee credentials');
  console.log('2. Use the Clock In button (will show late arrival modal after 9 AM)');
  console.log('3. Provide reason for late arrival');
  console.log('4. Data will be saved to globalAttendance collection');
  
  return sampleRecord;
};

// Run the helper
createTestAttendanceData();
