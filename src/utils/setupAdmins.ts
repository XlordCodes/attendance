import { employeeService } from '../services/employeeService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

/**
 * Setup script to create initial admin and employee users
 * Fetches admin emails from Firebase admins collection
 */
export const setupInitialUsers = async () => {
  try {
    console.log('Setting up initial users...');
    
    // Fetch admin emails from Firebase admins collection
    const adminsRef = collection(db, 'admins');
    const adminsSnapshot = await getDocs(adminsRef);
    
    if (adminsSnapshot.empty) {
      throw new Error('No admins found in Firebase admins collection. Please add admin emails to the admins collection first.');
    }

    let adminCount = 0;
    
    // Create admin users from Firebase admins collection
    for (const adminDoc of adminsSnapshot.docs) {
      const adminData = adminDoc.data();
      const email = adminData.email || adminDoc.id; // Use email field or document ID
      
      if (email && email.includes('@')) {
        try {
          // Check if admin already exists
          const existingAdmin = await employeeService.getEmployeeByEmail(email);
          
          if (!existingAdmin) {
            // Extract name from email (before @) or use provided name
            const name = adminData.name || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
            const employeeId = `ADMIN${String(adminCount + 1).padStart(3, '0')}`;
            
            await employeeService.createEmployee({
              employeeId,
              name,
              email,
              role: 'admin',
              department: adminData.department || 'Administration',
              isActive: true,
              password: 'admin123' // Password for reference (actual auth uses this)
            });
            
            console.log(`✅ Created admin: ${email} (${name})`);
            adminCount++;
          } else {
            console.log(`ℹ️ Admin already exists: ${email}`);
          }
        } catch (error) {
          console.error(`❌ Failed to create admin ${email}:`, error);
        }
      }
    }
    
    // Create a default employee for testing
    const defaultEmployee = {
      employeeId: 'EMP001',
      name: 'Test Employee',
      email: 'employee@aintrix.com',
      role: 'employee' as const,
      department: 'Engineering',
      isActive: true,
      password: 'admin123'
    };
    
    const existingEmployee = await employeeService.getEmployeeByEmail(defaultEmployee.email);
    if (!existingEmployee) {
      await employeeService.createEmployee(defaultEmployee);
      console.log(`✅ Created test employee: ${defaultEmployee.email}`);
    } else {
      console.log(`ℹ️ Test employee already exists: ${defaultEmployee.email}`);
    }
    
    console.log('✅ Initial users setup completed successfully!');
    console.log(`\n📧 Login credentials:`);
    console.log(`Password for all users: admin123`);
    console.log(`\n👥 Admins created: ${adminCount}`);
    console.log(`🔗 Firebase project: aintrix-attendance`);
    
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
      password: 'admin123' // Standard password for all users
    });
    
    console.log(`✅ Admin created successfully: ${email}`);
    console.log(`   Employee ID: ${employeeId}`);
    console.log(`   Name: ${name}`);
    console.log(`   Department: ${department}`);
    console.log(`   Password: admin123`);
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
      password: 'admin123' // Standard password for all users
    });
    
    console.log(`✅ Employee created successfully: ${email}`);
    console.log(`   Employee ID: ${employeeId}`);
    console.log(`   Name: ${name}`);
    console.log(`   Department: ${department}`);
    console.log(`   Password: admin123`);
  } catch (error) {
    console.error('❌ Error creating employee:', error);
    throw error;
  }
};
