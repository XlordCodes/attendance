import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { Employee } from '../types';

export interface AuthUser extends User {
  role?: 'admin' | 'employee';
  employeeData?: Employee;
}

class AuthService {
  async signIn(email: string, password: string): Promise<AuthUser> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get additional user data from Firestore
      const employeeDoc = await getDoc(doc(db, 'employees', user.uid));
      
      if (employeeDoc.exists()) {
        const employeeData = employeeDoc.data() as Employee;
        return {
          ...user,
          role: employeeData.role || 'employee',
          employeeData
        } as AuthUser;
      }
      
      // Default to employee role if no data found
      return {
        ...user,
        role: 'employee'
      } as AuthUser;
    } catch (error: any) {
      throw new Error(error.message || 'Authentication failed');
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error(error.message || 'Sign out failed');
    }
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get additional user data from Firestore
          const employeeDoc = await getDoc(doc(db, 'employees', user.uid));
          
          if (employeeDoc.exists()) {
            const employeeData = employeeDoc.data() as Employee;
            callback({
              ...user,
              role: employeeData.role || 'employee',
              employeeData
            } as AuthUser);
          } else {
            callback({
              ...user,
              role: 'employee'
            } as AuthUser);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          callback({
            ...user,
            role: 'employee'
          } as AuthUser);
        }
      } else {
        callback(null);
      }
    });
  }

  getCurrentUser(): User | null {
    return auth.currentUser;
  }
}

export const authService = new AuthService();