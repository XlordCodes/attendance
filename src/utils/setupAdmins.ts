import { employeeService } from '../services/employeeService';

/**
 * Setup script to create initial admin and employee users
 * Run this once to initialize your Firebase project with admin users
 */
export const setupInitialUsers = async () => {
  try {
    console.log('Setting up initial users...');
    await employeeService.createInitialAdmins();
    console.log('✅ Initial users setup completed successfully!');
    
    console.log('\n📧 Login credentials (Development mode - no password required):');
    console.log('- Admin: admin@aintrix.com');
    console.log('- Employee: john.doe@aintrix.com');
    console.log('\n🔗 Firebase project: aintrix-attendance');
    
  } catch (error) {
    console.error('❌ Error setting up initial users:', error);
    throw error;
  }
};

// Helper function to manually add a single admin
export const addAdmin = async (
  employeeId: string,
  name: string,
  email: string,
  department: string = 'Administration'
) => {
  try {
    await employeeService.createEmployee({
      employeeId,
      name,
      email,
      role: 'admin',
      department,
      isActive: true,
      password: 'temp123' // This is just for reference, actual auth uses default password
    });
    
    console.log(`✅ Admin created successfully: ${email}`);
    console.log(`   Employee ID: ${employeeId}`);
    console.log(`   Name: ${name}`);
    console.log(`   Department: ${department}`);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    throw error;
  }
};

// Helper function to manually add a single employee
export const addEmployee = async (
  employeeId: string,
  name: string,
  email: string,
  department: string
) => {
  try {
    await employeeService.createEmployee({
      employeeId,
      name,
      email,
      role: 'employee',
      department,
      isActive: true,
      password: 'temp123' // This is just for reference, actual auth uses default password
    });
    
    console.log(`✅ Employee created successfully: ${email}`);
    console.log(`   Employee ID: ${employeeId}`);
    console.log(`   Name: ${name}`);
    console.log(`   Department: ${department}`);
  } catch (error) {
    console.error('❌ Error creating employee:', error);
    throw error;
  }
};
