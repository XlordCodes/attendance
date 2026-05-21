import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const AintrixLogo: React.FC<{ className: string }> = ({ className }) => (
  <div className={`${className} flex items-center justify-center`}>
    <div className="w-full h-full bg-white rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.15)]">
      <div className="w-3/5 h-3/5 bg-black rounded-lg opacity-90"></div>
    </div>
  </div>
);

const UnifiedLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    if (!password.trim()) {
      toast.error('Password is required');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-screen bg-[#050507] flex items-center justify-center p-4 relative text-zinc-100 selection:bg-zinc-800 bg-cover bg-center bg-no-repeat font-clash"
      style={{ backgroundImage: "url('/login-bg.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10 rounded-3xl border border-white/[0.08] border-t-white/[0.15] bg-black/60 backdrop-blur-xl shadow-[0_30px_60px_-15px_rgba(0,0,0,1),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden transition-all duration-300">
        <div className="p-8 sm:p-10 space-y-8">

          <div className="flex flex-col items-center text-center space-y-3">
            <AintrixLogo className="w-12 h-12 mb-1" />
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-normal text-white font-clash">Control the clock.</h1>
              <p className="text-zinc-400 text-sm font-normal">It's about time.</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:bg-zinc-950/60 transition-all duration-200 font-clash"
                placeholder="Your email address"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900/40 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:bg-zinc-950/60 transition-all duration-200 font-clash"
                  placeholder="Your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-zinc-100 py-3 rounded-xl text-sm font-semibold mt-8 transition-all duration-200 shadow-[0_4px_20px_rgba(255,255,255,0.1)] active:scale-[0.99] disabled:opacity-50 font-clash"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-white/5">
            <p className="text-xs text-zinc-500 font-normal tracking-wide">
              Aintrix Global
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default UnifiedLoginPage;
