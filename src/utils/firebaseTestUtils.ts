// Test script to verify Firebase integration
import { employeeService } from '../services/employeeService';
import { attendanceService } from '../services/attendanceService';
import { meetingService } from '../services/meetingService';

export const testFirebaseConnection = async () => {
  try {
    console.log('Testing Firebase connection...');
    
    // Test employee service
    console.log('Testing employee service...');
    const employees = await employeeService.getAllEmployees();
    console.log(`Found ${employees.length} employees`);
    
    // Test attendance service
    console.log('Testing attendance service...');
    const attendanceStats = await attendanceService.getAttendanceStats();
    console.log('Attendance stats:', attendanceStats);
    
    // Test meeting service
    console.log('Testing meeting service...');
    const meetings = await meetingService.getAllMeetings();
    console.log(`Found ${meetings.length} meetings`);
    
    console.log('Firebase connection test completed successfully!');
    return true;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
};

export const createTestEmployee = async () => {
  try {
    const testEmployee = {
      name: 'Test Employee',
      email: 'test@example.com',
      password: 'testpassword123',
      employeeId: 'TEST001',
      department: 'IT',
      position: 'Developer',
      role: 'employee' as const,
      isActive: true,
      joinDate: new Date().toISOString(),
    };
    
    const employee = await employeeService.createEmployee(testEmployee);
    console.log('Test employee created:', employee);
    return employee;
  } catch (error) {
    console.error('Failed to create test employee:', error);
    throw error;
  }
};

export const testAttendanceFlow = async (employeeId: string) => {
  try {
    console.log('Testing attendance flow...');
    
    // Clock in
    console.log('Testing clock in...');
    const clockInRecord = await attendanceService.clockIn(employeeId);
    console.log('Clock in successful:', clockInRecord);
    
    // Check today's attendance
    console.log('Checking today\'s attendance...');
    const todayRecord = await attendanceService.getTodayAttendance(employeeId);
    console.log('Today\'s record:', todayRecord);
    
    return true;
  } catch (error) {
    console.error('Attendance flow test failed:', error);
    throw error;
  }
};
