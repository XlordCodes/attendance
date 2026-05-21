import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  CheckCircle,
  AlertCircle,
  Coffee,
  Info
} from 'lucide-react';
import { globalAttendanceService } from '../../services/globalAttendanceService';
import { userService } from '../../services/userService';
import { leaveService } from '../../services/leaveService';
import { AttendanceRecord, Employee, LeaveRequest, RoleSchedule } from '../../types';
import { startOfMonth, endOfMonth, subMonths, addMonths, eachDayOfInterval, format } from 'date-fns';
import { formatOfficeTimeShort, formatOfficeMonth, getOfficeNow } from '../../utils/timezoneUtils';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useAuth } from '../../hooks/useAuth';
import { formatDuration } from '../../utils/formatDuration';
import { getScheduleForRole } from '../../constants/workingHours';
import TermsAndConditionsModal from '../common/TermsAndConditionsModal';

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  attendancePercentage: number;
  averageHours: number;
  totalHours: number;
  totalBreaks: number;
}

interface EmployeeAttendanceData {
  employee: Employee;
  stats: AttendanceStats;
  records: AttendanceRecord[];
}

const AttendanceLogsNew: React.FC = () => {
  const { employee } = useAuth();
  const [attendanceData, setAttendanceData] = useState<EmployeeAttendanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getOfficeNow());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [employeeLeaveRequests, setEmployeeLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [roleSchedules, setRoleSchedules] = useState<Record<string, RoleSchedule>>({});

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      loadAttendanceData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, selectedMonth, selectedEmployee]);

  useEffect(() => {
    if (employee) {
      fetchEmployeeLeaves();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee]);

  const loadEmployees = async () => {
    try {
      const employeesList = await userService.getAllUsers();
      setEmployees(employeesList);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const loadAttendanceData = async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);

      const employeesToLoad = selectedEmployee === 'all'
        ? employees
        : employees.filter(emp => emp.id === selectedEmployee);

      // Pre-fetch role schedules for all distinct roles present in the employee set
      const uniqueRoles = Array.from(new Set(employeesToLoad.map(emp => emp.role).filter(Boolean)));
      const schedulePromises = uniqueRoles.map(role => getScheduleForRole(role));
      const scheduleResults = await Promise.all(schedulePromises);
      const newRoleSchedules: Record<string, RoleSchedule> = {};
      uniqueRoles.forEach((role, i) => {
        const schedule = scheduleResults[i];
        if (schedule) newRoleSchedules[role] = schedule;
      });
      setRoleSchedules(prev => ({ ...prev, ...newRoleSchedules }));

      const attendanceDataPromises = employeesToLoad.map(async (employee) => {
        try {
          const records = await globalAttendanceService.getAttendanceRange(
            employee.id,
            monthStart,
            monthEnd
          );

          const stats = calculateAttendanceStats(records, monthStart, monthEnd);

          return {
            employee,
            stats,
            records
          };
        } catch (error) {
          console.error(`Error loading attendance for ${employee.name}:`, error);
          return {
            employee,
            stats: getEmptyStats(),
            records: []
          };
        }
      });

      const results = await Promise.all(attendanceDataPromises);
      setAttendanceData(results);
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

  const calculateAttendanceStats = (
    records: AttendanceRecord[],
    monthStart: Date,
    monthEnd: Date
  ): AttendanceStats => {
    const workingDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
      .filter(day => day.getDay() !== 0 && day.getDay() !== 6)
      .length;

    const presentDays = records.filter(r => r.clockIn).length;
    const lateDays = records.filter(r => r.isLate).length;
    const absentDays = workingDays - presentDays;

    const totalHours = records.reduce((sum, r) => sum + (Number(r.hoursWorked) || 0), 0);
    const totalBreaks = records.reduce((sum, r) => sum + r.breaks.length, 0);

    return {
      totalDays: workingDays,
      presentDays,
      lateDays,
      absentDays,
      attendancePercentage: workingDays > 0 ? (presentDays / workingDays) * 100 : 0,
      averageHours: presentDays > 0 ? totalHours / presentDays : 0,
      totalHours,
      totalBreaks
    };
  };

  const getEmptyStats = (): AttendanceStats => ({
    totalDays: 0,
    presentDays: 0,
    lateDays: 0,
    absentDays: 0,
    attendancePercentage: 0,
    averageHours: 0,
    totalHours: 0,
    totalBreaks: 0
  });

  const filteredData = attendanceData.filter(data =>
    data.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    data.employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    data.employee.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--';
    return formatOfficeTimeShort(date);
  };

  const exportToExcel = () => {
    try {
      const exportData = attendanceData.flatMap(data =>
        data.records.map(record => ({
          'Employee Name': data.employee.name,
          'Email': data.employee.email,
          'Department': data.employee.department,
          'Date': record.date,
          'Login Time': formatTime(record.clockIn || null),
          'Logout Time': formatTime(record.clockOut || null),
          'Hours Worked': formatDuration(record.hoursWorked || 0),
          'Is Late': record.isLate ? 'Yes' : 'No',
          'Late Reason': record.lateReason || '',
          'Is Late From Lunch': record.isLateFromLunch ? 'Yes' : 'No',
          'Lunch Late Reason': record.lunchLateReason || '',
          'Breaks Count': record.breaks.length,
          'Status': record.clockIn ? (record.isLate ? 'Late' : 'Present') : 'Absent'
        }))
      );

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const file = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const monthName = formatOfficeMonth(selectedMonth);
      saveAs(file, `attendance-${monthName}.xlsx`);
      toast.success('Attendance report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export attendance report');
    }
  };

  const previousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const nextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };

  const totalStats = attendanceData.reduce((acc, data) => ({
    totalEmployees: acc.totalEmployees + 1,
    totalHours: acc.totalHours + data.stats.totalHours,
    totalPresent: acc.totalPresent + data.stats.presentDays,
    totalLate: acc.totalLate + data.stats.lateDays,
    totalAbsent: acc.totalAbsent + data.stats.absentDays
  }), { totalEmployees: 0, totalHours: 0, totalPresent: 0, totalLate: 0, totalAbsent: 0 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Attendance Logs</h1>
          <button
            onClick={() => setShowTermsModal(true)}
            className="bg-brand/10 hover:bg-brand/10 text-gray-700 p-2 transition-colors border border-brand/30 rounded-full"
            title="View Terms & Conditions"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportToExcel}
            className="bg-white dark:bg-neutral-900 text-gray-900 dark:text-white border border-gray-200 dark:border-neutral-700 hover:bg-canvas px-4 py-2 rounded-lg flex items-center"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-brand" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.totalEmployees}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-brand" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(totalStats.totalHours)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-brand" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Present Days</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.totalPresent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-brand" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Late Days</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStats.totalLate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Month Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="font-medium">
                {formatOfficeMonth(selectedMonth)}
              </span>
            </div>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Employee Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="flex-1 border border-gray-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 px-3 py-2 focus:ring-2 focus:ring-brand focus:border-brand focus:border-transparent"
            >
              <option value="all">All Employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="md:col-span-2 flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border border-gray-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 px-3 py-2 focus:ring-2 focus:ring-brand focus:border-brand focus:border-transparent"
            />
          </div>
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
                      <tr key={leave.id} className="border-t">
                        <td className="py-2 capitalize pr-4">{leave.leaveType}</td>
                        <td className="py-2 pr-4">
                          {format(start, 'MMM dd, yyyy')} â€“ {format(end, 'MMM dd, yyyy')}
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

      {/* Attendance Data */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-neutral-400">Loading attendance data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredData.map((data) => (
            <div key={data.employee.id} className="bg-white rounded-2xl shadow-sm border border-gray-100">
              {/* Employee Header */}
              <div className="p-6 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{data.employee.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-neutral-400">{data.employee.email}</p>
                    <p className="text-sm text-gray-600 dark:text-neutral-400">{data.employee.department}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-neutral-400">Attendance:</span>
                        <span className="ml-1 font-medium">
                          {(Number(data.stats.attendancePercentage) || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-neutral-400">Avg Hours:</span>
                        <span className="ml-1 font-medium">
                          {formatDuration(data.stats.averageHours)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="mt-4 grid grid-cols-5 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-gray-600 dark:text-neutral-400">Present</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{data.stats.presentDays}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 dark:text-neutral-400">Late</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{data.stats.lateDays}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 dark:text-neutral-400">Absent</p>
                    <p className="font-semibold text-red-600">{data.stats.absentDays}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 dark:text-neutral-400">Total Hours</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatDuration(Number(data.stats.totalHours) || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Daily Records */}
              <div className="p-6">
                {data.records.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-left text-sm font-medium text-gray-600 dark:text-neutral-400 dark:text-neutral-400">
                          <th className="pb-2">Date</th>
                          <th className="pb-2">Login</th>
                          <th className="pb-2">Logout</th>
                          <th className="pb-2">Hours</th>
                          <th className="pb-2">Breaks</th>
                          <th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm dark:text-neutral-300 divide-y divide-gray-200 dark:divide-neutral-800/50">
                        {(() => {
                          const monthStart = startOfMonth(selectedMonth);
                          const monthEnd = endOfMonth(selectedMonth);
                          const today = new Date();
                          // Don't show future dates
                          const endLimit = monthEnd > today ? today : monthEnd;

                          // Generate an array of dates from the 1st of the month up to 'endLimit'
                          const daysInMonth = eachDayOfInterval({ start: monthStart, end: endLimit }).reverse(); // Reverse so newest is at the top

                          return daysInMonth.map((dayDate) => {
                            const dateStr = format(dayDate, 'MMM dd, yyyy');
                            const dayOfWeek = dayDate.getDay();
                            const employeeRoleSchedule = roleSchedules[data.employee.role];
                            const restDays = employeeRoleSchedule?.restDays || [0, 6];
                            const isRestDay = restDays.includes(dayOfWeek);

                            // Find if there's a record for this specific day
                            const record = data.records.find(r => r.date === dateStr);

                            // Check if there is an approved leave for this day
                            const isOnLeave = employeeLeaveRequests.some(leave => {
                              if (leave.status !== 'approved') return false;
                              const leaveStart = new Date(`${leave.startDate}T00:00:00`);
                              const leaveEnd = new Date(`${leave.endDate}T23:59:59`);
                              return dayDate >= leaveStart && dayDate <= leaveEnd;
                            });

                            let status: 'present' | 'late' | 'absent' | 'rest-day' | 'on-leave';
                            if (isOnLeave) {
                              status = 'on-leave';
                            } else if (isRestDay && !record?.clockIn) {
                              status = 'rest-day';
                            } else if (!record?.clockIn) {
                              status = 'absent';
                            } else {
                              status = record.isLate ? 'late' : 'present';
                            }

                            // Define status colors (matching the dark mode fixes we applied globally)
                            let statusBadgeClass = '';
                            switch (status) {
                              case 'present': statusBadgeClass = 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20'; break;
                              case 'absent': statusBadgeClass = 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20'; break;
                              case 'late': statusBadgeClass = 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20'; break;
                              case 'on-leave': statusBadgeClass = 'bg-brand/10 text-brand dark:text-brand border border-brand/30 dark:border-brand/30'; break;
                              case 'rest-day': statusBadgeClass = 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700'; break;
                            }

                            return (
                              <tr key={dateStr} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {dateStr}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-neutral-400">
                                    {format(dayDate, 'EEEE')}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {record ? formatTime(record.clockIn || null) : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {record ? formatTime(record.clockOut || null) : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {record ? formatDuration(record.hoursWorked || 0) : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {record && record.breaks.length > 0 ? (
                                    <div className="flex items-center">
                                      <Coffee className="h-4 w-4 mr-2 text-gray-400 dark:text-neutral-500" />
                                      {record.breaks.length}
                                      <span className="text-gray-500 dark:text-neutral-400 ml-1 text-xs">
                                        ({record.totalBreakMinutes || 0}m)
                                      </span>
                                    </div>
                                  ) : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex flex-col space-y-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium w-fit ${statusBadgeClass}`}>
                                      {status === 'rest-day' ? <Info className="w-3 h-3 mr-1" /> : null}
                                      {status === 'on-leave' ? <Calendar className="w-3 h-3 mr-1" /> : null}
                                      <span className="capitalize">{status === 'rest-day' ? 'Rest Day' : status.replace('-', ' ')}</span>
                                    </span>

                                    {record?.isLate && record?.lateReason && (
                                      <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded border dark:border-amber-500/20 max-w-[200px] truncate" title={record.lateReason}>
                                        <strong>Late:</strong> {record.lateReason}
                                      </div>
                                    )}
                                    {record?.isLateFromLunch && record?.lunchLateReason && (
                                      <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded border dark:border-orange-500/20 max-w-[200px] truncate" title={record.lunchLateReason}>
                                        <strong>Lunch Late:</strong> {record.lunchLateReason}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-neutral-400">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No attendance records found for this month</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredData.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 dark:text-neutral-400">No employees found matching your search</p>
            </div>
          )}
        </div>
      )}

      {/* Terms & Conditions Modal */}
      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </div>
  );
};

export default AttendanceLogsNew;

