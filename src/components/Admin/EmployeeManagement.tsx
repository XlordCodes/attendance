import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, UserCheck, UserX, RefreshCw, Mail, ChevronDown, ChevronRight, Key } from 'lucide-react';
import { userService } from '../../services/userService';
import { supabase } from '../../services/supabaseClient';
import { Employee } from '../../types';
import { forceResetPassword } from '../../services/adminService';
import toast from 'react-hot-toast';

const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [resettingEmployee, setResettingEmployee] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const initializeAndLoadEmployees = async () => {
      console.log('🚀 Initializing Employee Management component...');

      try {
        console.log('📋 Loading employees...');
        await loadEmployees();
      } catch (error) {
        console.error('❌ Failed to initialize Employee Management:', error);
        toast.error(`Initialization failed: ${(error as Error).message}`);
        setLoading(false);
      }
    };

    initializeAndLoadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      console.log('🔄 Starting to load employees...');
      setLoading(true);
      const userList = await userService.getAllEmployees();
      console.log('✅ Employees loaded in component:', userList);
      setEmployees(userList);
    } catch (error) {
      console.error('❌ Failed to load employees in component:', error);
      toast.error(`Failed to load employees: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.employeeId && employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase())) ||
    employee.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleEmployeeStatus = async (employee: Employee) => {
    try {
      await userService.updateUser(employee.id, {
        isActive: !employee.isActive
      });
      await loadEmployees();
      toast.success(`Employee ${employee.isActive ? 'deactivated' : 'activated'} successfully`);
    } catch (error: unknown) {
      console.error('Failed to update employee status:', error);
      toast.error('Failed to update employee status');
    }
  };

  const manualRefresh = async () => {
    try {
      setLoading(true);
      console.log('🔄 Manual refresh triggered...');

      // Reload employees
      await loadEmployees();

      toast.success('Employee data refreshed successfully!');
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
      toast.error(`Refresh failed: ${(error as Error).message}`);
    }
  };

  const handleOpenResetModal = (employee: Employee) => {
    setResettingEmployee(employee);
    setNewPassword('');
  };

  const handleCloseResetModal = () => {
    setResettingEmployee(null);
    setNewPassword('');
  };

  const handleSubmitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingEmployee) return;
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setResetting(true);
    try {
      await forceResetPassword(resettingEmployee.id, newPassword);
      toast.success(`Password reset successfully for ${resettingEmployee.name}`);
      handleCloseResetModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-200">Employee Management</h1>
        <div className="flex space-x-3">
          <button
            onClick={manualRefresh}
            disabled={loading}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center space-x-2"
          >
            <Mail className="w-4 h-4" />
            <span>Invite Employee</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#96C2DB] focus:border-[#96C2DB] focus:border-transparent"
          />
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  Loading employees...
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  No employees found
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => (
                <React.Fragment key={employee.id}>
                  <tr
                    className="hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                    onClick={() => setExpandedEmployeeId(expandedEmployeeId === employee.id ? null : employee.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-[#E5EDF1] rounded-full flex items-center justify-center">
                          <span className="text-[#96C2DB] font-medium">
                            {employee.name.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-slate-200">
                            {employee.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {employee.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-200">
                      {employee.employeeId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-200">
                      {employee.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${employee.role === 'admin'
                          ? 'bg-[#96C2DB]/10 text-gray-700 border border-[#96C2DB]/30 rounded-full'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full'
                        }`}>
                        {employee.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${employee.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full'
                          : 'bg-rose-50 text-rose-700 border border-rose-100 rounded-full'
                        }`}>
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setEditingEmployee(employee); }}
                        className="text-[#96C2DB] hover:text-gray-900 dark:hover:text-slate-200"
                        title="Edit employee"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleEmployeeStatus(employee); }}
                        className={`${employee.isActive
                            ? 'text-red-600 hover:text-red-900'
                            : 'text-green-600 hover:text-green-900'
                          }`}
                        title={employee.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {employee.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setExpandedEmployeeId(expandedEmployeeId === employee.id ? null : employee.id); }}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900"
                        title="View contact details"
                      >
                        {expandedEmployeeId === employee.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                  {expandedEmployeeId === employee.id && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 bg-gray-50 dark:bg-slate-700 border-t border-gray-100 dark:border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone Number</p>
                            <p className="text-sm text-gray-900 dark:text-slate-200">{employee.phone_number || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Personal Email</p>
                            <p className="text-sm text-gray-900 dark:text-slate-200">{employee.personal_email || 'N/A'}</p>
                          </div>
                          <div className="md:col-span-2 flex justify-end">
                            <button
                              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleOpenResetModal(employee); }}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                            >
                              <Key className="w-3 h-3 mr-1" />
                              Reset Password
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reset Password Modal */}
      {resettingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-2">Reset Password</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Set a new password for <strong>{resettingEmployee.name}</strong> ({resettingEmployee.email}).
            </p>
            <form onSubmit={handleSubmitReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  minLength={8}
                  placeholder="Min. 8 characters"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">The user will be able to log in immediately with this password.</p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseResetModal}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-4 py-2 text-sm text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
                >
                  {resetting ? 'Resetting…' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Employee Modal */}
      {(showAddModal || editingEmployee) && (
        <EmployeeModal
          employee={editingEmployee}
          onClose={() => {
            setShowAddModal(false);
            setEditingEmployee(null);
          }}
          onSave={loadEmployees}
        />
      )}

      {/* Invite Employee Modal */}
      {showInviteModal && (
        <InviteEmployeeModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={loadEmployees}
        />
      )}
    </div>
  );
};

const EmployeeModal: React.FC<{
  employee: Employee | null;
  onClose: () => void;
  onSave: () => void;
}> = ({ employee, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    employeeId: employee?.employeeId || '',
    name: employee?.name || '',
    email: employee?.email || '',
    password: '', // Manual password set by admin
    department: employee?.department || '',
    position: employee?.position || '',
    phone_number: employee?.phone_number || '',
    personal_email: employee?.personal_email || '',
    role: employee?.role || 'employee' as 'employee' | 'admin',
    isActive: employee?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('🔄 Submitting form data:', formData);

      if (employee) {
        // Update existing employee
        await userService.updateUser(employee.id, formData);
        toast.success('Employee updated successfully');
      } else {
        // Create new employee with manual password
        console.log('🔄 Creating new employee with manual password...');
        await userService.createUser(formData);
        toast.success('Employee created successfully! Account credentials have been manually set.');
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('❌ Form submission error:', error);
      const errorMessage = (error as Error).message || 'Unknown error occurred';
      toast.error(employee
        ? `Failed to update employee: ${errorMessage}`
        : `Failed to create employee: ${errorMessage}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 dark:text-slate-200 mb-4">
          {employee ? 'Edit Employee' : 'Add New Employee'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Employee ID
            </label>
            <input
              type="text"
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              className="w-full p-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#96C2DB] focus:border-[#96C2DB]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#96C2DB] focus:border-[#96C2DB]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#96C2DB] focus:border-[#96C2DB]"
              required
            />
          </div>

          {!employee && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Temporary Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#96C2DB] focus:border-[#96C2DB]"
                required
                minLength={8}
                placeholder="At least 8 characters"
              />
              <p className="text-xs text-gray-500 mt-1">
                Admin manually sets the account password. Employee can change it after first login.
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Department
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#96C2DB] focus:border-[#96C2DB]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Position
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#96C2DB] focus:border-[#96C2DB]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              className="w-full p-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#96C2DB] focus:border-[#96C2DB]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Personal Email
            </label>
            <input
              type="email"
              value={formData.personal_email}
              onChange={(e) => setFormData({ ...formData, personal_email: e.target.value })}
              className="w-full p-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#96C2DB] focus:border-[#96C2DB]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'core' | 'employee' | 'trainee' | 'intern' })}
              className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#96C2DB] focus:border-[#96C2DB]"
            >
              <option value="admin">Admin</option>
              <option value="core">Core</option>
              <option value="employee">Employee</option>
              <option value="trainee">Trainee</option>
              <option value="intern">Intern</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300 text-[#96C2DB] focus:ring-[#96C2DB] focus:border-[#96C2DB]"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
              Active Employee
            </label>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-600 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300"
            >
              {loading ? 'Saving...' : (employee ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const InviteEmployeeModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    department: '',
    position: '',
    designation: '',
    employeeId: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call Supabase Edge Function to invite employee
      const { data, error } = await supabase.functions.invoke('invite-employee', {
        body: formData
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.message);

      toast.success('Invitation sent successfully! Employee will receive an email to set up their account.');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('❌ Invitation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 dark:text-slate-200 mb-4">
          Invite New Employee
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#96C2DB]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#96C2DB]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Employee ID (Optional)
            </label>
            <input
              type="text"
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#96C2DB]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Department
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#96C2DB]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Position
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#96C2DB]"
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
              className="w-full p-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#96C2DB]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Employee ID
            </label>
            <input
              type="text"
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#96C2DB] focus:border-[#96C2DB]"
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
              className="w-full p-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#96C2DB]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full p-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#96C2DB]"
              required
            />
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Mail className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">
                  <strong>Secure Invitation:</strong> The employee will receive an email with a
                  secure link to set up their own password. No temporary passwords are generated.
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-600 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300"
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeManagement;

