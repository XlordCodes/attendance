import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Search, 
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Coffee,
  Home,
  MapPin
} from 'lucide-react';
import { attendanceService } from '../../services/attendanceService';
import { AttendanceRecord } from '../../types';
import { format, subMonths, addMonths, parseISO, isToday } from 'date-fns';
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
  overtimeHours: number;
}

const AttendancePage: React.FC = () => {
  const { employee } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    lateDays: 0,
    absentDays: 0,
    attendancePercentage: 0,
    averageHours: 0,
    totalHours: 0,
    overtimeHours: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (employee) {
      loadAttendanceData();
    }
  }, [employee, selectedMonth]);

  const loadAttendanceData = async () => {
    if (!employee) return;
    
    setLoading(true);
    try {
      const attendanceRecords = await attendanceService.getAttendanceHistory(
        employee.id,
        30
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

  const calculateStats = (attendanceRecords: AttendanceRecord[]) => {
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(r => r.status === 'present').length;
    const lateDays = attendanceRecords.filter(r => r.status === 'late').length;
    const absentDays = attendanceRecords.filter(r => r.status === 'absent').length;
    const totalHours = attendanceRecords.reduce((sum, r) => sum + r.totalHours, 0);
    const overtimeHours = attendanceRecords.reduce((sum, r) => sum + r.overtime, 0);
    
    setStats({
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      attendancePercentage: totalDays > 0 ? ((presentDays + lateDays) / totalDays) * 100 : 0,
      averageHours: totalDays > 0 ? totalHours / totalDays : 0,
      totalHours,
      overtimeHours
    });
  };

  const getStatusIcon = (status: string) => {
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

  const getStatusColor = (status: string) => {
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

  const getWorkTypeIcon = (workType: string) => {
    switch (workType) {
      case 'office':
        return <Home className="w-3 h-3 text-blue-600" />;
      case 'remote':
        return <MapPin className="w-3 h-3 text-purple-600" />;
      case 'hybrid':
        return <Coffee className="w-3 h-3 text-orange-600" />;
      default:
        return <Clock className="w-3 h-3 text-gray-600" />;
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.status.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || record.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handlePreviousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };

  const handleExport = () => {
    toast.success('Export functionality coming soon!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center animate-pulse mb-4">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <p className="text-gray-600">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">My Attendance</h1>
            <p className="text-gray-600">
              Track your attendance history and performance
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            {/* Month Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviousMonth}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-900 px-3">
                {format(selectedMonth, 'MMMM yyyy')}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-md">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">ATTENDANCE</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.attendancePercentage.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500">
              {stats.presentDays + stats.lateDays} of {stats.totalDays} days
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-md">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">HOURS</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">Total Hours</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalHours.toFixed(1)}h
            </p>
            <p className="text-xs text-gray-500">
              Avg: {stats.averageHours.toFixed(1)}h/day
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-md">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">OVERTIME</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">Overtime Hours</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.overtimeHours.toFixed(1)}h
            </p>
            <p className="text-xs text-gray-500">
              This month
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 rounded-md">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">PUNCTUALITY</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">Late Days</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.lateDays}
            </p>
            <p className="text-xs text-gray-500">
              {stats.lateDays === 0 ? 'Perfect punctuality!' : 'Room for improvement'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search attendance..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <option value="all">All Status</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
              </select>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            Showing {filteredRecords.length} of {records.length} records
          </div>
        </div>
      </div>

      {/* Attendance Records */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Attendance Records</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clock In
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clock Out
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Type
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRecords.map((record, index) => (
                <tr key={index} className={`hover:bg-gray-50 ${isToday(parseISO(record.date)) ? 'bg-blue-50' : ''}`}>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <div className="text-sm font-medium text-gray-900">
                        {format(parseISO(record.date), 'MMM dd, yyyy')}
                      </div>
                      {isToday(parseISO(record.date)) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(parseISO(record.date), 'EEEE')}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${getStatusColor(record.status)}`}>
                      {getStatusIcon(record.status)}
                      <span className="ml-1 capitalize">{record.status}</span>
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-gray-900">
                      {record.clockIn ? format(record.clockIn, 'HH:mm') : '--:--'}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-gray-900">
                      {record.clockOut ? format(record.clockOut, 'HH:mm') : '--:--'}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-gray-900">
                      {record.totalHours.toFixed(1)}h
                    </div>
                    {record.overtime > 0 && (
                      <div className="text-xs text-purple-600">
                        +{record.overtime.toFixed(1)}h OT
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-1">
                      {getWorkTypeIcon('office')}
                      <span className="text-sm text-gray-900 capitalize">
                        Office
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-gray-600">
                      -
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredRecords.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No attendance records found</p>
              <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
