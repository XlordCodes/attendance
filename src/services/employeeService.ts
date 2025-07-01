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

class EmployeeService {
  async createEmployee(employeeData: Omit<Employee, 'id' | 'createdAt'>): Promise<Employee> {
    try {
      // Create Firebase Auth user with email as password
      const userCredential = await createUserWithEmailAndPassword(auth, employeeData.email, employeeData.email);
      const userId = userCredential.user.uid;

      // Create employee document in Firestore
      const employee: Employee = {
        id: userId,
        ...employeeData,
        password: employeeData.email, // Password is same as email
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
      
      return null;
    } catch (error) {
      console.error('Error getting employee by ID:', error);
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
}

export const employeeService = new EmployeeService();