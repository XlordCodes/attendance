import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

type LoginType = 'admin' | 'employee';

const UnifiedLogin: React.FC = () => {
  const { login, loading } = useAuth();
  const [loginType, setLoginType] = useState<LoginType>('employee');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    if (!formData.password.trim()) {
      toast.error('Please enter your password');
      return;
    }

    try {
      await login(formData.email, formData.password, loginType);
      toast.success(`Welcome to ${loginType === 'admin' ? 'Admin Panel' : 'Employee Portal'}`);
    } catch (error: unknown) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed. Please check your credentials.';
      toast.error(errorMessage);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const renderLoginForm = () => {
    switch (loginType) {
      case 'admin':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                placeholder="admin@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                placeholder="••••••••"
                required
              />
            </div>
          </>
        );

      case 'employee':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                placeholder="employee@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                placeholder="••••••••"
                required
              />
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-black">Aintrix</h1>
          <p className="mt-2 text-sm text-gray-600">Attendance Management System</p>
        </div>

        {/* Login Type Selector */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setLoginType('employee')}
            className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              loginType === 'employee'
                ? 'bg-white text-black shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            👤 Employee
          </button>
          <button
            type="button"
            onClick={() => setLoginType('admin')}
            className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              loginType === 'admin'
                ? 'bg-white text-black shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🔑 Admin
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {renderLoginForm()}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            {loginType === 'employee' && 'Employee portal access'}
            {loginType === 'admin' && 'Administrator access - can access both admin and employee panels'}
          </p>
          
          {/* Debug button - remove in production */}
          <div className="mt-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                // Use actual emails from Firebase console
                setFormData({
                  email: loginType === 'admin' ? 'yousuf38152006@gmail.com' : 
                         'kailash.s2376@gmail.com',
                  password: '' // User will need to enter their actual password
                });
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Fill test email ({loginType === 'admin' ? 'yousuf38152006@gmail.com' : 'kailash.s2376@gmail.com'})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedLogin;
