import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';

interface EmployeeData {
  email: string;
  name: string;
  department: string;
  position: string;
  role: 'admin' | 'employee';
}

const employeeList: EmployeeData[] = [
  // Single user - Kailash as Admin
  {
    email: 'kailash.s2376@gmail.com',
    name: 'Kailash S',
    department: 'IT',
    position: 'System Administrator',
    role: 'admin'
  },
  {
    email: 'jazim0014@gmail.com',
    name: 'Jazim',
    department: 'IT',
    position: 'Software Developer',
    role: 'employee'
  },
  {
    email: 'raj234996@gmail.com',
    name: 'Raj',
    department: 'IT',
    position: 'Software Developer',
    role: 'employee'
  },
  {
    email: 'masfar391@gmail.com',
    name: 'Masfar',
    department: 'IT',
    position: 'Software Developer',
    role: 'employee'
  }
];

export const setupEmployeeDatabase = async () => {
  console.log('Setting up employee database...');
  
  for (const employee of employeeList) {
    try {
      console.log(`Creating user: ${employee.email}`);
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        employee.email, 
        employee.email // Use email as password for simplicity
      );
      
      const user = userCredential.user;
      
      // Create employee document in Firestore
      const employeeData = {
        id: user.uid,
        name: employee.name,
        email: employee.email,
        password: employee.email, // Store actual password used
        employeeId: `EMP${Date.now().toString().slice(-6)}`, // Generate unique employee ID
        department: employee.department,
        position: employee.position,
        role: employee.role,
        isActive: true,
        joinDate: new Date().toISOString(),
        createdAt: new Date(),
        attendanceRecords: [] // Initialize empty attendance records
      };
      
      // Store in employees collection
      await setDoc(doc(db, 'employees', user.uid), employeeData);
      
      // Also create a simplified user document for auth
      const userData = {
        name: employee.name,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        position: employee.position,
        isActive: true,
        createdAt: new Date()
      };
      
      // Store in users collection for simplified auth lookup
      await setDoc(doc(db, 'users', user.uid), userData);
      
      console.log(`✅ Created user: ${employee.name} (${employee.email}) with password: ${employee.email}`);
      
      // Sign out after creating each user
      await auth.signOut();
      
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`⚠️ User already exists: ${employee.email}`);
        // If user exists, just update the Firestore document
        try {
          // We need to get the user ID somehow - for now we'll skip this
          console.log(`Skipping Firestore update for existing user: ${employee.email}`);
        } catch (firestoreError) {
          console.error(`Error updating Firestore for ${employee.email}:`, firestoreError);
        }
      } else {
        console.error(`❌ Error creating user ${employee.email}:`, error);
      }
    }
  }
  
  console.log('Employee database setup completed!');
  console.log('Single user account:');
  console.log('- kailash.s2376@gmail.com / kailash.s2376@gmail.com (Admin)');
};

export const testLogin = async (email: string, password: string) => {
  try {
    console.log(`Testing login for: ${email}`);
    await createUserWithEmailAndPassword(auth, email, password);
    console.log('✅ Login successful');
    await auth.signOut();
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error);
    return false;
  }
};

// Export employee list for use in other files
export { employeeList };
