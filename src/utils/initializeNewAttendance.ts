import { attendanceServiceNew } from '../services/attendanceServiceNew';
import { userService } from '../services/userService';
import { format } from 'date-fns';

/**
 * Initialize attendance documents with the new structure for testing
 */
export async function initializeNewAttendanceStructure() {
  try {
    console.log('🚀 Initializing new attendance structure...');

    // Get all users
    const users = await userService.getAllUsers();
    console.log(`Found ${users.length} users`);

    // For testing, let's create a sample attendance record for today for one user
    if (users.length > 0) {
      const testUser = users[0]; // Use the first user
      const today = format(new Date(), 'yyyy-MM-dd');

      console.log(`Creating test attendance record for user: ${testUser.name}`);

      // Check if there's already a record for today
      const existingRecord = await attendanceServiceNew.getAttendanceForDate(testUser.id, today);
      
      if (!existingRecord) {
        // Create a clock-in for testing
        console.log('Creating clock-in record...');
        await attendanceServiceNew.clockIn(testUser.id);
        console.log('✅ Test clock-in created successfully');
      } else {
        console.log('⚠️ Attendance record already exists for today');
      }

      // Display the current record
      const currentRecord = await attendanceServiceNew.getTodayAttendance(testUser.id);
      console.log('📊 Current attendance record:', currentRecord);
    }

    console.log('✅ New attendance structure initialization complete!');
    
    return {
      success: true,
      message: 'New attendance structure initialized successfully'
    };
  } catch (error) {
    console.error('❌ Error initializing new attendance structure:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Test the new attendance workflow
 */
export async function testNewAttendanceWorkflow(userId: string) {
  try {
    console.log('🧪 Testing new attendance workflow for user:', userId);

    // 1. Clock in
    console.log('1. Testing clock in...');
    const clockInResult = await attendanceServiceNew.clockIn(userId);
    console.log('Clock in result:', clockInResult);

    // 2. Start break
    console.log('2. Testing start break...');
    const startBreakResult = await attendanceServiceNew.startBreak(userId);
    console.log('Start break result:', startBreakResult);

    // Wait a moment (simulate break time)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. End break
    console.log('3. Testing end break...');
    const endBreakResult = await attendanceServiceNew.endBreak(userId);
    console.log('End break result:', endBreakResult);

    // 4. Update AFK time
    console.log('4. Testing AFK time update...');
    await attendanceServiceNew.updateAfkTime(userId, 5); // 5 minutes AFK
    console.log('AFK time updated');

    // 5. Clock out
    console.log('5. Testing clock out...');
    const clockOutResult = await attendanceServiceNew.clockOut(userId);
    console.log('Clock out result:', clockOutResult);

    // 6. Get final record
    console.log('6. Getting final attendance record...');
    const finalRecord = await attendanceServiceNew.getTodayAttendance(userId);
    console.log('Final record:', finalRecord);

    console.log('✅ Attendance workflow test completed successfully!');
    
    return {
      success: true,
      data: finalRecord,
      message: 'Attendance workflow test completed successfully'
    };
  } catch (error) {
    console.error('❌ Error testing attendance workflow:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Verify the Firestore structure matches the requirements
 */
export async function verifyAttendanceStructure() {
  try {
    console.log('🔍 Verifying attendance structure...');

    const users = await userService.getAllUsers();
    if (users.length === 0) {
      throw new Error('No users found in the system');
    }

    const testUser = users[0];
    console.log(`Checking structure for user: ${testUser.name} (${testUser.id})`);

    // Get today's attendance
    const todayRecord = await attendanceServiceNew.getTodayAttendance(testUser.id);
    
    if (todayRecord) {
      console.log('✅ Found attendance record with structure:');
      console.log('  - loginTime:', todayRecord.loginTime ? 'Present' : 'null');
      console.log('  - logoutTime:', todayRecord.logoutTime ? 'Present' : 'null');
      console.log('  - breaks:', `Array with ${todayRecord.breaks.length} items`);
      console.log('  - isLate:', todayRecord.isLate);
      console.log('  - lateReason:', todayRecord.lateReason || 'Empty');
      console.log('  - workedHours:', todayRecord.workedHours);
      console.log('  - afkTime:', todayRecord.afkTime);

      // Verify break structure
      if (todayRecord.breaks.length > 0) {
        console.log('✅ Break structure verification:');
        todayRecord.breaks.forEach((breakSession, index) => {
          console.log(`  Break ${index + 1}:`);
          console.log(`    - start: ${breakSession.start}`);
          console.log(`    - end: ${breakSession.end || 'null (ongoing)'}`);
        });
      }

      return {
        success: true,
        structure: {
          hasLoginTime: !!todayRecord.loginTime,
          hasLogoutTime: !!todayRecord.logoutTime,
          breaksCount: todayRecord.breaks.length,
          hasIsLate: typeof todayRecord.isLate === 'boolean',
          hasLateReason: typeof todayRecord.lateReason === 'string',
          hasWorkedHours: typeof todayRecord.workedHours === 'number',
          hasAfkTime: typeof todayRecord.afkTime === 'number'
        },
        message: 'Structure verification completed'
      };
    } else {
      console.log('ℹ️ No attendance record found for today');
      return {
        success: true,
        structure: null,
        message: 'No attendance record found for verification'
      };
    }
  } catch (error) {
    console.error('❌ Error verifying attendance structure:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Export all functions for use in setup scripts
export default {
  initializeNewAttendanceStructure,
  testNewAttendanceWorkflow,
  verifyAttendanceStructure
};
