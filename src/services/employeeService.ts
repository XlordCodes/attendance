import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth } from './firebaseConfig';
import { Employee } from '../types';
import QRCode from 'qrcode';

class EmployeeService {
  async createEmployee(employeeData: Omit<Employee, 'id' | 'createdAt' | 'qrCode'>): Promise<Employee> {
    try {
      // Generate QR code for employee
      const qrCodeData = JSON.stringify({
        employeeId: employeeData.employeeId,
        name: employeeData.name,
        timestamp: Date.now()
      });
      const qrCode = await QRCode.toDataURL(qrCodeData);

      // Create Firebase Auth user
      const defaultPassword = 'dev123456'; // Development password
      const userCredential = await createUserWithEmailAndPassword(auth, employeeData.email, defaultPassword);
      const userId = userCredential.user.uid;

      // Create employee document in Firestore
      const employee: Employee = {
        id: userId,
        ...employeeData,
        createdAt: new Date(),
        qrCode,
      };

      await setDoc(doc(db, 'employees', userId), {
        ...employee,
        id: userId, // Store the ID in the document as well
      });

      // Sign out the newly created user so it doesn't interfere with current session
      await signOut(auth);

      return employee;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<void> {
    try {
      const employeeRef = doc(db, 'employees', id);
      await updateDoc(employeeRef, updates);
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  }

  async deleteEmployee(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'employees', id));
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }

  async getAllEmployees(): Promise<Employee[]> {
    try {
      const employeesRef = collection(db, 'employees');
      const q = query(employeesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee));
    } catch (error) {
      console.error('Error getting employees:', error);
      throw error;
    }
  }

  async getEmployeeById(id: string): Promise<Employee | null> {
    try {
      const employeeDoc = await getDoc(doc(db, 'employees', id));
      
      if (employeeDoc.exists()) {
        return {
          id: employeeDoc.id,
          ...employeeDoc.data()
        } as Employee;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting employee:', error);
      throw error;
    }
  }

  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | null> {
    try {
      const employeesRef = collection(db, 'employees');
      const q = query(employeesRef, where('employeeId', '==', employeeId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as Employee;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting employee by employee ID:', error);
      throw error;
    }
  }

  async getEmployeeByEmail(email: string): Promise<Employee | null> {
    try {
      const employeesRef = collection(db, 'employees');
      const q = query(employeesRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as Employee;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting employee by email:', error);
      throw error;
    }
  }

  async approveWFH(employeeId: string, expiryDate: Date): Promise<void> {
    try {
      const employee = await this.getEmployeeByEmployeeId(employeeId);
      if (employee) {
        await this.updateEmployee(employee.id, {
          wfhApproved: true,
          wfhExpiry: expiryDate,
        });
      }
    } catch (error) {
      console.error('Error approving WFH:', error);
      throw error;
    }
  }

  async revokeWFH(employeeId: string): Promise<void> {
    try {
      const employee = await this.getEmployeeByEmployeeId(employeeId);
      if (employee) {
        await this.updateEmployee(employee.id, {
          wfhApproved: false,
          wfhExpiry: undefined,
        });
      }
    } catch (error) {
      console.error('Error revoking WFH:', error);
      throw error;
    }
  }

  async regenerateQRCode(employeeId: string): Promise<string> {
    try {
      const employee = await this.getEmployeeByEmployeeId(employeeId);
      if (!employee) throw new Error('Employee not found');

      const qrCodeData = JSON.stringify({
        employeeId: employee.employeeId,
        name: employee.name,
        timestamp: Date.now()
      });
      const qrCode = await QRCode.toDataURL(qrCodeData);

      await this.updateEmployee(employee.id, { qrCode });
      return qrCode;
    } catch (error) {
      console.error('Error regenerating QR code:', error);
      throw error;
    }
  }

  // Helper method to create initial admin users
  async createInitialAdmins(): Promise<void> {
    try {
      const admins = [
        {
          employeeId: 'ADMIN001',
          name: 'System Administrator',
          email: 'admin@aintrix.com',
          role: 'admin' as const,
          department: 'Administration',
          isActive: true,
          password: 'admin123' // This won't be stored, just for reference
        },
        {
          employeeId: 'EMP001',
          name: 'John Doe',
          email: 'john.doe@aintrix.com',
          role: 'employee' as const,
          department: 'Engineering',
          isActive: true,
          password: 'emp123' // This won't be stored, just for reference
        }
      ];

      for (const adminData of admins) {
        const existingEmployee = await this.getEmployeeByEmail(adminData.email);
        if (!existingEmployee) {
          await this.createEmployee(adminData);
          console.log(`Created ${adminData.role}: ${adminData.email}`);
        } else {
          console.log(`${adminData.role} already exists: ${adminData.email}`);
        }
      }
    } catch (error) {
      console.error('Error creating initial admins:', error);
      throw error;
    }
  }
}

export const employeeService = new EmployeeService();