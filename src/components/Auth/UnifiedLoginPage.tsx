import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const AintrixLogo: React.FC<{ className: string }> = ({ className }) => (
  <div className={`${className} flex items-center justify-center`}>
    <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center">
      <div className="w-3/5 h-3/5 bg-white rounded opacity-90"></div>
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

  // ✅ AUTO-BOOT FAILSAFE: Immediately redirect logged-in users to dashboard
  // Bypasses all hanging promises and submit handler race conditions
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
      // Remove role parameter - let the system determine role from database
      await login(email, password);
      
      // ── DO NOT navigate here. ──
      // The useEffect auto-redirect (line 25-29) watches for
      // (!authLoading && user) and navigates when onAuthStateChange
      // has fully completed (user set, employee fetched, loading=false).
      //
      // Navigating here would fire BEFORE onAuthStateChange sets
      // user/employee, causing ProtectedRoute to see !user and
      // bounce the user right back to /login.
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    toast('Google sign-in coming soon!', { icon: 'ℹ️' });
  };

  const handleAppleLogin = () => {
    toast('Apple sign-in coming soon!', { icon: 'ℹ️' });
  };

  // Clean, minimalist light theme for login page
  const theme = {
    isDark: false,
    bgClass: 'bg-gray-50',
    cardBg: 'bg-white',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    inputBg: 'bg-white',
    inputBorder: 'border-gray-200',
    inputFocus: 'focus:border-gray-400 focus:ring-gray-400',
    buttonPrimary: 'bg-gray-900 hover:bg-gray-800',
    buttonSecondary: 'border-gray-200 text-gray-700 hover:bg-gray-50',
    accentColor: 'gray'
  };

  return (
    <div className={`min-h-screen ${theme.bgClass} flex flex-col lg:flex-row`}>
      {/* Left Side - Hero Image - Responsive Design */}
      <div className="hidden md:flex md:w-full lg:w-1/2 xl:w-3/5 relative overflow-hidden bg-white min-h-[40vh] lg:min-h-screen">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out"
          style={{ 
            backgroundImage: `url(https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80)`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/30"></div>
        </div>
        <div className="relative z-10 flex flex-col justify-center items-center text-gray-900 p-4 sm:p-6 lg:p-8 xl:p-12">
          <div className="text-center mb-4 sm:mb-6 lg:mb-8 xl:mb-12 max-w-sm sm:max-w-md lg:max-w-lg bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 xl:p-8 shadow-lg">
            <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-4xl font-light mb-2 sm:mb-3 xl:mb-4 leading-tight text-gray-900">Welcome to AINTRIX</h1>
            <p className="text-sm sm:text-base xl:text-lg text-gray-700 leading-relaxed font-light">Advanced Attendance Management System</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form - Enhanced Responsive Design */}
      <div className={`w-full md:w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-2 sm:p-3 md:p-4 lg:p-6 xl:p-8 ${theme.bgClass} min-h-screen`}>
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-md">
          {/* Main Login Card - Responsive Design */}
          <div className={`${theme.cardBg} rounded-lg sm:rounded-xl shadow-md sm:shadow-lg border ${theme.inputBorder} overflow-hidden transition-all duration-500 hover:shadow-xl`}>
            <div className="p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7">
              
              {/* Logo Section - Responsive */}
              <div className="text-center mb-3 sm:mb-4 md:mb-5 lg:mb-6">
                <div className="mb-2 sm:mb-3 md:mb-4">
                  <div className="flex justify-center">
                    <AintrixLogo 
                      className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14"
                    />
                  </div>
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  <h1 className={`text-base sm:text-lg md:text-xl lg:text-xl font-light ${theme.textPrimary} transition-all duration-300`}>
                    Sign In
                  </h1>
                  <p className={`text-xs sm:text-xs md:text-sm ${theme.textSecondary} leading-relaxed font-light px-1 sm:px-0`}>
                    Access your AINTRIX workspace
                  </p>
                </div>
              </div>

              {/* Login Form - Enhanced Responsive */}
              <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                
                {/* Email Input - Responsive */}
                <div className="transition-all duration-300">
                  <label className={`block text-xs font-medium ${theme.textPrimary} mb-1 sm:mb-1.5`}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className={`absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 ${theme.textSecondary} transition-colors duration-200`} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full pl-8 sm:pl-9 pr-2.5 sm:pr-3 py-2 sm:py-2.5 ${theme.inputBg} border ${theme.inputBorder} rounded-md text-sm ${theme.textPrimary} placeholder-gray-400 focus:outline-none focus:ring-1 sm:focus:ring-2 ${theme.inputFocus} transition-all duration-200 hover:border-gray-300`}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                {/* Password Input - Updated */}
                <div className="transition-all duration-300">
                  <label className={`block text-xs font-medium ${theme.textPrimary} mb-1 sm:mb-1.5`}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock className={`absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 ${theme.textSecondary} transition-colors duration-200`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full pl-8 sm:pl-9 pr-8 sm:pr-9 py-2 sm:py-2.5 ${theme.inputBg} border ${theme.inputBorder} rounded-md text-sm ${theme.textPrimary} placeholder-gray-400 focus:outline-none focus:ring-1 sm:focus:ring-2 ${theme.inputFocus} transition-all duration-200 hover:border-gray-300`}
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-2.5 top-1/2 transform -translate-y-1/2 ${theme.textSecondary} hover:${theme.textPrimary} transition-colors duration-200`}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    </button>
                  </div>
                </div>

                {/* Login Button - Responsive */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full ${theme.buttonPrimary} text-white py-2 sm:py-2.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium text-sm hover:transform hover:scale-[1.01] active:scale-[0.99]`}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              {/* Alternative Login Methods - Enhanced Responsive */}
              <div className="mt-4 sm:mt-6">
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className="flex-1 border-t border-gray-200"></div>
                  <span className="px-3 sm:px-4 text-xs sm:text-sm text-gray-600">or continue with</span>
                  <div className="flex-1 border-t border-gray-200"></div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {/* Google - Responsive */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className={`p-2.5 sm:p-3 border ${theme.buttonSecondary} rounded-lg transition-all duration-200 flex flex-col items-center space-y-1 hover:transform hover:scale-105`}
                  >
                    <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-xs">Google</span>
                  </button>

                  {/* Apple - Responsive */}
                  <button
                    type="button"
                    onClick={handleAppleLogin}
                    className={`p-2.5 sm:p-3 border ${theme.buttonSecondary} rounded-lg transition-all duration-200 flex flex-col items-center space-y-1 hover:transform hover:scale-105`}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.13997 6.91 8.85997 6.88C10.15 6.86 11.38 7.75 12.1 7.75C12.81 7.75 14.24 6.68 15.84 6.84C16.67 6.87 18.39 7.16 19.56 8.76C19.47 8.82 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
                    </svg>
                    <span className="text-xs">Apple</span>
                  </button>
                </div>
              </div>

              {/* Footer - Responsive */}
              <div className="text-center mt-4 sm:mt-6">
                <p className={`text-xs ${theme.textSecondary}`}>
                  v1.0.0 • AINTRIX Global • Secure Access
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedLoginPage;
