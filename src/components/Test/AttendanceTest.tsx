import React, { useState } from 'react';
import { initializeUserAttendance, getUserAttendanceSample } from '../../utils/initializeAttendance';
import { migrateFromArrayToSubcollection, verifyMigration } from '../../utils/migrateAttendanceData';
import { attendanceService } from '../../services/attendanceService';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const AttendanceTest: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState<any>(null);

  const handleInitialize = async () => {
    setLoading(true);
    try {
      const result = await initializeUserAttendance();
      toast.success(`Checked ${result.updatedCount} users!`);
    } catch (error) {
      toast.error('Failed to check users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!user) {
      toast.error('Please login first');
      return;
    }

    setLoading(true);
    try {
      await attendanceService.clockIn(user.uid);
      toast.success('Clocked in successfully!');
      await loadAttendanceData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to clock in');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!user) {
      toast.error('Please login first');
      return;
    }

    setLoading(true);
    try {
      await attendanceService.clockOut(user.uid);
      toast.success('Clocked out successfully!');
      await loadAttendanceData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to clock out');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceData = async () => {
    if (!user) return;

    try {
      const userData = await getUserAttendanceSample(user.uid);
      setAttendanceData(userData);
    } catch (error) {
      console.error('Error loading attendance data:', error);
    }
  };

  const handleMigrate = async () => {
    setLoading(true);
    try {
      const result = await migrateFromArrayToSubcollection();
      toast.success(`Migrated ${result.totalRecordsMigrated} records from ${result.migratedUsers} users!`);
    } catch (error) {
      toast.error('Failed to migrate data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const result = await verifyMigration();
      toast.success(`Verification complete! ${result.usersWithNewData} users with subcollection data, ${result.usersWithOldData} users with old data`);
    } catch (error) {
      toast.error('Failed to verify migration');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadData = async () => {
    setLoading(true);
    await loadAttendanceData();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Attendance System Test</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
            <button
              onClick={handleInitialize}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Check Users
            </button>
            
            <button
              onClick={handleMigrate}
              disabled={loading}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              Migrate Data
            </button>
            
            <button
              onClick={handleVerify}
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              Verify Migration
            </button>
            
            <button
              onClick={handleClockIn}
              disabled={loading || !user}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Clock In
            </button>
            
            <button
              onClick={handleClockOut}
              disabled={loading || !user}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Clock Out
            </button>
            
            <button
              onClick={handleLoadData}
              disabled={loading || !user}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              Load Data
            </button>
          </div>

          {user && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Current User</h3>
              <p className="text-blue-800">Email: {user.email}</p>
              <p className="text-blue-800">UID: {user.uid}</p>
            </div>
          )}

          {attendanceData && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">User Attendance Data</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-gray-900">{attendanceData.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Records</label>
                  <p className="text-gray-900">{attendanceData.attendance?.length || 0}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attendance Records</label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {attendanceData.attendance && attendanceData.attendance.length > 0 ? (
                    attendanceData.attendance.map((record: any, index: number) => (
                      <div key={index} className="bg-white p-3 rounded border">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Date:</span> {record.date}
                          </div>
                          <div>
                            <span className="font-medium">Clock In:</span> {
                              record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : 'N/A'
                            }
                          </div>
                          <div>
                            <span className="font-medium">Clock Out:</span> {
                              record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : 'N/A'
                            }
                          </div>
                          <div>
                            <span className="font-medium">Status:</span> 
                            <span className={`ml-1 px-2 py-1 rounded text-xs ${
                              record.status === 'present' ? 'bg-green-100 text-green-800' : 
                              record.status === 'late' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {record.status}
                            </span>
                          </div>
                          {record.totalHours && (
                            <div className="col-span-2">
                              <span className="font-medium">Total Hours:</span> {record.totalHours.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">No attendance records found</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceTest;
