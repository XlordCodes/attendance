import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../services/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

interface AppUser {
  uid: string;
  email?: string;
  role: "admin" | "employee";
}

const AuthContext = createContext<{ user: AppUser | null }>({ user: null });

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "employees", firebaseUser.uid));
        const userData = userDoc.data();
        if (userData) {
          setUser({ uid: firebaseUser.uid, role: userData.role });
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
};
