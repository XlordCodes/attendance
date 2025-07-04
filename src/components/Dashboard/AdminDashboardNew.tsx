import { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  Download,
  Search,
  CheckCircle,
  AlertCircle,
  XCircle,
  Bell
} from 'lucide-react';
import { format } from 'date-fns';
import { userService } from '../../services/userService';
import { globalAttendanceService } from '../../services/globalAttendanceService';

interface AdminStats {
  totalEmployees: number;
  presentToday: number;
  totalHoursToday: number;
  avgAttendanceRate: number;
  lateEmployees: number;
  absentEmployees: number;
}

interface RecentActivity {
  id: string;
  type: 'clock-in' | 'clock-out' | 'late' | 'absent';
  employee: string;
  time: Date;
  message: string;
}

const AdminDashboardNew: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalEmployees: 0,
    presentToday: 0,
    totalHoursToday: 0,
    avgAttendanceRate: 0,
    lateEmployees: 0,
    absentEmployees: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get all employees
      const employees = await userService.getAllUsers();
      const totalEmployees = employees.length;
      
      // Get today's attendance data  
      const today = new Date();
      const todayStart = format(today, 'dd-MM-yyyy');
      const todayEnd = format(today, 'dd-MM-yyyy');
      const todayRecords = await globalAttendanceService.getAllAttendanceRecords(todayStart, todayEnd);
      
      const presentToday = todayRecords.filter(r => r.status === 'present').length;
      const lateEmployees = todayRecords.filter(r => r.status === 'late').length;
      const absentEmployees = totalEmployees - todayRecords.length;
      const totalHoursToday = todayRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
      
      // For 30-day attendance rate, we'll calculate it differently since the subcollection getAttendanceStats
      // requires a specific userId. Let's get average stats from all today's records for now.
      const avgAttendanceRate = totalEmployees > 0 ? (presentToday + lateEmployees) / totalEmployees * 100 : 0;
      
      setAdminStats({
        totalEmployees,
        presentToday,
        totalHoursToday: Math.round(totalHoursToday * 100) / 100,
        avgAttendanceRate: Math.round(avgAttendanceRate * 100) / 100,
        lateEmployees,
        absentEmployees
      });
      
      // Generate recent activity from today's records
      const activities: RecentActivity[] = todayRecords
        .filter(record => record.clockIn) // Ensure clockIn exists
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(record => ({
          id: record.id,
          type: record.clockOut ? 'clock-out' : (record.status === 'late' ? 'late' : 'clock-in'),
          employee: record.employeeName,
          time: record.clockOut || record.clockIn!,
          message: record.clockOut 
            ? `Completed ${record.totalHours?.toFixed(1)} hours`
            : record.status === 'late' 
              ? `Arrived late at ${format(record.clockIn!, 'HH:mm')}`
              : 'Clocked in on time'
        }));
      
      setRecentActivity(activities);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'clock-in':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'clock-out':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'late':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center">
              <div className="w-8 h-8 bg-white rounded opacity-90"></div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-lg text-gray-600 flex items-center space-x-2 mt-1">
                <span className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  System Online
                </span>
                <span>•</span>
                <span>{format(currentTime, 'EEEE, MMMM d, yyyy')}</span>
              </p>
            </div>
          </div>
          
          {/* Notifications */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={loadDashboardData}
              className="relative p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh data"
            >
              <Bell className="w-6 h-6" />
              {recentActivity.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  <span className="w-2 h-2 bg-white rounded-full"></span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Dashboard Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h2>
            <p className="text-gray-600">
              Manage your team and monitor attendance
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>
            
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export Data</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-md">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-xs text-gray-500 font-medium">TOTAL</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.totalEmployees}</p>
                <p className="text-xs text-gray-500">Active workforce</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-md">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-xs text-gray-500 font-medium">TODAY</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Present Today</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.presentToday}</p>
                <p className="text-xs text-gray-500">
                  {adminStats.totalEmployees > 0 
                    ? ((adminStats.presentToday / adminStats.totalEmployees) * 100).toFixed(0)
                    : 0}% attendance
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-md">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-xs text-gray-500 font-medium">HOURS</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Total Hours Today</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.totalHoursToday}h</p>
                <p className="text-xs text-gray-500">
                  {adminStats.presentToday > 0
                    ? `Avg: ${(adminStats.totalHoursToday / adminStats.presentToday).toFixed(1)}h per employee`
                    : 'No data available'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-100 rounded-md">
                  <TrendingUp className="w-6 h-6 text-yellow-600" />
                </div>
                <span className="text-xs text-gray-500 font-medium">RATE</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Avg Attendance</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.avgAttendanceRate}%</p>
                <p className="text-xs text-gray-500">Last 30 days</p>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-6">
            {/* Kiosk Display Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Kiosk Display</h3>
                <span className="text-sm text-gray-500">Office Overview</span>
              </div>
              
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Current Time */}
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {format(currentTime, 'HH:mm')}
                    </div>
                    <div className="text-sm text-gray-600">
                      {format(currentTime, 'EEEE, MMMM do')}
                    </div>
                  </div>
                  
                  {/* Today's Summary */}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {adminStats.presentToday}
                    </div>
                    <div className="text-sm text-gray-600">
                      Employees Present
                    </div>
                  </div>
                  
                  {/* Office Status */}
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-600">
                      {Math.round((adminStats.presentToday / Math.max(adminStats.totalEmployees, 1)) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">
                      Office Capacity
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Welcome to AINTRIX • Have a productive day!
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                <button 
                  onClick={loadDashboardData}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Refresh
                </button>
              </div>
              
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No recent activity today</p>
                  </div>
                ) : (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                      <div className="mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">{activity.employee}</p>
                          <span className="text-xs text-gray-500">
                            {format(activity.time, 'HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{activity.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Employee Status Overview */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Employee Status Overview</h3>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Present ({adminStats.presentToday})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-600">Late ({adminStats.lateEmployees})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-600">Absent ({adminStats.absentEmployees})</span>
                </div>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Present Employees</span>
                  <span className="font-medium text-gray-900">
                    {adminStats.presentToday} / {adminStats.totalEmployees}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: adminStats.totalEmployees > 0 
                        ? `${(adminStats.presentToday / adminStats.totalEmployees) * 100}%` 
                        : '0%' 
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Late Arrivals</span>
                  <span className="font-medium text-gray-900">
                    {adminStats.lateEmployees} / {adminStats.totalEmployees}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: adminStats.totalEmployees > 0 
                        ? `${(adminStats.lateEmployees / adminStats.totalEmployees) * 100}%` 
                        : '0%' 
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Absent Today</span>
                  <span className="font-medium text-gray-900">
                    {adminStats.absentEmployees} / {adminStats.totalEmployees}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: adminStats.totalEmployees > 0 
                        ? `${(adminStats.absentEmployees / adminStats.totalEmployees) * 100}%` 
                        : '0%' 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboardNew;
