import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';

interface EmployeeData {
  email: string;
  name: string;
  department: string;
  position: string;
  role: 'admin' | 'employee' | 'kiosk';
}

const employeeList: EmployeeData[] = [
  // Test accounts
  {
    email: 'employee@aintrix.com',
    name: 'Test Employee',
    department: 'IT',
    position: 'Software Developer',
    role: 'employee'
  },
  {
    email: 'admin@aintrix.com',
    name: 'Test Admin',
    department: 'IT',
    position: 'Administrator',
    role: 'admin'
  },
  {
    email: 'kiosk@aintrix.com',
    name: 'Kiosk User',
    department: 'IT',
    position: 'Kiosk',
    role: 'kiosk'
  },
  // Production employee accounts
  {
    email: 'shanmugapriyagangadurai@gmail.com',
    name: 'Shanmugapriya Gangadurai',
    department: 'IT',
    position: 'Software Developer',
    role: 'employee'
  },
  {
    email: 'eamathew2909@gmail.com',
    name: 'Mathew EA',
    department: 'IT',
    position: 'Software Developer',
    role: 'employee'
  },
  {
    email: 'Ayishasiddiqua3112@gmail.com',
    name: 'Ayisha Siddiqua',
    department: 'IT',
    position: 'Software Developer',
    role: 'employee'
  },
  {
    email: 'sannyj16@gmail.com',
    name: 'Sunny J',
    department: 'IT',
    position: 'Software Developer',
    role: 'employee'
  },
  {
    email: 'bsnabii67@gmail.com',
    name: 'Nabii BS',
    department: 'IT',
    position: 'Software Developer',
    role: 'employee'
  },
  {
    email: 'kailash.s2376@gmail.com',
    name: 'Kailash S',
    department: 'IT',
    position: 'Admin',
    role: 'admin'
  },
  {
    email: 'jeevarithik24@gmail.com',
    name: 'Jeeva Rithik',
    department: 'IT',
    position: 'Software Developer',
    role: 'employee'
  },
  {
    email: 'yousuf38152006@gmail.com',
    name: 'Yousuf',
    department: 'IT',
    position: 'Software Developer',
    role: 'employee'
  },
  {
    email: 'siddharth.ks1566@gmail.com',
    name: 'Siddharth KS',
    department: 'IT',
    position: 'Software Developer',
    role: 'employee'
  },
  {
    email: 'afiyaa1805@gmail.com',
    name: 'Afiya A',
    department: 'IT',
    position: 'Software Developer',
    role: 'employee'
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
      
      // Determine password: for test accounts use admin123, for others use email
      const password = employee.email.includes('@aintrix.com') ? 'admin123' : employee.email;
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        employee.email, 
        password
      );
      
      const user = userCredential.user;
      
      // Create employee document in Firestore
      const employeeData = {
        id: user.uid,
        name: employee.name,
        email: employee.email,
        password: password, // Store actual password used
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
      
      console.log(`✅ Created employee: ${employee.name} (${employee.email}) with password: ${password}`);
      
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
  console.log('Test accounts:');
  console.log('- employee@aintrix.com / admin123');
  console.log('- admin@aintrix.com / admin123');
  console.log('- kiosk@aintrix.com / admin123');
  console.log('Production accounts: email = password');
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
