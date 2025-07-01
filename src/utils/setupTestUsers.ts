import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../services/firebaseConfig';

export const setupTestUsers = async () => {
  const testUsers = [
    {
      email: 'admin@aintrix.com',
      password: 'admin123',
      name: 'Test Admin',
      role: 'admin',
      department: 'Management',
      employeeId: 'ADM001'
    },
    {
      email: 'employee@aintrix.com',
      password: 'admin123',
      name: 'Test Employee',
      role: 'employee',
      department: 'Engineering',
      employeeId: 'EMP001'
    }
  ];

  try {
    for (const user of testUsers) {
      try {
        // Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          user.email,
          user.password
        );

        // Create employee document in Firestore
        await setDoc(doc(db, 'employees', userCredential.user.uid), {
          employeeId: user.employeeId,
          name: user.name,
          email: user.email,
          password: user.password,
          role: user.role,
          department: user.department,
          isActive: true,
          createdAt: new Date(),
        });

        console.log(`Created user: ${user.email} with role: ${user.role}`);
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          console.log(`User ${user.email} already exists, skipping...`);
        } else {
          console.error(`Error creating user ${user.email}:`, error);
        }
      }
    }

    console.log('Test users setup completed!');
    console.log('Login credentials:');
    console.log('Admin: admin@aintrix.com / admin123');
    console.log('Employee: employee@aintrix.com / admin123');
    
  } catch (error) {
    console.error('Error setting up test users:', error);
  }
};
