import { useState, useEffect, useCallback } from 'react';
import { Clock, Calendar, TrendingUp, Bell, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { globalAttendanceService } from '../../services/globalAttendanceService';
import { meetingService } from '../../services/meetingService';
import { notificationService } from '../../services/notificationService';
import { Meeting, Notification, AttendanceRecord } from '../../types';
import { format, startOfWeek, endOfWeek, isToday } from 'date-fns';
import toast from 'react-hot-toast';
import ClockInOutNew from '../Employee/ClockInOutNew';

const EmployeeDashboardNew: React.FC = () => {
  console.log('🔄 EmployeeDashboardNew rendering...');
  const { employee, user } = useAuth();
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({
    totalHours: 0,
    daysPresent: 0,
    averageHours: 0,
    totalBreaks: 0,
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug employee data
  useEffect(() => {
    console.log('🔍 EmployeeDashboardNew mounted');
    console.log('👤 User:', user ? 'Present' : 'Not present');
    console.log('👨‍💼 Employee:', employee ? 'Present' : 'Not present');
    if (employee) {
      console.log('✅ Employee data:', employee);
      console.log('✅ Employee name field:', employee.name);
      console.log('✅ All employee fields:', Object.keys(employee));
    } else {
      console.log('❌ No employee data');
    }
  }, [employee, user]);

  // Helper function to get display name from employee data
  const getEmployeeName = useCallback(() => {
    if (!employee) return 'User';
    
    // Safely get employee name with fallbacks
    return employee.name || 
           employee.Name || // Alternative field name
           employee.email?.split('@')[0] || 
           'User';
  }, [employee]);

  // Helper function to get employee designation/role
  const getEmployeeDesignation = useCallback(() => {
    if (!employee) return 'Employee';
    
    // Safely get employee designation with fallbacks (check both cases)
    const designation = (employee as any).Designation || // Firestore field (capital D)
                       employee.designation ||          // lowercase field
                       employee.position || 
                       employee.role || 
                       'Employee';
    
    console.log('🏷️ Employee designation data:', {
      Designation: (employee as any).Designation,
      designation: employee.designation,
      position: employee.position,
      role: employee.role,
      selected: designation
    });
    
    return designation;
  }, [employee]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadTodayRecord = useCallback(async () => {
    if (!employee || !user) return;
    
    try {
      console.log('📋 Loading today record for:', getEmployeeName());
      console.log('📋 Using user ID:', employee.id); // Use employee.id instead of user.uid
      const record = await globalAttendanceService.getTodayAttendance(employee.id);
      console.log('✅ Today record loaded:', record);
      setTodayRecord(record);
    } catch (error) {
      console.error('❌ Error loading today record:', error);
      // Don't throw, just log the error
    }
  }, [employee, user]);

  const loadWeeklyStats = useCallback(async () => {
    if (!employee || !user) return;

    try {
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());

      const weeklyRecords = await globalAttendanceService.getAttendanceRange(
        employee.id, // Use employee.id instead of user.uid
        weekStart,
        weekEnd
      );

      const totalHours = weeklyRecords.reduce((sum, record) => sum + (record.hoursWorked || 0), 0);
      const daysPresent = weeklyRecords.filter(record => record.clockIn).length;
      const totalBreaks = weeklyRecords.reduce((sum, record) => sum + record.breaks.length, 0);

      setWeeklyStats({
        totalHours,
        daysPresent,
        averageHours: daysPresent > 0 ? totalHours / daysPresent : 0,
        totalBreaks
      });
    } catch (error) {
      console.error('Error loading weekly stats:', error);
    }
  }, [employee, user]);

  const loadMeetings = useCallback(async () => {
    if (!employee) return;

    try {
      const allMeetings = await meetingService.getMeetingsForEmployee(employee.id);
      // Filter for today and future meetings
      const upcomingMeetings = allMeetings.filter(meeting => {
        const meetingDate = new Date(meeting.date); // Meeting.date is in YYYY-MM-DD format
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time for comparison
        return meetingDate >= today;
      });
      // Sort by date and take next 5 meetings
      upcomingMeetings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setMeetings(upcomingMeetings.slice(0, 5));
    } catch (error) {
      console.error('Error loading meetings:', error);
    }
  }, [employee]);

  const loadNotifications = useCallback(async () => {
    if (!employee) return;

    try {
      const userNotifications = await notificationService.getAllNotifications();
      setNotifications(userNotifications.slice(0, 10)); // Show latest 10 notifications
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [employee]);

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      await Promise.all(
        unreadNotifications.map(notification => 
          notificationService.markAsRead(notification.id)
        )
      );
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Failed to clear notifications');
    }
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  // Load all dashboard data when employee and user are available
  useEffect(() => {
    if (employee && user) {
      console.log('🚀 Loading dashboard data...');
      setLoading(true);
      setError(null);
      
      Promise.all([
        loadTodayRecord(),
        loadWeeklyStats(),
        loadMeetings(),
        loadNotifications()
      ]).then(() => {
        console.log('✅ Dashboard data loaded successfully');
        setLoading(false);
      }).catch((err) => {
        console.error('❌ Error loading dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
        setLoading(false);
      });
      
      // Set up an interval to refresh data every 30 seconds
      const refreshInterval = setInterval(() => {
        loadTodayRecord();
        loadWeeklyStats();
      }, 30000);
      
      return () => clearInterval(refreshInterval);
    }
  }, [employee, user]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // No employee data
  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">👤</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No User Data</h2>
          <p className="text-gray-600">Please log in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-sm text-white p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Welcome back, {getEmployeeName()}!
            </h1>
            <p className="text-blue-100">
              {format(currentTime, 'EEEE, MMMM d, yyyy')} • {employee?.role || 'Employee'} • {getEmployeeDesignation()}
            </p>
            <p className="text-blue-100 text-sm mt-1">
              {employee?.department}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="bg-white/20 hover:bg-white/30 p-3 rounded-lg transition-colors relative"
            >
              <Bell className="h-6 w-6" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Dropdown - positioned at top right of main content */}
      {showNotifications && (
        <div className="fixed top-20 right-8 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadNotificationsCount > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => markNotificationAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`mt-1 h-2 w-2 rounded-full ${
                      notification.type === 'overtime' ? 'bg-yellow-400' :
                      notification.type === 'early_logout' ? 'bg-red-400' :
                      'bg-blue-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(notification.createdAt), 'MMM d, HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(weeklyStats.totalHours)}</p>
              <p className="text-xs text-gray-500">Total hours worked</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Days Present</p>
              <p className="text-2xl font-bold text-gray-900">{weeklyStats.daysPresent}</p>
              <p className="text-xs text-gray-500">This week</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Daily Average</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(weeklyStats.averageHours)}</p>
              <p className="text-xs text-gray-500">Hours per day</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clock In/Out Section */}
        <div className="space-y-6">
          <ClockInOutNew onAttendanceChange={loadTodayRecord} />
        </div>

        {/* Today's Status & Upcoming Meetings */}
        <div className="space-y-6">
          {/* Today's Status */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Status</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  !todayRecord?.clockIn 
                    ? 'text-gray-600 bg-gray-100' 
                    : todayRecord?.isLate 
                      ? 'text-yellow-600 bg-yellow-100'
                      : 'text-green-600 bg-green-100'
                }`}>
                  {!todayRecord?.clockIn 
                    ? 'Not clocked in' 
                    : todayRecord?.isLate 
                      ? 'Late arrival'
                      : 'On time'
                  }
                </span>
              </div>

              {todayRecord?.clockIn && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Clock in time</span>
                    <span className="text-sm font-medium">
                      {format(todayRecord.clockIn, 'HH:mm')}
                    </span>
                  </div>

                  {todayRecord.clockOut && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Clock out time</span>
                      <span className="text-sm font-medium">
                        {format(todayRecord.clockOut, 'HH:mm')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Hours worked</span>
                    <span className="text-sm font-medium">
                      {formatDuration(todayRecord.hoursWorked || 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Breaks taken</span>
                    <span className="text-sm font-medium">
                      {todayRecord.breaks.length}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Upcoming Meetings */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Meetings</h3>
            
            {meetings.length > 0 ? (
              <div className="space-y-3">
                {meetings.map((meeting) => {
                  const meetingDate = new Date(meeting.date); // Meeting.date is in YYYY-MM-DD format
                  
                  if (isNaN(meetingDate.getTime())) {
                    console.error('Invalid meeting date format:', meeting.date);
                    return null;
                  }
                  
                  // Create time object for the meeting
                  const [hours, minutes] = meeting.time.split(':').map(Number);
                  const meetingTime = new Date(meetingDate);
                  meetingTime.setHours(hours, minutes, 0, 0);
                  
                  return (
                    <div key={meeting.id} className="border-l-4 border-blue-500 pl-3 py-2">
                      <h4 className="font-medium text-gray-900">{meeting.title}</h4>
                      <p className="text-sm text-gray-600">{meeting.description}</p>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {isToday(meetingDate) ? 'Today' : format(meetingDate, 'MMM d')} at {format(meetingTime, 'HH:mm')}
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No upcoming meetings</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboardNew;
