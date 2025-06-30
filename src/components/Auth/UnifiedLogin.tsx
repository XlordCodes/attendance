import React, { useState } from 'react';
import { Users, Monitor, Building, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuthNew';
import toast from 'react-hot-toast';

type LoginType = 'employee' | 'admin' | 'kiosk';

const UnifiedLogin: React.FC = () => {
  const [loginType, setLoginType] = useState<LoginType>('employee');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [kioskId, setKioskId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { loginEmployee, loginAdmin, loginKiosk } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (loginType === 'employee') {
        if (!email || !password) {
          throw new Error('Please enter email and password');
        }
        await loginEmployee(email, password);
        toast.success('Employee login successful!');
      } else if (loginType === 'admin') {
        if (!email || !password) {
          throw new Error('Please enter admin credentials');
        }
        await loginAdmin(email, password);
        toast.success('Admin login successful!');
      } else if (loginType === 'kiosk') {
        if (!kioskId || !password) {
          throw new Error('Please enter kiosk credentials');
        }
        await loginKiosk(kioskId, password);
        toast.success('Kiosk login successful!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const loginOptions = [
    {
      type: 'employee' as LoginType,
      title: 'Employee',
      description: 'Access your attendance dashboard',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      type: 'admin' as LoginType,
      title: 'Admin',
      description: 'Manage employees and system settings',
      icon: Building,
      color: 'bg-purple-500'
    },
    {
      type: 'kiosk' as LoginType,
      title: 'Kiosk',
      description: 'Kiosk mode for attendance tracking',
      icon: Monitor,
      color: 'bg-green-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Aintrix Attendance</h1>
          <p className="text-gray-600">Choose your login type to continue</p>
        </div>

        {/* Login Type Selection */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {loginOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = loginType === option.type;
            
            return (
              <button
                key={option.type}
                onClick={() => setLoginType(option.type)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm font-medium block">{option.title}</span>
              </button>
            );
          })}
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {loginType === 'employee' && 'Employee Login'}
              {loginType === 'admin' && 'Admin Login'}
              {loginType === 'kiosk' && 'Kiosk Login'}
            </h2>
            <p className="text-gray-600 text-sm">
              {loginType === 'employee' && 'Enter your employee credentials to access the attendance system'}
              {loginType === 'admin' && 'Enter your admin credentials to access the management panel'}
              {loginType === 'kiosk' && 'Enter kiosk credentials to enable attendance tracking mode'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email/Kiosk ID Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {loginType === 'kiosk' ? 'Kiosk ID' : 'Email Address'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {loginType === 'kiosk' ? (
                    <Monitor className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Mail className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <input
                  type={loginType === 'kiosk' ? 'text' : 'email'}
                  value={loginType === 'kiosk' ? kioskId : email}
                  onChange={(e) => {
                    if (loginType === 'kiosk') {
                      setKioskId(e.target.value);
                    } else {
                      setEmail(e.target.value);
                    }
                  }}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  placeholder={
                    loginType === 'kiosk' 
                      ? 'Enter kiosk ID (e.g., KIOSK-001)' 
                      : 'Enter your email address'
                  }
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Signing in...
                </div>
              ) : (
                `Sign in as ${loginType.charAt(0).toUpperCase() + loginType.slice(1)}`
              )}
            </button>
          </form>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500">
                {loginType === 'employee' && 'Location access is required for attendance tracking'}
                {loginType === 'admin' && 'Admin access provides full system management capabilities'}
                {loginType === 'kiosk' && 'Kiosk mode enables employee check-in/check-out functionality'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Powered by Aintrix Attendance System
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnifiedLogin;
