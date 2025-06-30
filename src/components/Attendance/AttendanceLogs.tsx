import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Users, 
  Search, 
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { attendanceService } from '../../services/attendanceService';
import { employeeService } from '../../services/employeeService';
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
      const employeesList = await employeeService.getAllEmployees();
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
      
      const allRecords = await attendanceService.getAllAttendanceRecords(startDate, endDate);
      const employeesList = await employeeService.getAllEmployees();
      
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
          'WFH': '',
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
            'WFH': record.isWFH ? 'Yes' : 'No',
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Logs</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive attendance tracking and reporting
          </p>
        </div>
        
        <button
          onClick={handleExportToExcel}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export to Excel
        </button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.totalEmployees}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Attendance</p>
              <p className="text-2xl font-bold text-gray-900">
                {overallStats.avgAttendance.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">
                {overallStats.totalHours.toFixed(1)}h
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overtime Hours</p>
              <p className="text-2xl font-bold text-gray-900">
                {overallStats.totalOvertimeHours.toFixed(1)}h
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Employee Filter */}
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>

          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium px-3 py-2 bg-gray-50 rounded-lg">
              {format(selectedMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadAttendanceData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Present Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Late Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overtime
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Loading attendance data...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No attendance data found
                  </td>
                </tr>
              ) : (
                filteredData.map(({ employee, stats }) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {employee.name.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {employee.employeeId} • {employee.department}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${
                              stats.attendancePercentage >= 90
                                ? 'bg-green-500'
                                : stats.attendancePercentage >= 75
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(stats.attendancePercentage, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {stats.attendancePercentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {stats.presentDays}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {stats.lateDays}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stats.totalHours.toFixed(1)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stats.averageHours.toFixed(1)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        stats.overtimeHours > 0 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-gray-100 text-gray-800'
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
