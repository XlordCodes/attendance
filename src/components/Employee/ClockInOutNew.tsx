import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, Coffee, Play, Pause } from 'lucide-react';
import { attendanceServiceNew, AttendanceDocumentDisplay } from '../../services/attendanceServiceNew';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ClockInOutNew: React.FC = () => {
  const { employee } = useAuth();
  const [todayRecord, setTodayRecord] = useState<AttendanceDocumentDisplay | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [afkTime, setAfkTime] = useState(0);
  const [afkTimer, setAfkTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (employee) {
      loadTodayRecord();
    }
  }, [employee]);

  // AFK detection
  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, []);

  // AFK timer
  useEffect(() => {
    if (todayRecord?.loginTime && !todayRecord?.logoutTime && !isOnBreak) {
      const timer = setInterval(() => {
        const now = Date.now();
        const timeSinceActivity = now - lastActivity;
        const afkThreshold = 5 * 60 * 1000; // 5 minutes

        if (timeSinceActivity > afkThreshold) {
          const newAfkMinutes = Math.floor(timeSinceActivity / (1000 * 60));
          setAfkTime(newAfkMinutes);
          
          // Update AFK time in database every minute
          if (newAfkMinutes % 1 === 0 && employee) {
            attendanceServiceNew.updateAfkTime(employee.id, newAfkMinutes);
          }
        } else {
          setAfkTime(0);
        }
      }, 60000); // Check every minute

      setAfkTimer(timer);
      return () => clearInterval(timer);
    } else {
      if (afkTimer) {
        clearInterval(afkTimer);
        setAfkTimer(null);
      }
    }
  }, [todayRecord, lastActivity, isOnBreak, employee]);

  const loadTodayRecord = async () => {
    if (!employee) return;
    
    try {
      const record = await attendanceServiceNew.getTodayAttendance(employee.id);
      setTodayRecord(record);
      
      if (record) {
        const onBreak = record.breaks.some(breakSession => !breakSession.end);
        setIsOnBreak(onBreak);
        setAfkTime(record.afkTime || 0);
      }
    } catch (error) {
      console.error('Error loading today record:', error);
    }
  };

  const handleClockIn = async () => {
    if (!employee) return;

    setLoading(true);
    try {
      const record = await attendanceServiceNew.clockIn(employee.id);
      setTodayRecord(record);
      setLastActivity(Date.now());
      toast.success('Clocked in successfully!');
      
      if (record.isLate) {
        toast.error(`Late arrival: ${record.lateReason}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Clock in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!employee) return;

    setLoading(true);
    try {
      const record = await attendanceServiceNew.clockOut(employee.id);
      setTodayRecord(record);
      setAfkTime(0);
      toast.success(`Clocked out successfully! Worked ${record.workedHours.toFixed(2)} hours`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Clock out failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async () => {
    if (!employee) return;

    setLoading(true);
    try {
      const record = await attendanceServiceNew.startBreak(employee.id);
      setTodayRecord(record);
      setIsOnBreak(true);
      setAfkTime(0); // Reset AFK time during breaks
      toast.success('Break started');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Start break failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    if (!employee) return;

    setLoading(true);
    try {
      const record = await attendanceServiceNew.endBreak(employee.id);
      setTodayRecord(record);
      setIsOnBreak(false);
      setLastActivity(Date.now()); // Reset activity tracking
      toast.success('Break ended');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'End break failed');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--';
    return format(date, 'HH:mm:ss');
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getWorkingHours = () => {
    if (!todayRecord?.loginTime) return '0h 0m';
    
    const endTime = todayRecord.logoutTime || currentTime;
    const workingMs = endTime.getTime() - todayRecord.loginTime.getTime();
    
    // Subtract break time
    const breakMs = todayRecord.breaks.reduce((total, breakSession) => {
      if (breakSession.end) {
        return total + (breakSession.end.getTime() - breakSession.start.getTime());
      } else if (isOnBreak) {
        return total + (currentTime.getTime() - breakSession.start.getTime());
      }
      return total;
    }, 0);
    
    const actualWorkingMs = Math.max(0, workingMs - breakMs);
    const hours = actualWorkingMs / (1000 * 60 * 60);
    return formatDuration(hours);
  };

  const getCurrentBreakDuration = () => {
    const currentBreak = todayRecord?.breaks.find(b => !b.end);
    if (!currentBreak) return '0m';
    
    const duration = (currentTime.getTime() - currentBreak.start.getTime()) / (1000 * 60);
    return `${Math.floor(duration)}m`;
  };

  const isClocked = Boolean(todayRecord?.loginTime && !todayRecord?.logoutTime);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          Time Tracking
        </h2>
        <div className="text-right">
          <div className="text-2xl font-mono font-bold text-gray-900">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-sm text-gray-500">
            {format(currentTime, 'EEEE, MMMM d, yyyy')}
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-900">Clock In</p>
              <p className="text-lg font-semibold text-blue-700">
                {formatTime(todayRecord?.loginTime || null)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-green-900">Clock Out</p>
              <p className="text-lg font-semibold text-green-700">
                {formatTime(todayRecord?.logoutTime || null)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-purple-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-purple-900">Working Hours</p>
              <p className="text-lg font-semibold text-purple-700">
                {getWorkingHours()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Late Status */}
      {todayRecord?.isLate && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-red-900">Late Arrival</p>
              <p className="text-sm text-red-700">{todayRecord.lateReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* AFK Warning */}
      {afkTime > 0 && isClocked && !isOnBreak && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-yellow-900">Away From Keyboard</p>
              <p className="text-sm text-yellow-700">
                You've been inactive for {afkTime} minutes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-4">
        {!todayRecord?.loginTime ? (
          <button
            onClick={handleClockIn}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <Play className="mr-2 h-5 w-5" />
            {loading ? 'Clocking In...' : 'Clock In'}
          </button>
        ) : !todayRecord?.logoutTime ? (
          <div className="space-y-3">
            {/* Break Controls */}
            <div className="flex space-x-3">
              {!isOnBreak ? (
                <button
                  onClick={handleStartBreak}
                  disabled={loading}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Coffee className="mr-2 h-4 w-4" />
                  {loading ? 'Starting...' : 'Start Break'}
                </button>
              ) : (
                <button
                  onClick={handleEndBreak}
                  disabled={loading}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Pause className="mr-2 h-4 w-4" />
                  {loading ? 'Ending...' : `End Break (${getCurrentBreakDuration()})`}
                </button>
              )}
            </div>

            {/* Clock Out */}
            <button
              onClick={handleClockOut}
              disabled={loading || isOnBreak}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              <Pause className="mr-2 h-5 w-5" />
              {loading ? 'Clocking Out...' : isOnBreak ? 'End Break First' : 'Clock Out'}
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-lg font-medium text-green-600">
              ✅ Work completed for today!
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Total worked: {formatDuration(todayRecord.workedHours)}
            </p>
          </div>
        )}
      </div>

      {/* Today's Break Summary */}
      {todayRecord && todayRecord.breaks.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Today's Breaks</h3>
          <div className="space-y-2">
            {todayRecord.breaks.map((breakSession, index) => (
              <div key={index} className="flex justify-between items-center text-sm bg-gray-50 rounded p-2">
                <span>Break {index + 1}</span>
                <span className="font-mono">
                  {formatTime(breakSession.start)} - {formatTime(breakSession.end)}
                  {breakSession.end && (
                    <span className="ml-2 text-gray-500">
                      ({Math.floor((breakSession.end.getTime() - breakSession.start.getTime()) / (1000 * 60))}m)
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Stats */}
      {todayRecord && (
        <div className="mt-6 border-t pt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Today's Stats</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">AFK Time:</span>
              <span className="ml-2 font-medium">{todayRecord.afkTime}m</span>
            </div>
            <div>
              <span className="text-gray-600">Breaks:</span>
              <span className="ml-2 font-medium">{todayRecord.breaks.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClockInOutNew;
