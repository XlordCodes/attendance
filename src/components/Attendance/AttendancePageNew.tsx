import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { globalAttendanceService } from '../../services/globalAttendanceService';
import { leaveService } from '../../services/leaveService';
import { AttendanceRecord, LeaveRequest, RoleSchedule } from '../../types';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { getScheduleForRole } from '../../constants/workingHours';
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
  const [roleSchedules, setRoleSchedules] = useState<Record<string, RoleSchedule>>({});

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

      // Pre-fetch role schedule for rest-day lookup
      if (employee.role) {
        const schedule = await getScheduleForRole(employee.role);
        if (schedule) {
          setRoleSchedules(prev => ({ ...prev, [employee.role]: schedule }));
        }
      }
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
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const today = new Date();
    const endLimit = monthEnd > today ? today : monthEnd;

    const daysInMonth = eachDayOfInterval({ start: monthStart, end: endLimit });
    const employeeRoleSchedule = roleSchedules[employee?.role || ''];
    const restDays = employeeRoleSchedule?.restDays || [0, 6];

    const elapsedWorkingDays = daysInMonth.filter(day => !restDays.includes(day.getDay())).length;
    const totalDays = elapsedWorkingDays;
    const presentDays = attendanceRecords.filter(r => r.clockIn).length;
    const lateDays = attendanceRecords.filter(r => r.isLate).length;
    const absentDays = totalDays - presentDays;
    const totalHours = attendanceRecords.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);

    setStats({
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      attendancePercentage: totalDays > 0 ? Math.min((presentDays / totalDays) * 100, 100) : 0,
      averageHours: presentDays > 0 ? totalHours / presentDays : 0,
      totalHours
    });
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

  // Color/style maps for calendar-style status badges
  const statusBadge: Record<string, { badge: string; icon: JSX.Element | null }> = {
    present: {
      badge: 'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border bg-emerald-50 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20',
      icon: null
    },
    late: {
      badge: 'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border bg-amber-50 text-amber-700 border-amber-100',
      icon: null
    },
    absent: {
      badge: 'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border bg-rose-50 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-500/20',
      icon: null
    },
    'on-leave': {
      badge: 'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border bg-brand/10 text-brand dark:text-brand border-brand/30 dark:border-brand/30',
      icon: <Calendar className="w-3 h-3 mr-1" />
    },
    'rest-day': {
      badge: 'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-neutral-300 border-gray-200 dark:border-neutral-700',
      icon: <Info className="w-3 h-3 mr-1" />
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center animate-pulse mx-auto mb-4">
            <div className="w-6 h-6 bg-white dark:bg-neutral-800 rounded opacity-80"></div>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Loading Attendance</h3>
          <p className="text-sm text-gray-500 dark:text-neutral-400">Please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas dark:bg-black space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Attendance</h1>
          <p className="text-gray-600 dark:text-neutral-400 mt-1">View your attendance history and statistics</p>
        </div>
        {/* Month Navigation */}
        <div className="flex items-center space-x-4">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-neutral-400" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white min-w-[150px] text-center">
            {format(selectedMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600 dark:text-neutral-400" />
          </button>
        </div>
      </div>

      {/* My Leave Requests */}
      {employee && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">My Leave Requests</h4>
          {loadingLeaves ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900 mx-auto"></div>
            </div>
          ) : employeeLeaveRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-sm font-medium text-gray-600 dark:text-neutral-400 dark:text-neutral-400">
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Date Range</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Reason</th>
                  </tr>
                </thead>
                <tbody className="text-sm dark:text-neutral-300">
                  {employeeLeaveRequests.map((leave) => {
                    const statusColor =
                      leave.status === 'approved' ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-500/10' :
                        leave.status === 'rejected' ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10' :
                          'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-500/10';
                    const start = new Date(`${leave.startDate}T00:00:00`);
                    const end = new Date(`${leave.endDate}T00:00:00`);
                    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                    return (
                      <tr key={leave.id} className="border-t dark:border-neutral-700">
                        <td className="py-2 capitalize pr-4">{leave.leaveType}</td>
                        <td className="py-2 pr-4">
                          {format(start, 'MMM dd, yyyy')} – {format(end, 'MMM dd, yyyy')}
                          <span className="text-xs text-gray-500 dark:text-neutral-400 ml-1">
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
            <p className="text-gray-500 dark:text-neutral-400 italic py-4">No leave requests submitted yet.</p>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-brand mr-2" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Days Present</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.presentDays}</p>
              <p className="text-xs text-gray-500 dark:text-neutral-400">Out of {stats.totalDays} days</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-brand mr-2" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Attendance Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.attendancePercentage.toFixed(1)}%</p>
              <p className="text-xs text-gray-500 dark:text-neutral-400">This month</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-brand" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(stats.totalHours)}</p>
              <p className="text-xs text-gray-500 dark:text-neutral-400">Avg: {formatDuration(stats.averageHours)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Late Days</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.lateDays}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800/50">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance Records</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-800/50">
            <thead className="bg-gray-50 dark:bg-neutral-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 dark:bg-neutral-900/50 uppercase tracking-wider border-b border-gray-100 dark:border-neutral-800">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 dark:bg-neutral-900/50 uppercase tracking-wider border-b border-gray-100 dark:border-neutral-800">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 dark:bg-neutral-900/50 uppercase tracking-wider border-b border-gray-100 dark:border-neutral-800">
                  Clock In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 dark:bg-neutral-900/50 uppercase tracking-wider border-b border-gray-100 dark:border-neutral-800">
                  Clock Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 dark:bg-neutral-900/50 uppercase tracking-wider border-b border-gray-100 dark:border-neutral-800">
                  Hours Worked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 dark:bg-neutral-900/50 uppercase tracking-wider border-b border-gray-100 dark:border-neutral-800">
                  Breaks
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-800/50 dark:divide-neutral-800">
              {(() => {
                const monthStart = startOfMonth(selectedMonth);
                const monthEnd = endOfMonth(selectedMonth);
                const today = new Date();
                // Don't show future dates
                const endLimit = monthEnd > today ? today : monthEnd;

                // Generate an array of dates from the 1st of the month up to 'endLimit'
                const daysInMonth = eachDayOfInterval({ start: monthStart, end: endLimit }).reverse();

                return daysInMonth.map((dayDate) => {
                  // Format date for UI display
                  const dateStr = format(dayDate, 'MMM dd, yyyy');
                  // Format date for Database lookup
                  const dbDateStr = format(dayDate, 'yyyy-MM-dd');

                  const dayOfWeek = dayDate.getDay();
                  const employeeRoleSchedule = roleSchedules[employee?.role || ''];
                  const restDays = employeeRoleSchedule?.restDays || [0, 6];
                  const isRestDay = restDays.includes(dayOfWeek);

                  // Find if there's a record for this specific day using the exact DB format
                  const record = records.find(r => r.date === dbDateStr);

                  // Check if there is an approved leave for this day
                  const isOnLeave = employeeLeaveRequests.some(leave => {
                    if (leave.status !== 'approved') return false;
                    const leaveStart = new Date(`${leave.startDate}T00:00:00`);
                    const leaveEnd = new Date(`${leave.endDate}T23:59:59`);
                    return dayDate >= leaveStart && dayDate <= leaveEnd;
                  });

                  let status: 'present' | 'late' | 'absent' | 'on-leave' | 'rest-day';
                  if (isOnLeave) {
                    status = 'on-leave';
                  } else if (isRestDay && !record?.clockIn) {
                    status = 'rest-day';
                  } else if (!record?.clockIn) {
                    status = 'absent';
                  } else {
                    status = record.isLate ? 'late' : 'present';
                  }

                  const { badge: currentStatusBadge, icon: statusIcon } = statusBadge[status];

                  return (
                    <tr key={dateStr} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">
                          {dateStr}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-neutral-400">
                          {format(dayDate, 'EEEE')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`${currentStatusBadge}`}>
                          {statusIcon}
                          <span className="ml-1 capitalize">
                            {status === 'rest-day' ? 'Rest Day' : status.replace('-', ' ')}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {record ? (record.clockIn ? format(record.clockIn, 'HH:mm') : '--:--') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {record ? (record.clockOut ? format(record.clockOut, 'HH:mm') : '--:--') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {record ? formatDuration(record.hoursWorked || 0) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {record ? (
                          <span>{record.breaks.length} ({formatMinutes(record.breaks.reduce((sum, b) => {
                            const duration = b.endTime && b.startTime
                              ? Math.floor((b.endTime.getTime() - b.startTime.getTime()) / (1000 * 60))
                              : 0;
                            return sum + duration;
                          }, 0))})</span>
                        ) : 'N/A'}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendancePageNew;
