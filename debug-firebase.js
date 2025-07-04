// Debug script to test Firebase operations
import { userService } from './src/services/userService.js';
import { testFirebaseConnection } from './src/utils/firebaseTest.js';

const debugEmployeeOperations = async () => {
  console.log('🔧 Starting Firebase debug session...');
  
  try {
    // Test 1: Firebase Connection
    console.log('\n📡 Testing Firebase connection...');
    const connectionResult = await testFirebaseConnection();
    console.log('Connection result:', connectionResult);
    
    if (!connectionResult.success) {
      console.error('❌ Firebase connection failed, stopping tests');
      return;
    }
    
    // Test 2: Get All Employees
    console.log('\n👥 Testing getAllEmployees...');
    const employees = await userService.getAllEmployees();
    console.log(`✅ Found ${employees.length} employees:`, employees);
    
    // Test 3: Create Test Employee (only if no employees exist)
    if (employees.length === 0) {
      console.log('\n➕ Creating test employee...');
      const testEmployee = {
        name: 'Test Employee',
        email: 'test@example.com',
        department: 'IT',
        position: 'Developer',
        role: 'employee' as const,
        employeeId: 'TEST001',
        isActive: true,
        joinDate: new Date().toISOString(),
      };
      
      try {
        const newEmployee = await userService.createUser(testEmployee);
        console.log('✅ Test employee created:', newEmployee);
      } catch (createError) {
        console.error('❌ Failed to create test employee:', createError);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug session failed:', error);
  }
};

// Run the debug session
debugEmployeeOperations();
