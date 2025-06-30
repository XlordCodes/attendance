// Demo Firebase configuration - replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project-id",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "demo-app-id"
};

// For demo purposes, we'll use a mock authentication system
export const mockAuth = {
  currentUser: null as any,
  signInWithEmailAndPassword: async (email: string, password: string) => {
    // Demo credentials
    const validCredentials = [
      { email: 'EMP001@company.com', password: 'password123', uid: 'emp001' },
      { email: 'ADMIN001@company.com', password: 'admin123', uid: 'admin001' }
    ];

    const user = validCredentials.find(cred => cred.email === email && cred.password === password);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    return { user: { uid: user.uid, email: user.email } };
  },
  signOut: async () => {
    return Promise.resolve();
  },
  onAuthStateChanged: (callback: (user: any) => void) => {
    // For demo, return unsubscribe function
    return () => {};
  }
};

export const mockDb = {
  collection: () => ({
    doc: () => ({
      get: async () => ({
        exists: () => true,
        data: () => ({
          id: 'emp001',
          employeeId: 'EMP001',
          name: 'John Doe',
          email: 'john.doe@company.com',
          role: 'employee',
          department: 'Engineering',
          isActive: true,
          createdAt: new Date(),
          qrCode: 'data:image/png;base64,demo-qr-code'
        })
      })
    })
  }),
  doc: () => ({
    get: async () => ({
      exists: () => true,
      data: () => ({
        id: 'emp001',
        employeeId: 'EMP001',
        name: 'John Doe',
        email: 'john.doe@company.com',
        role: 'employee',
        department: 'Engineering',
        isActive: true,
        createdAt: new Date(),
        qrCode: 'data:image/png;base64,demo-qr-code'
      })
    })
  })
};

// Export mock services for demo
export const auth = mockAuth;
export const db = mockDb;

// Note: To use with real Firebase, uncomment below and replace with your config
/*
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
*/