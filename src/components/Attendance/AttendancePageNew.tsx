import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { globalAttendanceService } from '../../services/globalAttendanceService';
import { leaveService } from '../../services/leaveService';
import { AttendanceRecord, LeaveRequest } from '../../types';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO, isValid } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';


interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  attendancePercentage: number;
  averageHours: number;
  totalHours: number;
}

const AttendancePageNew: React.FC = () => {
  const { employee } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    lateDays: 0,
    absentDays: 0,
    attendancePercentage: 0,
    averageHours: 0,
    totalHours: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [employeeLeaveRequests, setEmployeeLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);

  useEffect(() => {
    if (employee) {
      loadAttendanceData();
      fetchEmployeeLeaves();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee, selectedMonth]);

  const loadAttendanceData = async () => {
    if (!employee) return;

    setLoading(true);
    try {
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);

      const attendanceRecords = await globalAttendanceService.getAttendanceRange(
        employee.id,
        monthStart,
        monthEnd
      );

      setRecords(attendanceRecords);
      calculateStats(attendanceRecords);
    } catch (error) {
      console.error('Error loading attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeLeaves = async () => {
    if (!employee) return;
    setLoadingLeaves(true);
    try {
      const requests = await leaveService.getLeaveRequestsForEmployee(employee.id);
      setEmployeeLeaveRequests(requests);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('Failed to load leave requests');
    } finally {
      setLoadingLeaves(false);
    }
  };

  const calculateStats = (attendanceRecords: AttendanceRecord[]) => {
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(r => r.clockIn).length;
    const lateDays = attendanceRecords.filter(r => r.isLate).length;
    const absentDays = totalDays - presentDays;
    const totalHours = attendanceRecords.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);

    setStats({
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      attendancePercentage: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
      averageHours: presentDays > 0 ? totalHours / presentDays : 0,
      totalHours
    });
  };

  const getRecordStatus = (record: AttendanceRecord): string => {
    if (!record.clockIn) return 'absent';
    if (record.isLate) return 'late';
    return 'present';
  };

  const getStatusIcon = (record: AttendanceRecord) => {
    const status = getRecordStatus(record);
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'late':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (record: AttendanceRecord) => {
    const status = getRecordStatus(record);
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  };

  const previousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const nextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center animate-pulse mx-auto mb-4">
            <div className="w-6 h-6 bg-white rounded opacity-80"></div>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Loading Attendance</h3>
          <p className="text-sm text-gray-500">Please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
          <p className="text-gray-600 mt-1">View your attendance history and statistics</p>
        </div>
        {/* Month Navigation */}
        <div className="flex items-center space-x-4">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 min-w-[150px] text-center">
            {format(selectedMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* My Leave Requests */}
      {employee && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h4 className="font-medium text-gray-900 mb-3">My Leave Requests</h4>
          {loadingLeaves ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : employeeLeaveRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-sm font-medium text-gray-600">
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Date Range</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Reason</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {employeeLeaveRequests.map((leave) => {
                    const statusColor =
                      leave.status === 'approved' ? 'text-green-600 bg-green-100' :
                        leave.status === 'rejected' ? 'text-red-600 bg-red-100' :
                          'text-yellow-600 bg-yellow-100';

                    const start = new Date(`${leave.startDate}T00:00:00`);
                    const end = new Date(`${leave.endDate}T00:00:00`);
                    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                    return (
                      <tr key={leave.id} className="border-t">
                        <td className="py-2 capitalize pr-4">{leave.leaveType}</td>
                        <td className="py-2 pr-4">
                          {format(start, 'MMM dd, yyyy')} – {format(end, 'MMM dd, yyyy')}
                          <span className="text-xs text-gray-500 ml-1">
                            ({days} days)
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                            {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-2 max-w-xs truncate" title={leave.reason}>
                          {leave.reason}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic py-4">No leave requests submitted yet.</p>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Days Present</p>
              <p className="text-2xl font-bold text-gray-900">{stats.presentDays}</p>
              <p className="text-xs text-gray-500">Out of {stats.totalDays} days</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.attendancePercentage.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">This month</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.totalHours)}</p>
              <p className="text-xs text-gray-500">Avg: {formatDuration(stats.averageHours)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Late Days</p>
              <p className="text-2xl font-bold text-gray-900">{stats.lateDays}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Attendance Records</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clock In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clock Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours Worked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Breaks
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.length > 0 ? (
                records
                  .map((record) => {
                    // Parse ISO date string (YYYY-MM-DD) safely
                    const recordDate = parseISO(record.date);
                    if (!isValid(recordDate)) {
                      console.error('Invalid date format:', record.date);
                      return null;
                    }
                    return (
                      <tr key={record.date} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {format(recordDate, 'MMM dd, yyyy')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(recordDate, 'EEEE')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${getStatusColor(record)}`}>
                            {getStatusIcon(record)}
                            <span className="ml-1 capitalize">{getRecordStatus(record)}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.clockIn ? format(record.clockIn, 'HH:mm') : '--:--'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.clockOut ? format(record.clockOut, 'HH:mm') : '--:--'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDuration(record.hoursWorked || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.breaks.length} ({formatMinutes(record.breaks.reduce((sum, b) => {
                            const duration = b.endTime && b.startTime
                              ? Math.floor((b.endTime.getTime() - b.startTime.getTime()) / (1000 * 60))
                              : 0;
                            return sum + duration;
                          }, 0))})
                        </td>
                      </tr>
                    );
                  })
                  .filter(Boolean) // Remove null entries
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records</h3>
                      <p className="text-sm">No attendance data found for {format(selectedMonth, 'MMMM yyyy')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendancePageNew;
