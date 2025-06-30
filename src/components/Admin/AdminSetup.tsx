import React, { useState } from 'react';
import { Shield, UserPlus, Settings, CheckCircle } from 'lucide-react';
import { setupInitialUsers, addAdmin, addEmployee } from '../../utils/setupAdmins';
import toast from 'react-hot-toast';

const AdminSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    department: '',
    role: 'employee' as 'admin' | 'employee',
  });

  const handleSetupInitialUsers = async () => {
    setLoading(true);
    try {
      await setupInitialUsers();
      setSetupComplete(true);
      toast.success('Initial users created successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create initial users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (formData.role === 'admin') {
        await addAdmin(formData.employeeId, formData.name, formData.email, formData.department);
      } else {
        await addEmployee(formData.employeeId, formData.name, formData.email, formData.department);
      }
      
      toast.success(`${formData.role} created successfully!`);
      setFormData({
        employeeId: '',
        name: '',
        email: '',
        department: '',
        role: 'employee',
      });
      setShowAddForm(false);
    } catch (error: any) {
      toast.error(error.message || `Failed to create ${formData.role}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Setup</h1>
            <p className="text-gray-600 mt-2">
              Initialize your attendance system with admin and employee accounts
            </p>
          </div>

          {/* Setup Initial Users */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Initial Setup
            </h2>
            <p className="text-blue-800 mb-4">
              This will create default admin and employee accounts in your Firebase project.
            </p>
            
            {setupComplete ? (
              <div className="flex items-center text-green-700">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span>Initial setup completed successfully!</span>
              </div>
            ) : (
              <button
                onClick={handleSetupInitialUsers}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Settings className="w-5 h-5" />
                )}
                <span>{loading ? 'Setting up...' : 'Run Initial Setup'}</span>
              </button>
            )}
          </div>

          {/* Add Individual Users */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Add Individual Users</h2>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add User</span>
              </button>
            </div>

            {showAddForm && (
              <div className="bg-gray-50 rounded-lg p-6">
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employee ID
                      </label>
                      <input
                        type="text"
                        value={formData.employeeId}
                        onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., EMP002, ADMIN002"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Full Name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="user@aintrix.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Engineering, HR, Finance"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'employee' })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {loading ? 'Creating...' : `Create ${formData.role}`}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">📋 Instructions:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>1. <strong>First:</strong> Add admin emails to the <code className="bg-yellow-200 px-1 rounded">admins</code> collection in Firebase Firestore</li>
              <li>2. Run the initial setup to create accounts from your Firebase admins collection</li>
              <li>3. Users can login with their email address and password: <code className="bg-yellow-200 px-1 rounded">admin123</code></li>
              <li>4. The system automatically creates admin accounts from your Firebase admins collection</li>
              <li>5. Admin users have access to employee management and kiosk features</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSetup;
