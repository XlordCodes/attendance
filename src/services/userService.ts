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

class UserService {
  private readonly COLLECTION_NAME = 'users';

  async createUser(userData: Omit<Employee, 'id' | 'createdAt'>): Promise<Employee> {
    try {
      // Create Firebase Auth user with email as password
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.email);
      const userId = userCredential.user.uid;

      // Create user document in Firestore users collection
      const user: Employee = {
        id: userId,
        ...userData,
        password: userData.email, // Password is same as email
        createdAt: new Date(),
      };

      await setDoc(doc(db, this.COLLECTION_NAME, userId), {
        ...user,
        id: userId, // Store the ID in the document as well
      });

      // Sign out the newly created user so it doesn't interfere with current session
      await signOut(auth);

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<Employee>): Promise<void> {
    try {
      const userRef = doc(db, this.COLLECTION_NAME, id);
      await updateDoc(userRef, updates);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION_NAME, id));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<Employee[]> {
    try {
      const usersRef = collection(db, this.COLLECTION_NAME);
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee));
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<Employee | null> {
    try {
      const userDoc = await getDoc(doc(db, this.COLLECTION_NAME, id));
      if (userDoc.exists()) {
        return {
          id: userDoc.id,
          ...userDoc.data()
        } as Employee;
      }
      return null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<Employee | null> {
    try {
      const usersRef = collection(db, this.COLLECTION_NAME);
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const userDoc = querySnapshot.docs[0];
      return {
        id: userDoc.id,
        ...userDoc.data()
      } as Employee;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  async getUsersByRole(role: 'admin' | 'employee'): Promise<Employee[]> {
    try {
      const usersRef = collection(db, this.COLLECTION_NAME);
      const q = query(usersRef, where('role', '==', role), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee));
    } catch (error) {
      console.error('Error getting users by role:', error);
      throw error;
    }
  }

  async getUsersByDepartment(department: string): Promise<Employee[]> {
    try {
      const usersRef = collection(db, this.COLLECTION_NAME);
      const q = query(usersRef, where('department', '==', department), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee));
    } catch (error) {
      console.error('Error getting users by department:', error);
      throw error;
    }
  }

  async getActiveUsers(): Promise<Employee[]> {
    try {
      const usersRef = collection(db, this.COLLECTION_NAME);
      const q = query(usersRef, where('isActive', '==', true), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee));
    } catch (error) {
      console.error('Error getting active users:', error);
      throw error;
    }
  }

  async setUserActiveStatus(id: string, isActive: boolean): Promise<void> {
    try {
      await this.updateUser(id, { isActive });
    } catch (error) {
      console.error('Error setting user active status:', error);
      throw error;
    }
  }

  // Alias for getAllUsers to maintain compatibility
  async getAllEmployees(): Promise<Employee[]> {
    return this.getAllUsers();
  }

  // Cleanup user documents by removing password fields and other sensitive data
  async cleanupUserDocuments(): Promise<void> {
    try {
      console.log('🧹 Starting user document cleanup...');
      
      const usersRef = collection(db, this.COLLECTION_NAME);
      const querySnapshot = await getDocs(usersRef);
      
      let cleanedCount = 0;
      
      for (const docSnap of querySnapshot.docs) {
        const userData = docSnap.data();
        
        // Check if cleanup is needed
        if (userData.password || userData.hashedPassword || userData.authPassword) {
          const cleanedData = { ...userData };
          
          // Remove password-related fields
          delete cleanedData.password;
          delete cleanedData.hashedPassword;
          delete cleanedData.authPassword;
          
          // Ensure proper field structure
          if (!cleanedData.isActive && cleanedData.isActive !== false) {
            cleanedData.isActive = true;
          }
          
          // Update the document
          await updateDoc(doc(db, this.COLLECTION_NAME, docSnap.id), cleanedData);
          cleanedCount++;
          
          console.log(`✅ Cleaned document: ${docSnap.id}`);
        }
      }
      
      console.log(`🎉 Cleanup completed! ${cleanedCount} documents cleaned out of ${querySnapshot.docs.length} total.`);
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      throw error;
    }
  }

  // Verify that all users have proper designation field
  async verifyDesignationFix(): Promise<void> {
    try {
      console.log('🔍 Verifying designation fields...');
      
      const usersRef = collection(db, this.COLLECTION_NAME);
      const querySnapshot = await getDocs(usersRef);
      
      let fixedCount = 0;
      
      for (const docSnap of querySnapshot.docs) {
        const userData = docSnap.data();
        
        // Check if designation field needs fixing
        if (userData.Designation && !userData.designation) {
          const updates = {
            designation: userData.Designation
          };
          
          await updateDoc(doc(db, this.COLLECTION_NAME, docSnap.id), updates);
          fixedCount++;
          
          console.log(`✅ Fixed designation for: ${userData.name || docSnap.id}`);
        }
      }
      
      console.log(`🎉 Designation verification completed! ${fixedCount} documents fixed.`);
    } catch (error) {
      console.error('❌ Error during designation verification:', error);
      throw error;
    }
  }

  // Get user statistics
  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    admins: number;
    employees: number;
    departments: string[];
  }> {
    try {
      const users = await this.getAllUsers();
      
      const stats = {
        total: users.length,
        active: users.filter(u => u.isActive !== false).length,
        inactive: users.filter(u => u.isActive === false).length,
        admins: users.filter(u => u.role === 'admin').length,
        employees: users.filter(u => u.role === 'employee').length,
        departments: [...new Set(users.map(u => u.department).filter(Boolean))]
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
export default userService;
