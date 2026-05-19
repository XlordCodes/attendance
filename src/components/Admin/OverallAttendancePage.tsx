import { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  User,
  ChevronDown
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { userService } from '../../services/userService';
import { globalAttendanceService } from '../../services/globalAttendanceService';
import { getIndividualMonthlyReport, buildMonthlyReportAggregates } from '../../services/reportService';
import { downloadMonthlyReportCSV } from '../../services/exportService';
import { Employee } from '../../types';
import type { MonthlyReport } from '../../services/reportService';
import type { MonthlyReportAggregates } from '../../services/exportService';
import { formatToDDMMYYYY, parseDDMMYYYY } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

interface AttendanceStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  attendanceRate: number;
}

interface EmployeeAttendance {
  employee: Employee;
  status: 'present' | 'absent' | 'late' | 'on-leave';
  clockInTime?: string;
  clockOutTime?: string;
  totalHours?: number;
  breakDuration?: number;
  lateReason?: string | null;
}

interface DailyAttendance {
  date: string;
  totalEmployees: number;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
}

const OverallAttendancePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(formatToDDMMYYYY(new Date()));
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    attendanceRate: 0
  });
  const [employeeAttendance, setEmployeeAttendance] = useState<EmployeeAttendance[]>([]);
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | 'ALL'>('ALL');
  const [employeeSearchText, setEmployeeSearchText] = useState('');
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [exportReport, setExportReport] = useState<MonthlyReportAggregates | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'today' | 'monthly'>('today');

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const employees = await userService.getAllEmployees();
        setAllEmployees(employees);
      } catch (error) {
        console.error('Error loading employees:', error);
      }
    };
    loadEmployees();
  }, []);

  // Sync search text when selected employee changes (e.g., reset to ALL)
  useEffect(() => {
    if (selectedEmployeeId === 'ALL') {
      setEmployeeSearchText('');
    } else {
      const emp = allEmployees.find(e => e.id === selectedEmployeeId);
      if (emp) {
        setEmployeeSearchText(emp.name);
      }
    }
  }, [selectedEmployeeId, allEmployees]);

  const loadTodayAttendance = async (employees: Employee[]) => {
    try {
      console.log(`📅 Loading attendance for date: ${selectedDate}`);

      // Get all attendance records for the selected date
      const attendanceByUser = await globalAttendanceService.getAllAttendanceForDate(selectedDate);
      console.log('📊 Attendance data by user:', attendanceByUser);

      const employeeAttendanceData: EmployeeAttendance[] = [];
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;

      for (const employee of employees) {
        const employeeId = employee.uid || employee.id; // Use uid if available, otherwise use id
        if (!employeeId) continue; // Skip employees without UID/ID

        const attendanceRecord = attendanceByUser[employeeId];

        if (attendanceRecord && attendanceRecord.clockIn) {
          // Employee has attendance record for this date
          let status: 'present' | 'absent' | 'late' = 'present';

          // Single source of truth: the DB is_late flag takes priority over any
          // derived/dynamic status, then fall back to the transformer's status,
          // finally default to 'present' (clock-in exists but no late flag).
          if (attendanceRecord.isLate) {
            status = 'late';
          } else if (attendanceRecord.status === 'late') {
            status = 'late';
          } else {
            status = 'present';
          }

          // Format clock times
          const clockInTime = attendanceRecord.clockIn ?
            format(attendanceRecord.clockIn, 'HH:mm') : undefined;
          const clockOutTime = attendanceRecord.clockOut ?
            format(attendanceRecord.clockOut, 'HH:mm') : undefined;

          employeeAttendanceData.push({
            employee,
            status,
            clockInTime,
            clockOutTime,
            totalHours: (attendanceRecord.totalHours != null ? Number(attendanceRecord.totalHours)
              : (attendanceRecord.hoursWorked != null ? Number(attendanceRecord.hoursWorked) : 0)),
            breakDuration: attendanceRecord.totalBreakMinutes || 0,
            lateReason: attendanceRecord.lateReason || null
          });

          // Count by status
          if (status === 'present') {
            presentCount++;
          } else if (status === 'late') {
            lateCount++;
          }
        } else {
          // Employee has no attendance record - mark as absent
          employeeAttendanceData.push({
            employee,
            status: 'absent'
          });
          absentCount++;
        }
      }

      setEmployeeAttendance(employeeAttendanceData);

      // Calculate statistics
      const totalEmployees = employees.length;
      const totalPresent = presentCount + lateCount; // Late is considered present
      const attendanceRate = totalEmployees > 0 ? Math.round((totalPresent / totalEmployees) * 100) : 0;

      setAttendanceStats({
        totalEmployees,
        presentToday: totalPresent,
        absentToday: absentCount,
        lateToday: lateCount,
        attendanceRate
      });

      console.log(`📈 Stats - Total: ${totalEmployees}, Present: ${totalPresent}, Absent: ${absentCount}, Late: ${lateCount}, Rate: ${attendanceRate}%`);
    } catch (error) {
      console.error('❌ Error loading today\'s attendance:', error);
    }
  };

  const loadMonthlyData = async (employees: Employee[]) => {
    try {
      const selectedDateObj = parseDDMMYYYY(selectedDate);
      if (!selectedDateObj) {
        console.error('Invalid date format:', selectedDate);
        return;
      }

      const monthStart = startOfMonth(selectedDateObj);
      const monthEnd = endOfMonth(selectedDateObj);
      const startDateStr = formatToDDMMYYYY(monthStart);   // DD-MM-YYYY
      const endDateStr = formatToDDMMYYYY(monthEnd);     // DD-MM-YYYY
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
      const dayStrs = daysInMonth.map(d => formatToDDMMYYYY(d)); // all DD-MM-YYYY

      // ── STEP 1: ONE network call for the whole month ─────────────────────
      const allMonthData = await globalAttendanceService.getAllAttendanceForMonth(startDateStr, endDateStr);

      // ── STEP 2: Process in memory (no further network calls) ──────────────
      const dailyData: DailyAttendance[] = dayStrs.map(dayStr => {
        let presentCount = 0;
        let lateCount = 0;

        for (const employee of employees) {
          const employeeId = employee.uid || employee.id;
          const attendanceRecord = allMonthData[employeeId]?.[dayStr];

          if (attendanceRecord && attendanceRecord.clockIn) {
            if (attendanceRecord.isLate) {
              lateCount++;
            } else {
              presentCount++;
            }
          }
        }

        const totalPresent = presentCount + lateCount;
        const absent = employees.length - totalPresent;
        const attendanceRate = employees.length > 0
          ? Math.round((totalPresent / employees.length) * 100) : 0;

        return { date: dayStr, totalEmployees: employees.length, present: presentCount, absent, late: lateCount, attendanceRate };
      });

      setDailyAttendance(dailyData);

      // ── STEP 3: Monthly summary stats ────────────────────────────────────
      const avgAttendanceRate = dailyData.length > 0
        ? Math.round(dailyData.reduce((sum, day) => sum + day.attendanceRate, 0) / dailyData.length) : 0;

      const latestDay = dailyData[dailyData.length - 1];
      setAttendanceStats({
        totalEmployees: employees.length,
        presentToday: latestDay?.present ?? 0,
        absentToday: latestDay?.absent ?? 0,
        lateToday: latestDay?.late ?? 0,
        attendanceRate: avgAttendanceRate,
      });

      // ── STEP 4: Individual Monthly Report (Penalty Engine) ───────────────
      if (selectedEmployeeId !== 'ALL' && employees.length === 1) {
        const emp = employees[0];
        const month = selectedDateObj.getMonth() + 1;
        const year = selectedDateObj.getFullYear();
        try {
          const [report, aggregates] = await Promise.all([
            getIndividualMonthlyReport(emp.id, month, year),
            buildMonthlyReportAggregates(emp.id, month, year),
          ]);
          setMonthlyReport(report);
          setExportReport(aggregates);
        } catch (err) {
          console.error('Failed to fetch monthly report:', err);
          setMonthlyReport(null);
          setExportReport(null);
        }
      } else {
        setMonthlyReport(null);
        setExportReport(null);
      }
    } catch (error) {
      console.error('Failed to load monthly data:', error);
    }
  };

  useEffect(() => {
    const loadAttendanceData = async () => {
      try {
        setLoading(true);
        console.log(`🔄 Loading attendance data for ${selectedDate} in ${viewMode} mode`);

        if (allEmployees.length === 0) {
          setLoading(false);
          return;
        }

        if (viewMode === 'today') {
          await loadTodayAttendance(allEmployees);
        } else {
          // Monthly view: filter by selected employee if any
          const employeesToLoad = selectedEmployeeId === 'ALL'
            ? allEmployees
            : allEmployees.filter(emp => emp.id === selectedEmployeeId);
          await loadMonthlyData(employeesToLoad);
        }
      } catch (error) {
        console.error('❌ Failed to load attendance data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAttendanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, viewMode, allEmployees, selectedEmployeeId]);

  const filteredEmployeeAttendance = employeeAttendance.filter(attendance => {
    const matchesSearch = attendance.employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attendance.employee.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || attendance.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleEmployeeSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const val = employeeSearchText.trim();
    if (val === '') {
      setSelectedEmployeeId('ALL');
      return;
    }

    const emp = allEmployees.find(employee => employee.name === val);
    if (emp) {
      setSelectedEmployeeId(emp.id);
    } else {
      toast.error('Employee not found. Please select from the dropdown.');
    }
  };

  const handleDownloadMonthlyReport = async () => {
    if (!exportReport) return;

    try {
      const monthYear = `0${exportReport.month}`.slice(-2) + '-' + String(exportReport.year);
      downloadMonthlyReportCSV(exportReport, exportReport.employeeName, monthYear);
      toast.success('CSV export started.');
    } catch (err) {
      console.error('CSV download failed:', err);
      toast.error('Failed to generate CSV export.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full';
      case 'absent':
        return 'bg-rose-50 text-rose-700 border border-rose-100 rounded-full';
      case 'late':
        return 'bg-amber-50 text-amber-700 border border-amber-100 rounded-full';
      case 'on-leave':
        return 'bg-[#96C2DB]/10 text-gray-700 border border-[#96C2DB]/30 rounded-full';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'late':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overall Attendance</h1>
          <p className="text-gray-600">Monitor employee attendance patterns and export data</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('today')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'today'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Today
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Monthly
            </button>
          </div>
          <input
            type="date"
            value={selectedDate.split('-').reverse().join('-')} // Convert dd-MM-yyyy to yyyy-MM-dd for input
            onChange={(e) => {
              const [year, month, day] = e.target.value.split('-');
              setSelectedDate(`${day}-${month}-${year}`);
            }}
            className="px-3 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#96C2DB] focus:border-[#96C2DB] focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-[#E5EDF1] rounded-lg">
              <Users className="w-6 h-6 text-[#96C2DB]" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{attendanceStats.totalEmployees}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-[#E5EDF1] rounded-lg">
              <CheckCircle className="w-6 h-6 text-[#96C2DB]" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Present {viewMode === 'today' ? 'Today' : 'Average'}</p>
              <p className="text-2xl font-bold text-gray-900">{attendanceStats.presentToday}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-[#E5EDF1] rounded-lg">
              <XCircle className="w-6 h-6 text-[#96C2DB]" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Absent {viewMode === 'today' ? 'Today' : 'Average'}</p>
              <p className="text-2xl font-bold text-gray-900">{attendanceStats.absentToday}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-[#E5EDF1] rounded-lg">
              <BarChart3 className="w-6 h-6 text-[#96C2DB]" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-gray-900">{attendanceStats.attendanceRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Based on View Mode */}
      {viewMode === 'today' ? (
        // Today's Attendance Details
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Employee Attendance - {selectedDate}
              </h2>
              <div className="mt-4 sm:mt-0 flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#96C2DB] focus:border-[#96C2DB] focus:border-transparent"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#96C2DB] focus:border-[#96C2DB] focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
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
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Break Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Audit Data
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployeeAttendance.map((attendance) => (
                  <tr key={attendance.employee.uid || attendance.employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{attendance.employee.name}</div>
                          <div className="text-sm text-gray-500">
                            {attendance.employee.designation || attendance.employee.Designation || 'Employee'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(attendance.status)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(attendance.status)}`}>
                          {attendance.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {attendance.clockInTime || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {attendance.clockOutTime || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {typeof attendance.totalHours === 'number' ? `${attendance.totalHours.toFixed(1)}h` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {attendance.breakDuration ? `${attendance.breakDuration}m` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {attendance.lateReason ? (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border">
                          {attendance.lateReason}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredEmployeeAttendance.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No attendance records found</p>
            </div>
          )}
        </div>
      ) : (
        // Monthly View
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Monthly Attendance Overview - {parseDDMMYYYY(selectedDate) ? format(parseDDMMYYYY(selectedDate)!, 'MMMM yyyy') : selectedDate}
              </h2>
              <div className="mt-4 sm:mt-0">
                <form onSubmit={handleEmployeeSearch} className="flex items-center space-x-2">
                  <div className="relative w-full">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      list="employee-list-monthly"
                      placeholder="All Employees"
                      value={employeeSearchText}
                      onChange={(e) => setEmployeeSearchText(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 bg-transparent border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6633ee] focus:border-transparent appearance-none"
                    />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <datalist id="employee-list-monthly">
                    <option value="All Employees">All Employees</option>
                    {allEmployees.map((employee) => (
                      <option key={employee.id} value={employee.name}>
                        {employee.name}
                      </option>
                    ))}
                  </datalist>
                  <button
                    type="submit"
                    className="px-3 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 focus:ring-2 focus:ring-[#96C2DB] focus:border-[#96C2DB] focus:ring-offset-2 transition-colors"
                  >
                    Search
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Individual Monthly Report Summary (Penalty Engine) */}
          {viewMode === 'monthly' && selectedEmployeeId !== 'ALL' && monthlyReport && (
            <>
              <div className="p-6 pb-0 bg-gray-50 flex justify-end">
                <button
                  onClick={handleDownloadMonthlyReport}
                  disabled={!exportReport}
                  className="inline-flex items-center px-4 py-2 bg-white text-gray-900 border border-gray-200 text-sm font-medium rounded-lg hover:bg-[#E5EDF1] focus:ring-2 focus:ring-[#96C2DB] focus:border-[#96C2DB] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  📥 Export to CSV
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gray-50 border-b border-gray-200">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 border-gray-200">
                  <p className="text-sm font-medium text-gray-600">Total Logged Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{monthlyReport.rawTotalHours.toFixed(2)}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 border-gray-200">
                  <p className="text-sm font-medium text-gray-600">Late Days</p>
                  <p className="text-2xl font-bold text-gray-900">{monthlyReport.lateCount}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 border-gray-200">
                  <p className="text-sm font-medium text-gray-600">Late Penalty Deduction (hrs)</p>
                  <p className="text-2xl font-bold text-red-500">-{monthlyReport.penaltyDeduction.toFixed(2)}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 border-gray-200">
                  <p className="text-sm font-medium text-gray-600">Final Payable Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{monthlyReport.finalPayableHours.toFixed(2)}</p>
                </div>
              </div>
            </>)}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Employees
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Present
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Absent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Late
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attendance Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dailyAttendance.map((day) => (
                  <tr key={day.date} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {day.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {day.totalEmployees}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                        {day.present}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <XCircle className="w-4 h-4 text-red-600 mr-2" />
                        {day.absent}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-yellow-600 mr-2" />
                        {day.late}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${day.attendanceRate >= 80 ? 'bg-green-500' :
                          day.attendanceRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                        {day.attendanceRate}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverallAttendancePage;
