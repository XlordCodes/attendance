import { useState, useEffect } from 'react';
import { Clock, Calendar, MapPin, Coffee, TrendingUp, CheckCircle, AlertCircle, Activity, Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { attendanceService } from '../../services/attendanceService';
import { AttendanceRecord } from '../../types';
import { format, startOfWeek, endOfWeek, isToday } from 'date-fns';

const EmployeeDashboard: React.FC = () => {
  const { employee } = useAuth();
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [weeklyStats, setWeeklyStats] = useState({
    totalHours: 0,
    daysPresent: 0,
    averageHours: 0,
    overtimeHours: 0,
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (employee) {
      loadTodayRecord();
      loadWeeklyStats();
    }
  }, [employee]);

  const loadTodayRecord = async () => {
    if (!employee) return;
    
    try {
      const record = await attendanceService.getTodayAttendance(employee.id);
      setTodayRecord(record);
    } catch (error) {
      console.error('Error loading today record:', error);
    }
  };

  const loadWeeklyStats = async () => {
    if (!employee) return;
    
    try {
      const records = await attendanceService.getAttendanceHistory(employee.id, 7);
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
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl">
                {employee?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {employee?.name?.split(' ')[0]}!
              </h1>
              <p className="text-lg text-gray-600 capitalize flex items-center space-x-2 mt-1">
                <span>{employee?.role}</span>
                <span>•</span>
                <span className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  Online
                </span>
                <span>•</span>
                <span>{format(currentTime, 'EEEE, MMMM d, yyyy')}</span>
              </p>
            </div>
          </div>
          
          {/* Notifications */}
          <div className="flex items-center space-x-3">
            <button className="relative p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                <span className="w-2 h-2 bg-white rounded-full"></span>
              </span>
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
          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-md">
                    <Clock className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">Clock In/Out</div>
                    <div className="text-xs text-gray-600">Mark your attendance</div>
                  </div>
                </div>
              </button>
              
              <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-100 rounded-md">
                    <Coffee className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">Break Time</div>
                    <div className="text-xs text-gray-600">Start/end your break</div>
                  </div>
                </div>
              </button>
              
              <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-md">
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">Work From Home</div>
                    <div className="text-xs text-gray-600">Request WFH approval</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">Clocked in on time</p>
                  <p className="text-xs text-gray-500">Today at 9:00 AM</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">Completed 8.2 hours</p>
                  <p className="text-xs text-gray-500">Yesterday</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">WFH request approved</p>
                  <p className="text-xs text-gray-500">2 days ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">Break time: 1.2 hours</p>
                  <p className="text-xs text-gray-500">3 days ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Upcoming Events</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
              <div className="w-3 h-12 bg-blue-500 rounded-md"></div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">Team Meeting</p>
                <p className="text-xs text-gray-500">Tomorrow, 10:00 AM - 11:00 AM</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
              <div className="w-3 h-12 bg-green-500 rounded-md"></div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">Project Review</p>
                <p className="text-xs text-gray-500">Friday, 2:00 PM - 3:00 PM</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
              <div className="w-3 h-12 bg-purple-500 rounded-md"></div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">Training Session</p>
                <p className="text-xs text-gray-500">Next Monday, 9:00 AM - 12:00 PM</p>
              </div>
            </div>
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
    </div>
  );
};

export default EmployeeDashboard;