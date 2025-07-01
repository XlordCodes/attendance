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
      },
    ];
  }
};

// Initialize sample data
initializeSampleEmployees();

class EmployeeService {
  async createEmployee(employeeData: Omit<Employee, 'id' | 'createdAt'>): Promise<Employee> {
    try {
      // Create Firebase Auth user
      const standardPassword = 'admin123'; // Standard password for all users
      const userCredential = await createUserWithEmailAndPassword(auth, employeeData.email, standardPassword);
      const userId = userCredential.user.uid;

      // Create employee document in Firestore
      const employee: Employee = {
        id: userId,
        ...employeeData,
        createdAt: new Date(),
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
}

export const employeeService = new EmployeeService();