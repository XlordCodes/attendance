import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebaseConfig";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    const email = `${empId}@aintrix.com`; // Dummy email structure
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard"); // We'll route based on role later
    } catch (err: any) {
      alert("Login failed: " + err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-black">
      <h2 className="text-3xl font-bold mb-6">Employee Login</h2>
      <input
        className="border px-4 py-2 mb-2"
        placeholder="Employee ID"
        value={empId}
        onChange={(e) => setEmpId(e.target.value)}
      />
      <input
        className="border px-4 py-2 mb-4"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        className="bg-black text-white px-6 py-2 rounded"
        onClick={handleLogin}
      >
        Login
      </button>
    </div>
  );
}
