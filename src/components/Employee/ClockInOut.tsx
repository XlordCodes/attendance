import React, { useState, useEffect } from 'react';
import { Clock, MapPin, AlertCircle } from 'lucide-react';
import { attendanceService } from '../../services/attendanceService';
import { useAuth } from '../../hooks/useAuth';
import { AttendanceRecord, GeolocationData } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ClockInOut: React.FC = () => {
  const { employee } = useAuth();
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<GeolocationData | null>(null);
  const [earlyLogoutReason, setEarlyLogoutReason] = useState('');
  const [showEarlyLogoutModal, setShowEarlyLogoutModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (employee) {
      loadTodayRecord();
      getCurrentLocation();
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
      toast.success('Clocked in successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Clock in failed');
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
      toast.success('Clocked out successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Clock out failed');
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

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="text-4xl font-mono font-bold text-gray-900 mb-2">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-lg text-gray-600">
            {format(currentTime, 'EEEE, MMMM d, yyyy')}
          </div>
        </div>

        {/* Location Status */}
        <div className="flex items-center justify-center mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            {location ? (
              <>
                <MapPin className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-700">Location detected</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-gray-700">Location not available</span>
              </>
            )}
          </div>
        </div>

        {/* Current Status */}
        {todayRecord && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Today's Status</h3>
            <div className="space-y-1 text-sm text-blue-800">
              {todayRecord.clockIn && (
                <p>Clock In: {format(todayRecord.clockIn, 'HH:mm:ss')}</p>
              )}
              {todayRecord.clockOut && (
                <p>Clock Out: {format(todayRecord.clockOut, 'HH:mm:ss')}</p>
              )}
              {todayRecord.clockIn && !todayRecord.clockOut && (
                <p>Total Time: {Math.floor((currentTime.getTime() - todayRecord.clockIn.getTime()) / (1000 * 60 * 60))}h {Math.floor(((currentTime.getTime() - todayRecord.clockIn.getTime()) % (1000 * 60 * 60)) / (1000 * 60))}m</p>
              )}
            </div>
          </div>
        )}

        {/* Clock In/Out Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={handleClockIn}
            disabled={loading || isClockInDisabled()}
            className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            <Clock className="w-5 h-5" />
            <span>Clock In</span>
          </button>

          <button
            onClick={handleClockOut}
            disabled={loading || isClockOutDisabled()}
            className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            <Clock className="w-5 h-5" />
            <span>Clock Out</span>
          </button>
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
    </div>
  );
};

export default ClockInOut;