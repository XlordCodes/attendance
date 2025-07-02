import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Users, 
  Search, 
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Download,
  Filter,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { attendanceServiceSubcollection } from '../../services/attendanceServiceSubcollection';
import { userService } from '../../services/userService';
import { AttendanceRecord, Employee } from '../../types';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
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
  overtimeHours: number;
}

interface EmployeeAttendanceData {
  employee: Employee;
  stats: AttendanceStats;
  records: AttendanceRecord[];
}

const AttendanceLogs: React.FC = () => {
  const [attendanceData, setAttendanceData] = useState<EmployeeAttendanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    loadEmployees();
    loadAttendanceData();
  }, [selectedMonth, selectedEmployee]);

  const loadEmployees = async () => {
    try {
      const employeesList = await userService.getAllUsers();
      setEmployees(employeesList);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadAttendanceData = async () => {
    setLoading(true);
    try {
      const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
      
      const allRecords = await attendanceServiceSubcollection.getAllAttendanceRecords(startDate, endDate);
      const employeesList = await userService.getAllUsers();
      
      let filteredEmployees = employeesList;
      if (selectedEmployee !== 'all') {
        filteredEmployees = employeesList.filter(emp => emp.id === selectedEmployee);
      }

      const attendanceDataPromises = filteredEmployees.map(async (employee) => {
        const employeeRecords = allRecords.filter(record => record.employeeId === employee.id);
        const daysInMonth = endOfMonth(selectedMonth).getDate();
        const stats = await attendanceService.getAttendanceStats(employee.id, daysInMonth);
        
        return {
          employee,
          stats,
          records: employeeRecords,
        };
      });

      const data = await Promise.all(attendanceDataPromises);
      setAttendanceData(data);
    } catch (error) {
      console.error('Error loading attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = () => {
    try {
      // Prepare data for export
      const exportData: any[] = [];
      
      attendanceData.forEach(({ employee, stats, records }) => {
        // Add employee summary row
        exportData.push({
          'Employee ID': employee.employeeId,
          'Employee Name': employee.name,
          'Department': employee.department,
          'Email': employee.email,
          'Month': format(selectedMonth, 'MMMM yyyy'),
          'Total Days': stats.totalDays,
          'Present Days': stats.presentDays,
          'Late Days': stats.lateDays,
          'Absent Days': stats.absentDays,
          'Attendance %': `${stats.attendancePercentage}%`,
          'Total Hours': stats.totalHours,
          'Average Hours': stats.averageHours,
          'Overtime Hours': stats.overtimeHours,
          'Date': '',
          'Clock In': '',
          'Clock Out': '',
          'Status': '',
          'Reason': '',
        });

        // Add individual records
        records.forEach(record => {
          exportData.push({
            'Employee ID': employee.employeeId,
            'Employee Name': employee.name,
            'Department': employee.department,
            'Email': employee.email,
            'Month': format(selectedMonth, 'MMMM yyyy'),
            'Total Days': '',
            'Present Days': '',
            'Late Days': '',
            'Absent Days': '',
            'Attendance %': '',
            'Total Hours': '',
            'Average Hours': '',
            'Overtime Hours': '',
            'Date': record.date,
            'Clock In': record.clockIn ? format(record.clockIn, 'HH:mm:ss') : '',
            'Clock Out': record.clockOut ? format(record.clockOut, 'HH:mm:ss') : '',
            'Status': record.status,
            'Reason': record.earlyLogoutReason || '',
          });
        });

        // Add empty row for separation
        exportData.push({});
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');

      // Style the worksheet
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      
      // Auto-size columns
      const colWidths = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        let maxWidth = 10;
        for (let r = range.s.r; r <= range.e.r; r++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          const cell = ws[cellRef];
          if (cell && cell.v) {
            const width = cell.v.toString().length;
            maxWidth = Math.max(maxWidth, width);
          }
        }
        colWidths.push({ wch: Math.min(maxWidth + 2, 50) });
      }
      ws['!cols'] = colWidths;

      // Generate buffer and save file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const fileName = `attendance-report-${format(selectedMonth, 'yyyy-MM')}.xlsx`;
      saveAs(data, fileName);
      
      toast.success('Attendance report exported successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export attendance report');
    }
  };

  const filteredData = attendanceData.filter(({ employee }) =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const overallStats = attendanceData.reduce(
    (acc, { stats }) => ({
      totalEmployees: acc.totalEmployees + 1,
      avgAttendance: acc.avgAttendance + stats.attendancePercentage,
      totalHours: acc.totalHours + stats.totalHours,
      totalOvertimeHours: acc.totalOvertimeHours + stats.overtimeHours,
    }),
    { totalEmployees: 0, avgAttendance: 0, totalHours: 0, totalOvertimeHours: 0 }
  );

  if (attendanceData.length > 0) {
    overallStats.avgAttendance = overallStats.avgAttendance / overallStats.totalEmployees;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <span className="badge badge-success inline-flex items-center space-x-1">
          <CheckCircle className="w-3 h-3" />
          <span>Present</span>
        </span>;
      case 'late':
        return <span className="badge badge-warning inline-flex items-center space-x-1">
          <AlertCircle className="w-3 h-3" />
          <span>Late</span>
        </span>;
      case 'absent':
        return <span className="badge badge-error inline-flex items-center space-x-1">
          <XCircle className="w-3 h-3" />
          <span>Absent</span>
        </span>;
      default:
        return <span className="badge badge-gray">Unknown</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="font-outfit text-3xl font-bold text-gray-900 mb-2">
            Attendance Logs
          </h1>
          <p className="font-inter text-gray-600">
            Comprehensive attendance tracking and reporting system
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={loadAttendanceData}
            disabled={loading}
            className="btn-secondary inline-flex items-center space-x-2"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={handleExportToExcel}
            className="bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors inline-flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-modern p-6 hover:shadow-soft-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <span className="font-space text-xs text-gray-500 font-medium">TOTAL</span>
          </div>
          <div className="space-y-1">
            <p className="font-inter text-sm font-medium text-gray-600">Employees</p>
            <p className="font-space text-2xl font-bold text-gray-900">
              {overallStats.totalEmployees}
            </p>
          </div>
        </div>

        <div className="card-modern p-6 hover:shadow-soft-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <span className="font-space text-xs text-gray-500 font-medium">AVERAGE</span>
          </div>
          <div className="space-y-1">
            <p className="font-inter text-sm font-medium text-gray-600">Attendance</p>
            <p className="font-space text-2xl font-bold text-gray-900">
              {overallStats.avgAttendance.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="card-modern p-6 hover:shadow-soft-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary-50 rounded-xl">
              <Clock className="w-6 h-6 text-primary-600" />
            </div>
            <span className="font-space text-xs text-gray-500 font-medium">TOTAL</span>
          </div>
          <div className="space-y-1">
            <p className="font-inter text-sm font-medium text-gray-600">Hours</p>
            <p className="font-space text-2xl font-bold text-gray-900">
              {overallStats.totalHours.toFixed(1)}h
            </p>
          </div>
        </div>

        <div className="card-modern p-6 hover:shadow-soft-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-accent-50 rounded-xl">
              <Calendar className="w-6 h-6 text-accent-600" />
            </div>
            <span className="font-space text-xs text-gray-500 font-medium">OVERTIME</span>
          </div>
          <div className="space-y-1">
            <p className="font-inter text-sm font-medium text-gray-600">Hours</p>
            <p className="font-space text-2xl font-bold text-gray-900">
              {overallStats.totalOvertimeHours.toFixed(1)}h
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-modern p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-outfit text-lg font-semibold text-gray-900">Filters & Search</h2>
          <Filter className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-modern pl-10 w-full font-inter"
            />
          </div>

          {/* Employee Filter */}
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="input-modern w-full font-inter"
          >
            <option value="all">All Employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>

          {/* Month Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
              className="btn-secondary p-2 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 text-center">
              <span className="font-inter text-sm font-semibold text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                {format(selectedMonth, 'MMMM yyyy')}
              </span>
            </div>
            <button
              onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
              className="btn-secondary p-2 rounded-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="card-modern overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-outfit text-lg font-semibold text-gray-900">
            Employee Attendance Summary
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="table-modern">
            <thead>
              <tr>
                <th className="table-header font-inter">Employee</th>
                <th className="table-header font-inter">Attendance</th>
                <th className="table-header font-inter">Present</th>
                <th className="table-header font-inter">Late</th>
                <th className="table-header font-inter">Total Hours</th>
                <th className="table-header font-inter">Avg Hours</th>
                <th className="table-header font-inter">Overtime</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="table-cell text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center animate-pulse">
                        <BarChart3 className="w-5 h-5 text-primary-600" />
                      </div>
                      <p className="font-inter text-gray-600">Loading attendance data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-cell text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="font-inter text-gray-600">No attendance data found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map(({ employee, stats }) => (
                  <tr key={employee.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-soft">
                          <span className="font-outfit font-bold text-white text-sm">
                            {employee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-inter font-semibold text-gray-900">
                            {employee.name}
                          </div>
                          <div className="font-inter text-sm text-gray-500">
                            {employee.employeeId} • {employee.department}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{ width: `${Math.min(stats.attendancePercentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="font-space text-sm font-bold text-gray-900">
                          {stats.attendancePercentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="badge badge-success font-space font-bold">
                        {stats.presentDays}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="badge badge-warning font-space font-bold">
                        {stats.lateDays}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="font-space font-bold text-gray-900">
                        {stats.totalHours.toFixed(1)}h
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="font-space font-bold text-gray-900">
                        {stats.averageHours.toFixed(1)}h
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge font-space font-bold ${
                        stats.overtimeHours > 0 
                          ? 'badge-primary' 
                          : 'badge-gray'
                      }`}>
                        {stats.overtimeHours.toFixed(1)}h
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceLogs;
