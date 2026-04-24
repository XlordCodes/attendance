import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Clock, AlertCircle, Coffee, Play, Pause } from 'lucide-react';
import { globalAttendanceService } from '../../services/globalAttendanceService';
import { AttendanceRecord } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { formatOfficeTimeLong, formatOfficeTimeAmPm, getOfficeNow, formatOffice } from '../../utils/timezoneUtils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getWorkStartTime, getLunchStartTime, getLunchEndTime, loadWorkingHoursFromDB } from '../../constants/workingHours';
import { configService } from '../../services/configService';
import { formatDuration } from '../../utils/formatDuration';

interface ClockInOutNewProps {
  onAttendanceChange?: () => void;
}

const ClockInOutNew: React.FC<ClockInOutNewProps> = ({ onAttendanceChange }) => {
  const { employee } = useAuth();
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(getOfficeNow());
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [showLateReasonModal, setShowLateReasonModal] = useState(false);
  const [lateReason, setLateReason] = useState('');
  const [pendingClockIn, setPendingClockIn] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  // Reactive work start time from DB config (falls back to default if not loaded)
  const [workStartTime, setWorkStartTime] = useState<Date>(getWorkStartTime(new Date()));
  const [lunchEndTime, setLunchEndTime] = useState<Date>(getLunchEndTime(new Date()));

  const queryClient = useQueryClient();

  const clockOutMutation = useMutation({
    mutationFn: () => {
      if (!employee?.id) throw new Error('Employee not authenticated');
      return globalAttendanceService.clockOut(employee.id);
    },
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: (record: AttendanceRecord) => {
      setTodayRecord(record);
      toast.success(`Clocked out successfully! Worked ${(record.hoursWorked || 0).toFixed(2)} hours`);
      onAttendanceChange?.();
      // Invalidate all relevant queries to force UI refresh
      queryClient.invalidateQueries({ queryKey: ['employeeAttendanceToday', employee?.id] });
      queryClient.invalidateQueries({ queryKey: ['employeeWeeklyStats', employee?.id] });
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getOfficeNow()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadTodayRecord = useCallback(async () => {
    if (!employee?.id) return;
    
    try {
      const record = await globalAttendanceService.getTodayAttendance(employee.id);
      setTodayRecord(record);
      
      if (record) {
        const onBreak = record.breaks.some(breakSession => !breakSession.endTime);
        setIsOnBreak(onBreak);
      }
    } catch (error) {
      console.error('Error loading today record:', error);
    }
  }, [employee]);

  useEffect(() => {
    if (employee) {
      loadTodayRecord();
    }
  }, [employee, loadTodayRecord]);

  const handleClockIn = async () => {
    if (!employee?.id) return;

    // Check if it would be a late arrival based on configured work start time
    const now = new Date();
    const workStartTime = getWorkStartTime(now);
    
    const isLateArrival = now > workStartTime;
    
    if (isLateArrival && !pendingClockIn) {
      // Show modal to ask for late reason
      setPendingClockIn(true);
      setShowLateReasonModal(true);
      return;
    }

    await performClockIn();
  };

  const performClockIn = async () => {
    if (!employee?.id) return;

    setLoading(true);
    try {
      const record = await globalAttendanceService.clockIn(
        employee.id, 
        lateReason.trim() || undefined,
        currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          accuracy: 0,
          timestamp: new Date()
        } : undefined
      );
      setTodayRecord(record);
      toast.success('Clocked in successfully!');
      
      if (record.isLate) {
        toast.error(`Late arrival: ${record.lateReason}`);
      }

      // Reset modal state
      setShowLateReasonModal(false);
      setLateReason('');
      setPendingClockIn(false);
      
      // Notify parent component of change
      onAttendanceChange?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Clock in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLateReasonSubmit = () => {
    if (lateReason.trim()) {
      performClockIn();
    } else {
      toast.error('Please provide a reason for late arrival');
    }
  };

  const handleCancelLateReason = () => {
    setShowLateReasonModal(false);
    setLateReason('');
    setPendingClockIn(false);
  };

  const handleClockOut = () => {
    if (!employee?.id) return;
    clockOutMutation.mutate();
  };

  const handleStartBreak = async () => {
    if (!employee?.id) return;

    setLoading(true);
    try {
      const record = await globalAttendanceService.startBreak(employee.id);
      setTodayRecord(record);
      setIsOnBreak(true);
      toast.success('Break started');
      
      // Notify parent component of change
      onAttendanceChange?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Start break failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    if (!employee?.id) return;

    setLoading(true);
    try {
      const record = await globalAttendanceService.endBreak(employee.id);
      setTodayRecord(record);
      setIsOnBreak(false);
      toast.success('Break ended');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'End break failed');
    } finally {
      setLoading(false);
    }
  };

   const formatTime = (date: Date | null) => {
     if (!date) return '--:--';
     return formatOfficeTimeLong(date);
   };

  const getWorkingHours = () => {
    if (!todayRecord?.clockIn) return '0h 0m';
    
    const endTime = todayRecord.clockOut || currentTime;
    const workingMs = endTime.getTime() - todayRecord.clockIn.getTime();
    
    // Subtract break time
    const breakMs = todayRecord.breaks.reduce((total, breakSession) => {
      if (breakSession.endTime && breakSession.startTime) {
        return total + (breakSession.endTime.getTime() - breakSession.startTime.getTime());
      } else if (isOnBreak && breakSession.startTime) {
        return total + (currentTime.getTime() - breakSession.startTime.getTime());
      }
      return total;
    }, 0);
    
    const actualWorkingMs = Math.max(0, workingMs - breakMs);
    const hours = actualWorkingMs / (1000 * 60 * 60);
    return formatDuration(hours);
  };

  const getCurrentBreakDuration = () => {
    const currentBreak = todayRecord?.breaks.find(b => !b.endTime);
    if (!currentBreak || !currentBreak.startTime) return '0m';
    
    const duration = (currentTime.getTime() - currentBreak.startTime.getTime()) / (1000 * 60);
    return `${Math.floor(duration)}m`;
  };

  // Get user location
  useEffect(() => {
    const requestLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setLocationError(null);
            console.log('📍 Location obtained:', position.coords.latitude, position.coords.longitude);
          },
          (error) => {
            console.error('📍 Location error:', error);
            setLocationError(`Location access denied: ${error.message}`);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
      } else {
        setLocationError('Geolocation is not supported by this browser');
      }
    };

    requestLocation();
    
    // Update location every 5 minutes
    const locationInterval = setInterval(requestLocation, 5 * 60 * 1000);
    
    return () => clearInterval(locationInterval);
  }, []);

  const handleAutomaticLunchStart = useCallback(async () => {
    if (!employee?.id) return;

    try {
      const record = await globalAttendanceService.startLunchBreak(employee.id);
      setTodayRecord(record);
      toast.success('🍽️ Lunch break started automatically at 2:00 PM');
      onAttendanceChange?.();
    } catch (error) {
      console.error('Error starting automatic lunch break:', error);
    }
  }, [employee?.id, onAttendanceChange]);

   // Check for automatic lunch break
   useEffect(() => {
     if (!todayRecord?.clockIn || todayRecord?.clockOut || todayRecord?.lunchStart) return;

     const checkLunchTime = () => {
       const now = new Date();
       const lunchStartTime = getLunchStartTime(now);

       // Automatically start lunch break at 2:00 PM
       if (now >= lunchStartTime && !todayRecord.lunchStart) {
         handleAutomaticLunchStart();
       }
     };

     const lunchTimer = setInterval(checkLunchTime, 60000); // Check every minute

     return () => clearInterval(lunchTimer);
   }, [todayRecord, handleAutomaticLunchStart]);

   // Load working hours configuration to keep UI in sync with admin updates
   useEffect(() => {
     const fetchConfig = async () => {
       try {
         const dbConfig = await configService.getWorkingHoursConfig();
         if (dbConfig) {
           const now = new Date();
           const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), dbConfig.start_hour, dbConfig.start_minute, 0);
           const lunchEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), dbConfig.lunch_end_hour, dbConfig.lunch_end_minute, 0);
           setWorkStartTime(startDate);
           setLunchEndTime(lunchEnd);
         } else {
           setWorkStartTime(getWorkStartTime(new Date()));
           setLunchEndTime(getLunchEndTime(new Date()));
         }
       } catch (error) {
         console.error('Error loading work start time:', error);
         setWorkStartTime(getWorkStartTime(new Date()));
         setLunchEndTime(getLunchEndTime(new Date()));
       }
     };

     fetchConfig();
   }, []);

  const handleLunchReturn = async () => {
    if (!employee?.id) return;

    const now = new Date();
    const lunchEndTime = getLunchEndTime(now);
    
    const isLate = now > lunchEndTime;

    setLoading(true);
    try {
      const record = await globalAttendanceService.endLunchBreak(employee.id, isLate);
      setTodayRecord(record);
      
      if (isLate) {
        toast.error('⏰ Late return from lunch break!');
      } else {
        toast.success('🍽️ Lunch break ended');
      }
      
      onAttendanceChange?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to end lunch break');
    } finally {
      setLoading(false);
    }
  };

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
                {formatTime(todayRecord?.clockIn || null)}
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
                {formatTime(todayRecord?.clockOut || null)}
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

      {/* Lunch Break Status */}
      {todayRecord?.lunchStart && !todayRecord?.lunchEnd && (
         <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
           <div className="flex items-center">
             <Coffee className="h-5 w-5 text-orange-600 mr-2" />
             <div>
               <p className="text-sm font-medium text-orange-900">Lunch Break Active</p>
               <p className="text-sm text-orange-700">
                 Started at {formatTime(todayRecord.lunchStart)} • Return before {lunchEndTime ? format(lunchEndTime, 'h:mm a') : '...'}
               </p>
             </div>
           </div>
         </div>
      )}

      {/* Location Status */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className={`h-2 w-2 rounded-full mr-2 ${currentLocation ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <div>
            <p className="text-sm font-medium text-gray-900">Location Status</p>
            <p className="text-sm text-gray-600">
              {currentLocation 
                ? `📍 Location detected (${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)})` 
                : locationError || 'Location access required for attendance'}
            </p>
          </div>
        </div>
      </div>



      {/* Action Buttons */}
      <div className="space-y-4">
        {!todayRecord?.clockIn ? (
          <button
            onClick={handleClockIn}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <Play className="mr-2 h-5 w-5" />
            {loading ? 'Clocking In...' : 'Clock In'}
          </button>
        ) : !todayRecord?.clockOut ? (
          <div className="space-y-3">
            {/* Lunch Break Return Button - Show if lunch started but not ended */}
            {todayRecord?.lunchStart && !todayRecord?.lunchEnd && (
              <button
                onClick={handleLunchReturn}
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                <Coffee className="mr-2 h-5 w-5" />
                {loading ? 'Returning...' : 'Return from Lunch'}
              </button>
            )}

            {/* Break Controls - Only show if not on lunch break */}
            {(!todayRecord?.lunchStart || todayRecord?.lunchEnd) && (
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
            )}

            {/* Clock Out - Disable if on lunch break or regular break */}
            <button
              onClick={handleClockOut}
              disabled={loading || isOnBreak || (todayRecord?.lunchStart && !todayRecord?.lunchEnd)}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              <Pause className="mr-2 h-5 w-5" />
              {loading ? 'Clocking Out...' : 
               isOnBreak ? 'End Break First' : 
               (todayRecord?.lunchStart && !todayRecord?.lunchEnd) ? 'Return from Lunch First' : 'Clock Out'}
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-lg font-medium text-green-600">
              ✅ Work completed for today!
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Total worked: {formatDuration(todayRecord.hoursWorked || 0)}
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
                  {formatTime(breakSession.startTime || null)} - {formatTime(breakSession.endTime || null)}
                  {breakSession.endTime && breakSession.startTime && (
                    <span className="ml-2 text-gray-500">
                      ({Math.floor((breakSession.endTime.getTime() - breakSession.startTime.getTime()) / (1000 * 60))}m)
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
              <span className="text-gray-600">Breaks:</span>
              <span className="ml-2 font-medium">{todayRecord.breaks.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Lunch Break:</span>
              <span className="ml-2 font-medium">
                {todayRecord.lunchStart ? 
                  (todayRecord.lunchEnd ? 'Completed' : 'Active') : 
                  'Not taken'}
              </span>
            </div>
            {todayRecord.lunchStart && (
              <>
                <div>
                  <span className="text-gray-600">Lunch Start:</span>
                  <span className="ml-2 font-medium">{formatTime(todayRecord.lunchStart)}</span>
                </div>
                {todayRecord.lunchEnd && (
                  <div>
                    <span className="text-gray-600">Lunch End:</span>
                    <span className="ml-2 font-medium">{formatTime(todayRecord.lunchEnd)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Late Reason Modal */}
      {showLateReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Late Arrival</h3>
            <p className="text-gray-600 mb-4">
              You're arriving after {workStartTime ? format(workStartTime, 'h:mm a') : '...'}. Please provide a reason for your late arrival:
            </p>
            <textarea
              value={lateReason}
              onChange={(e) => setLateReason(e.target.value)}
              placeholder="Enter reason for late arrival..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={handleCancelLateReason}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleLateReasonSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                disabled={loading || !lateReason.trim()}
              >
                {loading ? 'Clocking In...' : 'Clock In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClockInOutNew;
