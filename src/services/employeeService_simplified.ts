import { 
  collection, 
  getDocs, 
  query, 
  where
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Employee } from '../types';

class EmployeeService {
  // Check if email exists in admins collection
  async checkAdminByEmail(email: string): Promise<boolean> {
    try {
      console.log(`Checking if ${email} exists in admins collection...`);
      const adminsRef = collection(db, 'admins');
      const adminsSnapshot = await getDocs(adminsRef);
      
      console.log(`Found ${adminsSnapshot.size} documents in admins collection`);
      
      const adminExists = adminsSnapshot.docs.some(doc => {
        const data = doc.data();
        return doc.id === email || data.email === email;
      });
      
      console.log(`Admin ${email} exists:`, adminExists);
      return adminExists;
    } catch (error) {
      console.error('Error checking admin:', error);
      return false;
    }
  }

  // Get employee by email (simplified)
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
