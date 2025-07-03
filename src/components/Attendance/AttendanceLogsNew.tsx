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
  XCircle,
  AlertCircle,
  Coffee
} from 'lucide-react';
import { attendanceServiceNew, AttendanceDocumentDisplay } from '../../services/attendanceServiceNew';
import { userService } from '../../services/userService';
import { Employee } from '../../types';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, eachDayOfInterval } from 'date-fns';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  attendancePercentage: number;
  averageHours: number;
  totalHours: number;
  totalBreaks: number;
  afkTime: number;
}

interface EmployeeAttendanceData {
  employee: Employee;
  stats: AttendanceStats;
  records: AttendanceDocumentDisplay[];
}

const AttendanceLogsNew: React.FC = () => {
  const [attendanceData, setAttendanceData] = useState<EmployeeAttendanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      loadAttendanceData();
    }
  }, [employees, selectedMonth, selectedEmployee]);

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
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');

      const employeesToLoad = selectedEmployee === 'all' 
        ? employees 
        : employees.filter(emp => emp.id === selectedEmployee);

      const attendanceDataPromises = employeesToLoad.map(async (employee) => {
        try {
          const records = await attendanceServiceNew.getAttendanceRange(
            employee.id,
            startDate,
            endDate
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

  const calculateAttendanceStats = (
    records: AttendanceDocumentDisplay[], 
    monthStart: Date, 
    monthEnd: Date
  ): AttendanceStats => {
    const workingDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
      .filter(day => day.getDay() !== 0 && day.getDay() !== 6) // Exclude weekends
      .length;

    const presentDays = records.filter(r => r.loginTime).length;
    const lateDays = records.filter(r => r.isLate).length;
    const absentDays = workingDays - presentDays;

    const totalHours = records.reduce((sum, r) => sum + r.workedHours, 0);
    const totalBreaks = records.reduce((sum, r) => sum + r.breaks.length, 0);
    const afkTime = records.reduce((sum, r) => sum + r.afkTime, 0);

    return {
      totalDays: workingDays,
      presentDays,
      lateDays,
      absentDays,
      attendancePercentage: workingDays > 0 ? (presentDays / workingDays) * 100 : 0,
      averageHours: presentDays > 0 ? totalHours / presentDays : 0,
      totalHours,
      totalBreaks,
      afkTime
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
    totalBreaks: 0,
    afkTime: 0
  });

  const filteredData = attendanceData.filter(data =>
    data.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    data.employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    data.employee.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--';
    return format(date, 'HH:mm');
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getStatusColor = (status: 'present' | 'late' | 'absent') => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-100';
      case 'late': return 'text-yellow-600 bg-yellow-100';
      case 'absent': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: 'present' | 'late' | 'absent') => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4" />;
      case 'late': return <AlertCircle className="h-4 w-4" />;
      case 'absent': return <XCircle className="h-4 w-4" />;
      default: return <XCircle className="h-4 w-4" />;
    }
  };

  const exportToExcel = () => {
    try {
      const exportData = attendanceData.flatMap(data =>
        data.records.map(record => ({
          'Employee Name': data.employee.name,
          'Email': data.employee.email,
          'Department': data.employee.department,
          'Date': record.date,
          'Login Time': formatTime(record.loginTime),
          'Logout Time': formatTime(record.logoutTime),
          'Hours Worked': formatDuration(record.workedHours),
          'Is Late': record.isLate ? 'Yes' : 'No',
          'Late Reason': record.lateReason,
          'Breaks Count': record.breaks.length,
          'AFK Time (minutes)': record.afkTime,
          'Status': record.loginTime ? (record.isLate ? 'Late' : 'Present') : 'Absent'
        }))
      );

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const file = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const monthName = format(selectedMonth, 'MMMM-yyyy');
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
        <h1 className="text-2xl font-bold text-gray-900">Attendance Logs</h1>
        <button
          onClick={exportToExcel}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{totalStats.totalEmployees}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(totalStats.totalHours)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Present Days</p>
              <p className="text-2xl font-bold text-gray-900">{totalStats.totalPresent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Late Days</p>
              <p className="text-2xl font-bold text-gray-900">{totalStats.totalLate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
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
                {format(selectedMonth, 'MMMM yyyy')}
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
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Attendance Data */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredData.map((data) => (
            <div key={data.employee.id} className="bg-white rounded-lg shadow-sm border">
              {/* Employee Header */}
              <div className="p-6 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{data.employee.name}</h3>
                    <p className="text-sm text-gray-600">{data.employee.email}</p>
                    <p className="text-sm text-gray-600">{data.employee.department}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-4 text-sm">
                      <div>
                        <span className="text-gray-600">Attendance:</span>
                        <span className="ml-1 font-medium">
                          {data.stats.attendancePercentage.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Avg Hours:</span>
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
                    <p className="text-gray-600">Present</p>
                    <p className="font-semibold text-green-600">{data.stats.presentDays}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600">Late</p>
                    <p className="font-semibold text-yellow-600">{data.stats.lateDays}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600">Absent</p>
                    <p className="font-semibold text-red-600">{data.stats.absentDays}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600">Total Hours</p>
                    <p className="font-semibold text-blue-600">{formatDuration(data.stats.totalHours)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600">AFK Time</p>
                    <p className="font-semibold text-purple-600">{data.stats.afkTime}m</p>
                  </div>
                </div>
              </div>

              {/* Daily Records */}
              <div className="p-6">
                {data.records.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-left text-sm font-medium text-gray-600">
                          <th className="pb-2">Date</th>
                          <th className="pb-2">Login</th>
                          <th className="pb-2">Logout</th>
                          <th className="pb-2">Hours</th>
                          <th className="pb-2">Breaks</th>
                          <th className="pb-2">AFK</th>
                          <th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {data.records.map((record) => {
                          const status = !record.loginTime ? 'absent' : record.isLate ? 'late' : 'present';
                          return (
                            <tr key={record.date} className="border-t">
                              <td className="py-2 font-medium">
                                {format(new Date(record.date), 'MMM dd, yyyy')}
                              </td>
                              <td className="py-2">{formatTime(record.loginTime)}</td>
                              <td className="py-2">{formatTime(record.logoutTime)}</td>
                              <td className="py-2">{formatDuration(record.workedHours)}</td>
                              <td className="py-2">
                                <div className="flex items-center">
                                  <Coffee className="h-3 w-3 mr-1 text-gray-400" />
                                  {record.breaks.length}
                                </div>
                              </td>
                              <td className="py-2">{record.afkTime}m</td>
                              <td className="py-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                                  {getStatusIcon(status)}
                                  <span className="ml-1 capitalize">{status}</span>
                                </span>
                                {record.isLate && record.lateReason && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {record.lateReason}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
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
              <p className="text-gray-500">No employees found matching your search</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceLogsNew;
