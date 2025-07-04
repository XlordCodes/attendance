import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  User,
  Eye
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from 'date-fns';
import { userService } from '../../services/userService';
import { globalAttendanceService } from '../../services/globalAttendanceService';
import { Employee } from '../../types';
import { formatToDDMMYYYY, parseDDMMYYYY } from '../../utils/dateUtils';

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
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'today' | 'monthly'>('today');

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      
      // Get all employees
      const employees = await userService.getAllEmployees();
      
      if (viewMode === 'today') {
        // Load today's attendance
        const attendancePromises = employees.map(async (employee) => {
          try {
            const records = await globalAttendanceService.getAttendanceRecords(employee.uid);
            const todayRecord = records.find(record => 
              record.date === selectedDate
            );
            
            if (todayRecord) {
              const clockInTime = todayRecord.clockIn ? 
                new Date(`2000-01-01T${todayRecord.clockIn}:00`) : null;
              const lateThreshold = new Date(`2000-01-01T09:30:00`); // 9:30 AM
              
              const status = clockInTime && clockInTime > lateThreshold ? 'late' : 'present';
              
              return {
                employee,
                status: status as 'present' | 'absent' | 'late' | 'on-leave',
                clockInTime: todayRecord.clockIn,
                clockOutTime: todayRecord.clockOut,
                totalHours: todayRecord.totalHours || 0,
                breakDuration: todayRecord.breakDuration || 0
              };
            } else {
              return {
                employee,
                status: 'absent' as const
              };
            }
          } catch (error) {
            console.error(`Error loading attendance for ${employee.name}:`, error);
            return {
              employee,
              status: 'absent' as const
            };
          }
        });
        
        const attendance = await Promise.all(attendancePromises);
        setEmployeeAttendance(attendance);
        
        // Calculate stats
        const present = attendance.filter(a => a.status === 'present').length;
        const late = attendance.filter(a => a.status === 'late').length;
        const absent = attendance.filter(a => a.status === 'absent').length;
        const total = employees.length;
        
        setAttendanceStats({
          totalEmployees: total,
          presentToday: present + late, // Include late as present
          absentToday: absent,
          lateToday: late,
          attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0
        });
      } else {
        // Load monthly data
        await loadMonthlyData(employees);
      }
    } catch (error) {
      console.error('Failed to load attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyData = async (employees: Employee[]) => {
    try {
      const selectedDateObj = parseDDMMYYYY(selectedDate);
      const monthStart = startOfMonth(selectedDateObj);
      const monthEnd = endOfMonth(selectedDateObj);
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
      
      const dailyData: DailyAttendance[] = [];
      
      for (const day of daysInMonth) {
        const dayStr = formatToDDMMYYYY(day);
        let presentCount = 0;
        let lateCount = 0;
        
        for (const employee of employees) {
          try {
            const records = await globalAttendanceService.getAttendanceRecords(employee.uid);
            const dayRecord = records.find(record => record.date === dayStr);
            
            if (dayRecord && dayRecord.clockIn) {
              const clockInTime = new Date(`2000-01-01T${dayRecord.clockIn}:00`);
              const lateThreshold = new Date(`2000-01-01T09:30:00`);
              
              if (clockInTime > lateThreshold) {
                lateCount++;
              } else {
                presentCount++;
              }
            }
          } catch (error) {
            // Employee not found or no attendance data
            continue;
          }
        }
        
        const totalPresent = presentCount + lateCount;
        const absent = employees.length - totalPresent;
        const attendanceRate = employees.length > 0 ? 
          Math.round((totalPresent / employees.length) * 100) : 0;
        
        dailyData.push({
          date: dayStr,
          totalEmployees: employees.length,
          present: totalPresent,
          absent,
          late: lateCount,
          attendanceRate
        });
      }
      
      setDailyAttendance(dailyData);
      
      // Calculate monthly average
      const avgAttendanceRate = dailyData.length > 0 ? 
        Math.round(dailyData.reduce((sum, day) => sum + day.attendanceRate, 0) / dailyData.length) : 0;
      
      const latestDay = dailyData[dailyData.length - 1];
      setAttendanceStats({
        totalEmployees: employees.length,
        presentToday: latestDay?.present || 0,
        absentToday: latestDay?.absent || 0,
        lateToday: latestDay?.late || 0,
        attendanceRate: avgAttendanceRate
      });
    } catch (error) {
      console.error('Failed to load monthly data:', error);
    }
  };

  useEffect(() => {
    loadAttendanceData();
  }, [selectedDate, viewMode]);

  const filteredEmployeeAttendance = employeeAttendance.filter(attendance => {
    const matchesSearch = attendance.employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attendance.employee.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || attendance.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const exportAttendanceData = () => {
    try {
      let csvContent = '';
      
      if (viewMode === 'today') {
        // Export today's attendance
        csvContent = 'Employee Name,Employee ID,Designation,Status,Clock In,Clock Out,Total Hours,Break Duration\n';
        employeeAttendance.forEach(attendance => {
          const designation = attendance.employee.designation || attendance.employee.Designation || 'Employee';
          csvContent += `"${attendance.employee.name}","${attendance.employee.employeeId}","${designation}","${attendance.status}","${attendance.clockInTime || 'N/A'}","${attendance.clockOutTime || 'N/A'}","${attendance.totalHours || 0}","${attendance.breakDuration || 0}"\n`;
        });
      } else {
        // Export monthly data
        csvContent = 'Date,Total Employees,Present,Absent,Late,Attendance Rate %\n';
        dailyAttendance.forEach(day => {
          csvContent += `"${day.date}","${day.totalEmployees}","${day.present}","${day.absent}","${day.late}","${day.attendanceRate}"\n`;
        });
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_${viewMode}_${selectedDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      case 'on-leave':
        return 'bg-blue-100 text-blue-800';
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
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'today' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'monthly' 
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
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={exportAttendanceData}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{attendanceStats.totalEmployees}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Present {viewMode === 'today' ? 'Today' : 'Average'}</p>
              <p className="text-2xl font-bold text-gray-900">{attendanceStats.presentToday}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Absent {viewMode === 'today' ? 'Today' : 'Average'}</p>
              <p className="text-2xl font-bold text-gray-900">{attendanceStats.absentToday}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
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
        <div className="bg-white rounded-lg border border-gray-200">
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
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployeeAttendance.map((attendance) => (
                  <tr key={attendance.employee.uid} className="hover:bg-gray-50">
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
                      {attendance.totalHours ? `${attendance.totalHours.toFixed(1)}h` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {attendance.breakDuration ? `${attendance.breakDuration}m` : 'N/A'}
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
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Monthly Attendance Overview - {format(parseDDMMYYYY(selectedDate), 'MMMM yyyy')}
            </h2>
          </div>

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
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          day.attendanceRate >= 80 ? 'bg-green-500' : 
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
