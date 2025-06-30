import React, { useState, useEffect } from 'react';
import { Clock, Calendar, MapPin, Coffee, TrendingUp } from 'lucide-react';
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

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {employee?.name}!
        </h1>
        <p className="text-blue-100">
          {format(currentTime, 'EEEE, MMMM d, yyyy')} • {format(currentTime, 'HH:mm:ss')}
        </p>
      </div>

      {/* Today's Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Clock In</p>
              <p className="text-xl font-semibold text-gray-900">
                {todayRecord?.clockIn ? format(todayRecord.clockIn, 'HH:mm') : '--:--'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Clock Out</p>
              <p className="text-xl font-semibold text-gray-900">
                {todayRecord?.clockOut ? format(todayRecord.clockOut, 'HH:mm') : '--:--'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Hours Today</p>
              <p className="text-xl font-semibold text-gray-900">
                {getWorkingHoursToday().toFixed(1)}h
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Status</p>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                todayRecord ? getStatusColor(todayRecord.status) : 'bg-gray-100 text-gray-800'
              }`}>
                {todayRecord?.status || 'Not Started'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Overview */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">This Week's Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{weeklyStats.totalHours.toFixed(1)}h</div>
            <div className="text-sm text-gray-600">Total Hours</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{weeklyStats.daysPresent}</div>
            <div className="text-sm text-gray-600">Days Present</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{weeklyStats.averageHours.toFixed(1)}h</div>
            <div className="text-sm text-gray-600">Avg Hours/Day</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{weeklyStats.overtimeHours.toFixed(1)}h</div>
            <div className="text-sm text-gray-600">Overtime</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Clock className="w-6 h-6 text-blue-600 mb-2" />
            <div className="font-medium text-gray-900">Clock In/Out</div>
            <div className="text-sm text-gray-600">Mark your attendance</div>
          </button>
          
          <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Coffee className="w-6 h-6 text-green-600 mb-2" />
            <div className="font-medium text-gray-900">Break Time</div>
            <div className="text-sm text-gray-600">Start/end your break</div>
          </button>
          
          <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <MapPin className="w-6 h-6 text-purple-600 mb-2" />
            <div className="font-medium text-gray-900">Work From Home</div>
            <div className="text-sm text-gray-600">Request WFH approval</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;