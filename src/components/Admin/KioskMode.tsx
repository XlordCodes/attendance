import React, { useState, useEffect } from 'react';
import { Clock, Users, KeySquare } from 'lucide-react';
import { attendanceService } from '../../services/attendanceService';
import { employeeService } from '../../services/employeeService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const KioskMode: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeEmployees, setActiveEmployees] = useState<any[]>([]);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadActiveEmployees();
  }, []);

  const loadActiveEmployees = async () => {
    try {
      // Get all employees who are currently clocked in
      const employees = await employeeService.getAllEmployees();
      const activeList = [];
      
      for (const employee of employees) {
        const todayRecord = await attendanceService.getTodayAttendance(employee.id);
        if (todayRecord && todayRecord.clockIn && !todayRecord.clockOut) {
          activeList.push({
            ...employee,
            clockInTime: todayRecord.clockIn,
          });
        }
      }
      
      setActiveEmployees(activeList);
    } catch (error) {
      console.error('Error loading active employees:', error);
    }
  };

  const handleManualEntry = () => {
    if (!employeeId.trim()) {
      toast.error('Please enter Employee ID');
      return;
    }
    handleAttendanceAction(employeeId);
    setEmployeeId('');
    setShowManualEntry(false);
  };

  const handleAttendanceAction = async (empId: string) => {
    setLoading(true);
    try {
      const employee = await employeeService.getEmployeeByEmployeeId(empId);
      if (!employee) {
        toast.error('Employee not found');
        return;
      }

      const todayRecord = await attendanceService.getTodayAttendance(employee.id);
      
      if (!todayRecord || !todayRecord.clockIn) {
        // Clock in
        await attendanceService.clockIn(employee.id);
        toast.success(`${employee.name} clocked in successfully`);
      } else if (!todayRecord.clockOut) {
        // Clock out
        await attendanceService.clockOut(employee.id);
        toast.success(`${employee.name} clocked out successfully`);
      } else {
        toast.error(`${employee.name} has already completed attendance for today`);
      }

      await loadActiveEmployees();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Attendance action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Office Kiosk</h1>
              <p className="text-gray-600 mt-1">Quick attendance tracking</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono font-bold text-blue-600">
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <div className="text-gray-600">
                {format(currentTime, 'EEEE, MMMM d, yyyy')}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Mark Attendance</h2>
              
              <div className="space-y-4">
                <button
                  onClick={() => setShowManualEntry(true)}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
                >
                  <KeySquare className="w-5 h-5" />
                  <span>Enter Employee ID</span>
                </button>
              </div>

              {/* Quick Stats */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Currently Active</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {activeEmployees.length}
                </div>
              </div>
            </div>
          </div>

          {/* Active Employees */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Currently Logged In</h2>
              
              {activeEmployees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No employees currently logged in</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 font-medium">
                            {employee.name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{employee.name}</h3>
                          <p className="text-sm text-gray-500">{employee.employeeId}</p>
                          <p className="text-xs text-gray-400">
                            Since: {format(employee.clockInTime, 'HH:mm')}
                          </p>
                        </div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Enter Employee ID
            </h3>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="Employee ID"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleManualEntry()}
              autoFocus
            />
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => setShowManualEntry(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleManualEntry}
                disabled={loading || !employeeId.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                {loading ? 'Processing...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KioskMode;