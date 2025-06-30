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
import * as QRCode from 'qrcode';

// Mock data for testing
let mockEmployees: Employee[] = [];

// Initialize with sample employees
const initializeSampleEmployees = () => {
  if (mockEmployees.length === 0) {
    mockEmployees = [
      {
        id: 'emp001',
        employeeId: 'EMP001',
        name: 'John Doe',
        email: 'john.doe@company.com',
        password: 'password123',
        role: 'employee',
        department: 'Engineering',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        qrCode: '',
      },
      {
        id: 'emp002',
        employeeId: 'EMP002',
        name: 'Jane Smith',
        email: 'jane.smith@company.com',
        password: 'password123',
        role: 'employee',
        department: 'Marketing',
        isActive: true,
        createdAt: new Date('2024-01-02'),
        qrCode: '',
      },
      {
        id: 'emp003',
        employeeId: 'EMP003',
        name: 'Bob Johnson',
        email: 'bob.johnson@company.com',
        password: 'password123',
        role: 'employee',
        department: 'Sales',
        isActive: true,
        createdAt: new Date('2024-01-03'),
        qrCode: '',
      },
      {
        id: 'admin001',
        employeeId: 'ADM001',
        name: 'Admin User',
        email: 'admin@company.com',
        password: 'admin123',
        role: 'admin',
        department: 'IT',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        qrCode: '',
      },
    ];
  }
};

// Initialize sample data
initializeSampleEmployees();

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
      const standardPassword = 'admin123'; // Standard password for all users
      const userCredential = await createUserWithEmailAndPassword(auth, employeeData.email, standardPassword);
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
      
      // Fallback to mock data
      return mockEmployees.find(emp => emp.employeeId === employeeId) || null;
    } catch (error) {
      console.error('Error getting employee by ID from Firebase, using mock data:', error);
      return mockEmployees.find(emp => emp.employeeId === employeeId) || null;
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
}

export const employeeService = new EmployeeService();