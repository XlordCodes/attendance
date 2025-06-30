import { useState } from 'react';
import { Monitor, Shield, Mail, Lock, QrCode, X, UserCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import AintrixLogo from '../common/AintrixLogo';
import toast from 'react-hot-toast';

type LoginMode = 'kiosk' | 'admin' | 'employee';

const UnifiedLoginPage: React.FC = () => {
  const [mode, setMode] = useState<LoginMode>('employee');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showQROverlay, setShowQROverlay] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    // For admin mode, password is required
    if (mode === 'admin' && !password.trim()) {
      toast.error('Password is required for admin access');
      return;
    }

    setLoading(true);
    try {
      let role = 'employee';
      if (mode === 'admin') role = 'admin';
      if (mode === 'kiosk') role = 'kiosk';
      
      await login(email, password, role);
      toast.success(`Welcome to ${getModeTitle()}`);
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQRLogin = () => {
    setShowQROverlay(true);
  };

  const handleGoogleLogin = () => {
    toast('Google sign-in coming soon!', { icon: 'ℹ️' });
  };

  const handleAppleLogin = () => {
    toast('Apple sign-in coming soon!', { icon: 'ℹ️' });
  };

  // Clean minimalist theme configuration - Light theme for login page
  const getThemeConfig = () => {
    // Clean, minimalist light theme for login page
    const baseTheme = {
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
    return baseTheme;
  };

  const theme = getThemeConfig();

  const getModeTitle = () => {
    switch (mode) {
      case 'kiosk':
        return 'Kiosk Mode';
      case 'admin':
        return 'Admin Panel';
      case 'employee':
        return 'Employee Portal';
    }
  };

  const getModeDescription = () => {
    switch (mode) {
      case 'kiosk':
        return 'Company dashboard & check-in terminal';
      case 'admin':
        return 'Full system management & analytics';
      case 'employee':
        return 'Personal workspace & time tracking';
    }
  };

  // Get hero images for different modes - Clean professional images
  const getHeroImage = () => {
    switch (mode) {
      case 'kiosk':
        return 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';
      case 'admin':
        return 'https://images.unsplash.com/photo-1553877522-43269d4ea984?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';
      case 'employee':
        return 'https://images.unsplash.com/photo-1560472355-536de3962603?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';
    }
  };

  const getHeroContent = () => {
    switch (mode) {
      case 'kiosk':
        return {
          title: 'Smart Workplace',
          subtitle: 'Transform your office into a digital-first environment'
        };
      case 'admin':
        return {
          title: 'Command Center', 
          subtitle: 'Comprehensive workforce management at your fingertips'
        };
      case 'employee':
        return {
          title: 'Your Digital Workspace',
          subtitle: 'Streamlined attendance tracking for modern professionals'
        };
    }
  };

  const heroContent = getHeroContent();

  return (
    <>
      <div className={`min-h-screen ${theme.bgClass} flex`}>
        {/* Left Side - Hero Image - Clean Light Design */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-white">
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out"
            style={{ 
              backgroundImage: `url(${getHeroImage()})`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/30"></div>
          </div>
          <div className="relative z-10 flex flex-col justify-center items-center text-gray-900 p-12">
            <div className="text-center mb-12 max-w-lg bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
              <h1 className="text-4xl font-light mb-4 leading-tight text-gray-900">{heroContent.title}</h1>
              <p className="text-lg text-gray-700 leading-relaxed font-light">{heroContent.subtitle}</p>
            </div>
            <div className="flex space-x-3">
              <div className={`w-3 h-3 rounded-full transition-all duration-500 ${mode === 'employee' ? 'bg-gray-900' : 'bg-gray-300'}`}></div>
              <div className={`w-3 h-3 rounded-full transition-all duration-500 ${mode === 'admin' ? 'bg-gray-900' : 'bg-gray-300'}`}></div>
              <div className={`w-3 h-3 rounded-full transition-all duration-500 ${mode === 'kiosk' ? 'bg-gray-900' : 'bg-gray-300'}`}></div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form - Clean Minimalist */}
        <div className={`w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 ${theme.bgClass} min-h-screen`}>
          <div className="w-full max-w-md">
            {/* Main Login Card - Clean Minimalist Design */}
            <div className={`${theme.cardBg} rounded-2xl shadow-xl border ${theme.inputBorder} overflow-hidden transition-all duration-500 hover:shadow-2xl`}>
              <div className="p-8 lg:p-10">
                
                {/* Logo Section */}
                <div className="text-center mb-8">
                  <div className="mb-6">
                    <AintrixLogo 
                      variant="black" 
                      size={80} 
                      className="justify-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <h1 className={`text-2xl font-light ${theme.textPrimary} transition-all duration-300`}>
                      {getModeTitle()}
                    </h1>
                    <p className={`text-sm ${theme.textSecondary} leading-relaxed font-light`}>
                      {getModeDescription()}
                    </p>
                  </div>
                </div>              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                
                {/* Email Input */}
                <div className="transition-all duration-300">
                  <label className={`block text-sm font-medium ${theme.textPrimary} mb-2`}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${theme.textSecondary} transition-colors duration-200`} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full pl-11 pr-4 py-3 ${theme.inputBg} border ${theme.inputBorder} rounded-lg text-sm ${theme.textPrimary} placeholder-gray-400 focus:outline-none focus:ring-2 ${theme.inputFocus} transition-all duration-200 hover:border-gray-300`}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="transition-all duration-300">
                  <label className={`block text-sm font-medium ${theme.textPrimary} mb-2`}>
                    Password {mode !== 'admin' && <span className={`text-xs ${theme.textSecondary}`}>(Optional for employee/kiosk)</span>}
                  </label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${theme.textSecondary} transition-colors duration-200`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full pl-11 pr-11 py-3 ${theme.inputBg} border ${theme.inputBorder} rounded-lg text-sm ${theme.textPrimary} placeholder-gray-400 focus:outline-none focus:ring-2 ${theme.inputFocus} transition-all duration-200 hover:border-gray-300`}
                      placeholder="Enter your password"
                      required={mode === 'admin'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${theme.textSecondary} hover:${theme.textPrimary} transition-colors duration-200`}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>                {/* Mode Selection - Clean Buttons */}
                <div className="transition-all duration-300">
                  <label className={`block text-sm font-medium ${theme.textPrimary} mb-3`}>
                    Access Mode
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    
                    {/* Employee Mode */}
                    <button
                      type="button"
                      onClick={() => setMode('employee')}
                      className={`relative p-4 rounded-lg border transition-all duration-300 ${
                        mode === 'employee' 
                          ? 'border-gray-900 bg-gray-50 shadow-md' 
                          : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <UserCheck className={`w-5 h-5 transition-colors duration-200 ${mode === 'employee' ? 'text-gray-900' : 'text-gray-600'}`} />
                        <span className={`text-xs font-medium transition-colors duration-200 ${mode === 'employee' ? 'text-gray-900' : 'text-gray-600'}`}>
                          Employee
                        </span>
                      </div>
                    </button>

                    {/* Admin Mode */}
                    <button
                      type="button"
                      onClick={() => setMode('admin')}
                      className={`relative p-4 rounded-lg border transition-all duration-300 ${
                        mode === 'admin' 
                          ? 'border-gray-900 bg-gray-50 shadow-md' 
                          : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <Shield className={`w-5 h-5 transition-colors duration-200 ${mode === 'admin' ? 'text-gray-900' : 'text-gray-600'}`} />
                        <span className={`text-xs font-medium transition-colors duration-200 ${mode === 'admin' ? 'text-gray-900' : 'text-gray-600'}`}>
                          Admin
                        </span>
                      </div>
                    </button>

                    {/* Kiosk Mode */}
                    <button
                      type="button"
                      onClick={() => setMode('kiosk')}
                      className={`relative p-4 rounded-lg border transition-all duration-300 ${
                        mode === 'kiosk' 
                          ? 'border-gray-900 bg-gray-50 shadow-md' 
                          : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <Monitor className={`w-5 h-5 transition-colors duration-200 ${mode === 'kiosk' ? 'text-gray-900' : 'text-gray-600'}`} />
                        <span className={`text-xs font-medium transition-colors duration-200 ${mode === 'kiosk' ? 'text-gray-900' : 'text-gray-600'}`}>
                          Kiosk
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                  {/* Login Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full ${theme.buttonPrimary} text-white py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium text-sm hover:transform hover:scale-[1.02] active:scale-[0.98]`}
                  >
                    {loading ? 'Signing in...' : `Sign in to ${getModeTitle()}`}
                  </button>
                </form>

                {/* Alternative Login Methods */}
                <div className="mt-6">
                  <div className="flex items-center mb-4">
                    <div className="flex-1 border-t border-gray-200"></div>
                    <span className="px-4 text-sm text-gray-600">or continue with</span>
                    <div className="flex-1 border-t border-gray-200"></div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* QR Code */}
                    <button
                      type="button"
                      onClick={handleQRLogin}
                      className={`p-3 border ${theme.buttonSecondary} rounded-lg transition-all duration-200 flex flex-col items-center space-y-1 hover:transform hover:scale-105`}
                    >
                      <QrCode className="w-5 h-5" />
                      <span className="text-xs">QR Code</span>
                    </button>

                    {/* Google */}
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className={`p-3 border ${theme.buttonSecondary} rounded-lg transition-all duration-200 flex flex-col items-center space-y-1 hover:transform hover:scale-105`}
                    >
                      <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" className="w-5 h-5" />
                      <span className="text-xs">Google</span>
                    </button>

                    {/* Apple */}
                    <button
                      type="button"
                      onClick={handleAppleLogin}
                      className={`p-3 border ${theme.buttonSecondary} rounded-lg transition-all duration-200 flex flex-col items-center space-y-1 hover:transform hover:scale-105`}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.13997 6.91 8.85997 6.88C10.15 6.86 11.38 7.75 12.1 7.75C12.81 7.75 14.24 6.68 15.84 6.84C16.67 6.87 18.39 7.16 19.56 8.76C19.47 8.82 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
                      </svg>
                      <span className="text-xs">Apple</span>
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6">
                  <p className={`text-xs ${theme.textSecondary}`}>
                    v1.0.0 • AINTRIX Global • Secure Access
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Overlay */}
      {showQROverlay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${theme.cardBg} rounded-2xl p-8 max-w-sm w-full text-center relative`}>
            <button
              onClick={() => setShowQROverlay(false)}
              className={`absolute top-4 right-4 ${theme.textSecondary} hover:${theme.textPrimary}`}
            >
              <X className="w-6 h-6" />
            </button>
            
            <h3 className={`text-xl font-bold ${theme.textPrimary} mb-6`}>QR Code Sign-in</h3>
            
            {/* Large QR Code Placeholder */}
            <div className={`w-64 h-64 ${theme.inputBg} border-2 border-dashed ${theme.inputBorder} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
              <div className="text-center">
                <QrCode className={`w-16 h-16 ${theme.textSecondary} mx-auto mb-4`} />
                <p className={`text-sm ${theme.textSecondary}`}>QR Code will appear here</p>
              </div>
            </div>
            
            <p className={`text-sm ${theme.textSecondary} mb-4`}>
              Scan this QR code with your phone to sign in quickly
            </p>
            
            <div className={`text-xs ${theme.textSecondary}`}>
              QR code expires in 5 minutes
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UnifiedLoginPage;
