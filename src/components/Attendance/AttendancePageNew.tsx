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
import { attendanceServiceNew, AttendanceDocumentDisplay } from '../../services/attendanceServiceNew';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
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
  totalAfkTime: number;
}

const AttendancePageNew: React.FC = () => {
  const { employee } = useAuth();
  const [records, setRecords] = useState<AttendanceDocumentDisplay[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    lateDays: 0,
    absentDays: 0,
    attendancePercentage: 0,
    averageHours: 0,
    totalHours: 0,
    totalAfkTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    if (employee) {
      loadAttendanceData();
    }
  }, [employee, selectedMonth]);

  const loadAttendanceData = async () => {
    if (!employee) return;
    
    setLoading(true);
    try {
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');

      const attendanceRecords = await attendanceServiceNew.getAttendanceRange(
        employee.id,
        startDate,
        endDate
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

  const calculateStats = (attendanceRecords: AttendanceDocumentDisplay[]) => {
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(r => r.loginTime).length;
    const lateDays = attendanceRecords.filter(r => r.isLate).length;
    const absentDays = totalDays - presentDays;
    const totalHours = attendanceRecords.reduce((sum, r) => sum + r.workedHours, 0);
    const totalAfkTime = attendanceRecords.reduce((sum, r) => sum + r.afkTime, 0);
    
    setStats({
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      attendancePercentage: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
      averageHours: presentDays > 0 ? totalHours / presentDays : 0,
      totalHours,
      totalAfkTime
    });
  };

  const getRecordStatus = (record: AttendanceDocumentDisplay): string => {
    if (!record.loginTime) return 'absent';
    if (record.isLate) return 'late';
    return 'present';
  };

  const getStatusIcon = (record: AttendanceDocumentDisplay) => {
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

  const getStatusColor = (record: AttendanceDocumentDisplay) => {
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
              <p className="text-xs text-gray-500">AFK: {formatMinutes(stats.totalAfkTime)}</p>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AFK Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.length > 0 ? (
                records.map((record) => {
                  const recordDate = new Date(record.date);
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
                        {record.loginTime ? format(record.loginTime, 'HH:mm') : '--:--'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.logoutTime ? format(record.logoutTime, 'HH:mm') : '--:--'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration(record.workedHours)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.breaks.length} ({formatMinutes(record.breaks.reduce((sum, b) => {
                          const duration = b.end && b.start 
                            ? Math.floor((b.end.getTime() - b.start.getTime()) / (1000 * 60))
                            : 0;
                          return sum + duration;
                        }, 0))})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatMinutes(record.afkTime)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
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
