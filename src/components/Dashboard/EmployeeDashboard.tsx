import { useState, useEffect } from 'react';
import { Clock, Calendar, TrendingUp, CheckCircle, AlertCircle, Activity, Bell, MapPin, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { attendanceService } from '../../services/attendanceService';
import { meetingService } from '../../services/meetingService';
import { notificationService } from '../../services/notificationService';
import { AttendanceRecord, GeolocationData, Meeting, Notification } from '../../types';
import { format, startOfWeek, endOfWeek, parseISO, isToday, isFuture } from 'date-fns';
import toast from 'react-hot-toast';

const EmployeeDashboard: React.FC = () => {
  const { employee } = useAuth();
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
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (employee) {
      loadTodayRecord();
      loadWeeklyStats();
      loadMeetings();
      loadNotifications();
      getCurrentLocation();
    }
  }, [employee]);

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

  const handleClockIn = async () => {
    if (!employee) return;

    setLoading(true);
    try {
      const record = await attendanceService.clockIn(
        employee.id,
        location || undefined
      );
      setTodayRecord(record);
      toast.success('Started attendance successfully!');
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

    // Check if leaving early (before 6 PM or less than 8 hours)
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
      const record = await attendanceService.clockOut(employee.id, reason);
      setTodayRecord(record);
      setShowEarlyLogoutModal(false);
      setEarlyLogoutReason('');
      toast.success('Ended attendance successfully!');
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

  const loadTodayRecord = async () => {
    if (!employee) return;
    
    try {
      console.log('Loading today record for employee:', employee.id);
      const record = await attendanceService.getTodayAttendance(employee.id);
      console.log('Today record loaded:', record);
      setTodayRecord(record);
    } catch (error) {
      console.error('Error loading today record:', error);
      toast.error('Failed to load today\'s attendance record');
    }
  };

  const loadWeeklyStats = async () => {
    if (!employee) return;
    
    try {
      console.log('Loading weekly stats for employee:', employee.id);
      const records = await attendanceService.getAttendanceHistory(employee.id, 7);
      console.log('Weekly attendance records:', records);
      
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      
      const weeklyRecords = records.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= weekStart && recordDate <= weekEnd;
      });
      console.log('Filtered weekly records:', weeklyRecords);

      const stats = weeklyRecords.reduce(
        (acc, record) => ({
          totalHours: acc.totalHours + record.totalHours,
          daysPresent: acc.daysPresent + (record.status === 'present' || record.status === 'late' ? 1 : 0),
          overtimeHours: acc.overtimeHours + record.overtime,
        }),
        { totalHours: 0, daysPresent: 0, overtimeHours: 0 }
      );

      const finalStats = {
        ...stats,
        averageHours: stats.daysPresent > 0 ? stats.totalHours / stats.daysPresent : 0,
      };
      
      console.log('Weekly stats calculated:', finalStats);
      setWeeklyStats(finalStats);
    } catch (error) {
      console.error('Error loading weekly stats:', error);
      toast.error('Failed to load weekly statistics');
    }
  };

  const loadMeetings = async () => {
    if (!employee) return;
    
    try {
      const employeeMeetings = await meetingService.getMeetingsForEmployee(employee.id);
      // Filter to show upcoming meetings only
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
      console.log('Loading notifications for employee:', employee.id);
      const employeeNotifications = await notificationService.getNotificationsForEmployee(employee.id, 10);
      console.log('Notifications loaded:', employeeNotifications);
      setNotifications(employeeNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Don't show error toast for notifications as it's not critical
    }
  };

  const getWorkingHoursToday = () => {
    if (!todayRecord?.clockIn) return 0;
    
    const endTime = todayRecord.clockOut || currentTime;
    const startTime = todayRecord.clockIn;
    
    return Math.max(0, (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'absent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-3 h-3 mr-1" />;
      case 'late': return <AlertCircle className="w-3 h-3 mr-1" />;
      case 'absent': return <AlertCircle className="w-3 h-3 mr-1" />;
      default: return <Clock className="w-3 h-3 mr-1" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {employee?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Welcome back, {employee?.name?.split(' ')[0]}
              </h1>
              <p className="text-sm text-gray-600 flex items-center space-x-2 mt-0.5">
                <span>{employee?.role}</span>
                <span>•</span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  Online
                </span>
                <span>•</span>
                <span>{format(currentTime, 'MMM d, yyyy')}</span>
              </p>
            </div>
          </div>
          
          {/* Notifications */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Today's Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gray-100 rounded-md">
              <Clock className="w-6 h-6 text-gray-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">TODAY</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">Clock In</p>
            <p className="text-2xl font-bold text-gray-900">
              {todayRecord?.clockIn ? format(todayRecord.clockIn, 'HH:mm') : '--:--'}
            </p>
            <p className="text-xs text-gray-500">
              {todayRecord?.clockIn ? 'On time' : 'Not clocked in yet'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gray-100 rounded-md">
              <Clock className="w-6 h-6 text-gray-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">TODAY</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">Clock Out</p>
            <p className="text-2xl font-bold text-gray-900">
              {todayRecord?.clockOut ? format(todayRecord.clockOut, 'HH:mm') : '--:--'}
            </p>
            <p className="text-xs text-gray-500">
              {todayRecord?.clockOut ? 'Completed' : 'Still working'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gray-100 rounded-md">
              <TrendingUp className="w-6 h-6 text-gray-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">TODAY</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">Hours Worked</p>
            <p className="text-2xl font-bold text-gray-900">
              {getWorkingHoursToday().toFixed(1)}h
            </p>
            <p className="text-xs text-gray-500">
              {8 - getWorkingHoursToday() > 0 
                ? `${(8 - getWorkingHoursToday()).toFixed(1)}h remaining` 
                : `${(getWorkingHoursToday() - 8).toFixed(1)}h overtime`}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gray-100 rounded-md">
              <Activity className="w-6 h-6 text-gray-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">STATUS</span>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">Today's Status</p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
              todayRecord ? getStatusColor(todayRecord.status) : 'bg-gray-100 text-gray-800'
            }`}>
              {todayRecord ? getStatusIcon(todayRecord.status) : <Clock className="w-4 h-4 mr-1" />}
              {todayRecord?.status ? todayRecord.status.charAt(0).toUpperCase() + todayRecord.status.slice(1) : 'Not Started'}
            </span>
            <p className="text-xs text-gray-500">
              {todayRecord ? 'Active day' : 'Start your day'}
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Weekly Overview - Takes 2 columns */}
        <div className="xl:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">This Week's Performance</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>Week {format(new Date(), 'w')}, {format(new Date(), 'yyyy')}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="text-center">
              <div className="p-4 bg-gray-50 rounded-lg mb-3">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {weeklyStats.totalHours.toFixed(1)}h
                </div>
                <div className="text-sm font-medium text-gray-600">Total Hours</div>
              </div>
              <div className="text-xs text-gray-500">
                Target: 40h • {((weeklyStats.totalHours / 40) * 100).toFixed(0)}% complete
              </div>
            </div>
            
            <div className="text-center">
              <div className="p-4 bg-gray-50 rounded-lg mb-3">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {weeklyStats.daysPresent}
                </div>
                <div className="text-sm font-medium text-gray-600">Days Present</div>
              </div>
              <div className="text-xs text-gray-500">
                Out of 5 working days
              </div>
            </div>
            
            <div className="text-center">
              <div className="p-4 bg-gray-50 rounded-lg mb-3">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {weeklyStats.averageHours.toFixed(1)}h
                </div>
                <div className="text-sm font-medium text-gray-600">Avg Hours/Day</div>
              </div>
              <div className="text-xs text-gray-500">
                Target: 8h daily
              </div>
            </div>
            
            <div className="text-center">
              <div className="p-4 bg-gray-50 rounded-lg mb-3">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {weeklyStats.overtimeHours.toFixed(1)}h
                </div>
                <div className="text-sm font-medium text-gray-600">Overtime</div>
              </div>
              <div className="text-xs text-gray-500">
                Additional hours worked
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Weekly Progress</span>
              <span className="font-medium text-gray-900">
                {weeklyStats.totalHours.toFixed(1)}h / 40h
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gray-900 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min((weeklyStats.totalHours / 40) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="space-y-6">
          {/* Clock In/Out Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Clock In/Out</h3>
            
            {/* Large Time Display */}
            <div className="text-center mb-6">
              <div className="text-3xl font-mono font-bold text-gray-900 mb-2">
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <div className="text-sm text-gray-600">
                {format(currentTime, 'EEEE, MMMM d')}
              </div>
            </div>

            {/* Location Status */}
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  {location ? (
                    <>
                      <MapPin className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-gray-700">Location detected</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span className="text-xs text-gray-700">Location not available</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Current Status */}
            {todayRecord && (
              <div className="mb-6 p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2 text-sm">Today's Status</h4>
                <div className="space-y-1 text-xs text-blue-800">
                  {todayRecord.clockIn && (
                    <p>Clock In: {format(todayRecord.clockIn, 'HH:mm:ss')}</p>
                  )}
                  {todayRecord.clockOut && (
                    <p>Clock Out: {format(todayRecord.clockOut, 'HH:mm:ss')}</p>
                  )}
                  {todayRecord.clockIn && !todayRecord.clockOut && (
                    <p>Working Time: {Math.floor((currentTime.getTime() - todayRecord.clockIn.getTime()) / (1000 * 60 * 60))}h {Math.floor(((currentTime.getTime() - todayRecord.clockIn.getTime()) % (1000 * 60 * 60)) / (1000 * 60))}m</p>
                  )}
                </div>
              </div>
            )}

            {/* Clock In/Out Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleClockIn}
                disabled={loading || isClockInDisabled()}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                <Clock className="w-4 h-4" />
                <span>Clock In</span>
              </button>

              <button
                onClick={handleClockOut}
                disabled={loading || isClockOutDisabled()}
                className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                <Clock className="w-4 h-4" />
                <span>Clock Out</span>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-5 lg:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full mt-1.5 sm:mt-2"></div>
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-gray-900">Clocked in on time</p>
                  <p className="text-xs text-gray-500">Today at {todayRecord?.clockIn ? format(todayRecord.clockIn, 'h:mm a') : '9:00 AM'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full mt-1.5 sm:mt-2"></div>
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-gray-900">Working for {getWorkingHoursToday().toFixed(1)} hours</p>
                  <p className="text-xs text-gray-500">Current session</p>
                </div>
              </div>
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full mt-1.5 sm:mt-2"></div>
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-gray-900">Week progress: {weeklyStats.totalHours.toFixed(1)}h</p>
                  <p className="text-xs text-gray-500">Out of 40h target</p>
                </div>
              </div>
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-500 rounded-full mt-1.5 sm:mt-2"></div>
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-gray-900">Attendance: {weeklyStats.daysPresent} days this week</p>
                  <p className="text-xs text-gray-500">{5 - weeklyStats.daysPresent} days remaining</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-5 lg:p-6">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Upcoming Events</h3>
          <div className="space-y-3">
            {meetings.length > 0 ? (
              meetings.slice(0, 3).map((meeting) => (
                <div key={meeting.id} className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 rounded-md">
                  <div className="w-2 sm:w-3 h-8 sm:h-10 bg-blue-500 rounded-sm"></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-xs sm:text-sm">{meeting.title}</p>
                    <p className="text-xs text-gray-500">{format(new Date(meeting.date), 'MMM d')} at {meeting.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 rounded-md">
                  <div className="w-2 sm:w-3 h-8 sm:h-10 bg-blue-500 rounded-sm"></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-xs sm:text-sm">Team Meeting</p>
                    <p className="text-xs text-gray-500">Weekly sync-up</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 rounded-md">
                  <div className="w-2 sm:w-3 h-8 sm:h-10 bg-green-500 rounded-sm"></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-xs sm:text-sm">Project Review</p>
                    <p className="text-xs text-gray-500">Monthly evaluation</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 rounded-md">
                  <div className="w-2 sm:w-3 h-8 sm:h-10 bg-purple-500 rounded-sm"></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-xs sm:text-sm">Training Session</p>
                    <p className="text-xs text-gray-500">Skill development</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Insights</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Perfect Attendance</span>
              </div>
              <span className="text-xs text-green-600 font-medium">This Week</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Above Average Hours</span>
              </div>
              <span className="text-xs text-blue-600 font-medium">+2.3h</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-md">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Consistent Schedule</span>
              </div>
              <span className="text-xs text-yellow-600 font-medium">95% On-time</span>
            </div>
          </div>
        </div>
      </div>

      {/* Early Logout Modal */}
      {showEarlyLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Early Logout Reason
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              You're leaving before your standard work hours. Please provide a reason:
            </p>
            <textarea
              value={earlyLogoutReason}
              onChange={(e) => setEarlyLogoutReason(e.target.value)}
              placeholder="Enter reason for early logout..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => setShowEarlyLogoutModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => performClockOut(earlyLogoutReason)}
                disabled={!earlyLogoutReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300"
              >
                Clock Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Overlay */}
      {showNotifications && (
        <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 w-80 z-40">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Notifications</h3>
            <button
              onClick={() => setShowNotifications(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div key={notification.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    notification.priority === 'high' ? 'bg-red-500' :
                    notification.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className={`text-sm ${notification.isRead ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(notification.createdAt, 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No notifications</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;