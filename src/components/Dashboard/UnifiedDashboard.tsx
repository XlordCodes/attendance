import { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  Bell, 
  X,
  Users,
  Download,
  Search,
  XCircle,
  Settings,
  UserPlus,
  Monitor,
  CalendarPlus,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { attendanceServiceNew } from '../../services/attendanceServiceNew';
import { userService } from '../../services/userService';
import { meetingService } from '../../services/meetingService';
import { notificationService } from '../../services/notificationService';
import { Meeting, Notification, Employee } from '../../types';
import { format, startOfWeek, endOfWeek, isToday, isFuture } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import EmployeeDashboardNew from './EmployeeDashboardNew';
import AttendanceLogsNew from '../Attendance/AttendanceLogsNew';

interface AdminStats {
  totalEmployees: number;
  presentToday: number;
  totalHoursToday: number;
  avgAttendanceRate: number;
  lateEmployees: number;
  absentEmployees: number;
}

interface RecentActivity {
  id: string;
  type: 'clock-in' | 'clock-out' | 'late' | 'absent';
  employee: string;
  time: Date;
  message: string;
}

const UnifiedDashboard: React.FC = () => {
  const { employee } = useAuth();
  const navigate = useNavigate();
  const isAdmin = employee?.role?.toLowerCase() === 'admin';

  // Employee Dashboard State
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({
    totalHours: 0,
    daysPresent: 0,
    averageHours: 0,
    overtimeHours: 0,
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<GeolocationData | null>(null);
  const [earlyLogoutReason, setEarlyLogoutReason] = useState('');
  const [showEarlyLogoutModal, setShowEarlyLogoutModal] = useState(false);

  // Admin Dashboard State
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalEmployees: 0,
    presentToday: 0,
    totalHoursToday: 0,
    avgAttendanceRate: 0,
    lateEmployees: 0,
    absentEmployees: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'employee' | 'admin'>('employee');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (employee) {
      loadEmployeeData();
      if (isAdmin) {
        loadAdminData();
      }
      getCurrentLocation();
    }
  }, [employee, isAdmin]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(),
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  // Employee Functions
  const loadEmployeeData = async () => {
    if (!employee) return;
    
    try {
      // Load employee-specific data
      await Promise.all([
        loadTodayRecord(),
        loadWeeklyStats(),
        loadMeetings(),
        loadNotifications()
      ]);
    } catch (error) {
      console.error('Error loading employee data:', error);
    }
  };

  const loadTodayRecord = async () => {
    if (!employee) return;
    
    try {
      const record = await attendanceServiceSubcollection.getTodayAttendance(employee.id);
      setTodayRecord(record);
    } catch (error) {
      console.error('Error loading today record:', error);
    }
  };

  const loadWeeklyStats = async () => {
    if (!employee) return;
    
    try {
      const records = await attendanceServiceSubcollection.getAttendanceHistory(employee.id, 7);
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      
      const weeklyRecords = records.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= weekStart && recordDate <= weekEnd;
      });

      const stats = weeklyRecords.reduce(
        (acc, record) => ({
          totalHours: acc.totalHours + record.totalHours,
          daysPresent: acc.daysPresent + (record.status === 'present' || record.status === 'late' ? 1 : 0),
          overtimeHours: acc.overtimeHours + record.overtime,
        }),
        { totalHours: 0, daysPresent: 0, overtimeHours: 0 }
      );

      setWeeklyStats({
        ...stats,
        averageHours: stats.daysPresent > 0 ? stats.totalHours / stats.daysPresent : 0,
      });
    } catch (error) {
      console.error('Error loading weekly stats:', error);
    }
  };

  const loadMeetings = async () => {
    if (!employee) return;
    
    try {
      const employeeMeetings = await meetingService.getMeetingsForEmployee(employee.id);
      const upcomingMeetings = employeeMeetings.filter(meeting => {
        const meetingDate = parseISO(meeting.date);
        return isFuture(meetingDate) || isToday(meetingDate);
      });
      setMeetings(upcomingMeetings);
    } catch (error) {
      console.error('Error loading meetings:', error);
    }
  };

  const loadNotifications = async () => {
    if (!employee) return;
    
    try {
      const employeeNotifications = await notificationService.getNotificationsForEmployee(employee.id, 10);
      setNotifications(employeeNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Admin Functions
  const loadAdminData = async () => {
    if (!isAdmin) return;
    
    try {
      await Promise.all([
        loadAdminStats(),
        loadAllEmployees(),
        loadRecentActivity()
      ]);
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const loadAdminStats = async () => {
    try {
      const employees = await userService.getAllUsers();
      const totalEmployees = employees.length;
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayRecords = await attendanceServiceSubcollection.getAllAttendanceRecords(today, today);
      
      const presentToday = todayRecords.filter(r => r.status === 'present').length;
      const lateEmployees = todayRecords.filter(r => r.status === 'late').length;
      const absentEmployees = totalEmployees - todayRecords.length;
      const totalHoursToday = todayRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
      const avgAttendanceRate = totalEmployees > 0 ? (presentToday + lateEmployees) / totalEmployees * 100 : 0;

      setAdminStats({
        totalEmployees,
        presentToday,
        totalHoursToday: Math.round(totalHoursToday * 100) / 100,
        avgAttendanceRate: Math.round(avgAttendanceRate * 100) / 100,
        lateEmployees,
        absentEmployees,
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
    }
  };

  const loadAllEmployees = async () => {
    try {
      const employees = await userService.getAllUsers();
      setAllEmployees(employees);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayRecords = await attendanceServiceSubcollection.getAllAttendanceRecords(today, today);
      
      const activities: RecentActivity[] = todayRecords
        .filter(record => record.clockIn)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map(record => ({
          id: record.id || record.date,
          type: record.status === 'late' ? 'late' : 'clock-in',
          employee: record.userName || 'Unknown',
          time: new Date(record.clockIn!),
          message: record.status === 'late' 
            ? `${record.userName} clocked in late`
            : `${record.userName} clocked in`
        }));

      setRecentActivity(activities);
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  // Clock In/Out Functions
  const handleClockIn = async () => {
    if (!employee) return;

    setLoading(true);
    try {
      const record = await attendanceServiceSubcollection.clockIn(
        employee.id,
        location || undefined
      );
      setTodayRecord(record);
      toast.success('Started attendance successfully!');
      loadWeeklyStats();
      if (isAdmin) {
        loadAdminStats();
        loadRecentActivity();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!employee || !todayRecord) return;

    const now = new Date();
    const clockInTime = todayRecord.clockIn!;
    const hoursWorked = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

    if (now.getHours() < 18 || hoursWorked < 8) {
      setShowEarlyLogoutModal(true);
      return;
    }

    await performClockOut();
  };

  const performClockOut = async (reason?: string) => {
    if (!employee) return;

    setLoading(true);
    try {
      const record = await attendanceServiceSubcollection.clockOut(employee.id, reason);
      setTodayRecord(record);
      setShowEarlyLogoutModal(false);
      setEarlyLogoutReason('');
      toast.success('Ended attendance successfully!');
      loadWeeklyStats();
      if (isAdmin) {
        loadAdminStats();
        loadRecentActivity();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to end attendance');
    } finally {
      setLoading(false);
    }
  };

  const isClockInDisabled = () => {
    return !!(todayRecord?.clockIn && !todayRecord?.clockOut);
  };

  const isClockOutDisabled = () => {
    return !todayRecord?.clockIn || !!todayRecord?.clockOut;
  };

  // Navigation Functions
  const navigateToPage = (path: string) => {
    navigate(path);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'late':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (time: Date | undefined) => {
    if (!time) return '--:--';
    return format(time, 'HH:mm');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isAdmin ? 'Admin Dashboard' : 'Employee Dashboard'}
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {employee?.name}! 
                {isAdmin && ' You have admin privileges.'}
              </p>
            </div>
            
            {/* Tab Switcher for Admin */}
            {isAdmin && (
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('employee')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'employee'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  My Attendance
                </button>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'admin'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Admin Overview
                </button>
              </div>
            )}
            
            <div className="text-right">
              <div className="text-2xl font-mono text-gray-900">
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <div className="text-sm text-gray-500">
                {format(currentTime, 'EEEE, MMMM d, yyyy')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Employee View (Always visible, but primary for non-admins) */}
        {(!isAdmin || activeTab === 'employee') && (
          <EmployeeDashboardNew />
        )}

        {/* Admin View (Only for admins) */}
        {isAdmin && activeTab === 'admin' && (
          <AttendanceLogsNew />
        )}
          <div className="space-y-8">
            {/* Admin Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Employees</p>
                    <p className="text-2xl font-bold text-gray-900">{adminStats.totalEmployees}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Present Today</p>
                    <p className="text-2xl font-bold text-gray-900">{adminStats.presentToday}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <AlertCircle className="w-8 h-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Late Today</p>
                    <p className="text-2xl font-bold text-gray-900">{adminStats.lateEmployees}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <XCircle className="w-8 h-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Absent Today</p>
                    <p className="text-2xl font-bold text-gray-900">{adminStats.absentEmployees}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Hours</p>
                    <p className="text-2xl font-bold text-gray-900">{adminStats.totalHoursToday}h</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <TrendingUp className="w-8 h-8 text-indigo-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{adminStats.avgAttendanceRate}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-gray-600" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <button
                  onClick={() => navigateToPage('/employees')}
                  className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <UserPlus className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium text-blue-900">Manage Employees</span>
                </button>

                <button
                  onClick={() => navigateToPage('/admin-attendance')}
                  className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <BarChart3 className="w-8 h-8 text-green-600 mb-2" />
                  <span className="text-sm font-medium text-green-900">Attendance Reports</span>
                </button>

                <button
                  onClick={() => {
                    const kioskUrl = `${window.location.origin}/kiosk`;
                    window.open(kioskUrl, '_blank');
                  }}
                  className="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  <Monitor className="w-8 h-8 text-purple-600 mb-2" />
                  <span className="text-sm font-medium text-purple-900">Kiosk Mode</span>
                </button>

                <button
                  onClick={() => navigateToPage('/assign-meeting')}
                  className="flex flex-col items-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                >
                  <CalendarPlus className="w-8 h-8 text-orange-600 mb-2" />
                  <span className="text-sm font-medium text-orange-900">Assign Meeting</span>
                </button>

                <button
                  onClick={() => {
                    const today = format(new Date(), 'yyyy-MM-dd');
                    const csvData = `Date,Employee,Clock In,Clock Out,Hours\n${adminStats.totalEmployees} employees data for ${today}`;
                    const blob = new Blob([csvData], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.setAttribute('hidden', '');
                    a.setAttribute('href', url);
                    a.setAttribute('download', `attendance-${today}.csv`);
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    toast.success('Attendance report downloaded');
                  }}
                  className="flex flex-col items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Download className="w-8 h-8 text-gray-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Export Data</span>
                </button>

                <button
                  onClick={() => navigateToPage('/setup')}
                  className="flex flex-col items-center p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <Settings className="w-8 h-8 text-red-600 mb-2" />
                  <span className="text-sm font-medium text-red-900">System Setup</span>
                </button>
              </div>
            </div>

            {/* Recent Activity and Employee List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-gray-600" />
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          {getStatusIcon(activity.type)}
                          <div className="ml-3">
                            <p className="font-medium text-gray-900">{activity.employee}</p>
                            <p className="text-sm text-gray-600">{activity.message}</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(activity.time, 'HH:mm')}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No recent activity</p>
                  )}
                </div>
              </div>

              {/* Employee Status */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-gray-600" />
                    Employee Status
                  </h3>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {allEmployees
                    .filter(emp => 
                      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      emp.email.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((emp) => (
                      <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-700">
                              {emp.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="font-medium text-gray-900">{emp.name}</p>
                            <p className="text-sm text-gray-600">{emp.department}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            emp.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {emp.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Early Logout Modal */}
      {showEarlyLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Early Logout</h3>
              <button
                onClick={() => setShowEarlyLogoutModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              You're leaving before the standard work hours. Please provide a reason:
            </p>
            <textarea
              value={earlyLogoutReason}
              onChange={(e) => setEarlyLogoutReason(e.target.value)}
              placeholder="Reason for early logout..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none"
              rows={3}
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowEarlyLogoutModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => performClockOut(earlyLogoutReason)}
                disabled={!earlyLogoutReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300"
              >
                Confirm Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedDashboard;
