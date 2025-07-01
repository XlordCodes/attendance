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
import { useAuth } from '../../hooks/useAuth';

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
  const { employee } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [adminStats] = useState<AdminStats>({
    totalEmployees: 25,
    presentToday: 22,
    totalHoursToday: 176,
    avgAttendanceRate: 88.5,
    lateEmployees: 3,
    absentEmployees: 3
  });

  const [recentActivity] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'clock-in',
      employee: 'John Doe',
      time: new Date(Date.now() - 15 * 60 * 1000),
      message: 'Clocked in on time'
    },
    {
      id: '2',
      type: 'late',
      employee: 'Jane Smith',
      time: new Date(Date.now() - 30 * 60 * 1000),
      message: 'Arrived 15 minutes late'
    },
    {
      id: '3',
      type: 'clock-out',
      employee: 'Mike Johnson',
      time: new Date(Date.now() - 45 * 60 * 1000),
      message: 'Completed 8.5 hours'
    },
    {
      id: '4',
      type: 'absent',
      employee: 'Sarah Wilson',
      time: new Date(Date.now() - 60 * 60 * 1000),
      message: 'Marked absent for today'
    }
  ]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
              <span className="text-white font-bold text-2xl">
                {employee?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {employee?.name?.split(' ')[0]}!
              </h1>
              <p className="text-lg text-gray-600 capitalize flex items-center space-x-2 mt-1">
                <span>{employee?.role}</span>
                <span>•</span>
                <span className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  Online
                </span>
                <span>•</span>
                <span>{format(currentTime, 'EEEE, MMMM d, yyyy')}</span>
              </p>
            </div>
          </div>
          
          {/* Notifications */}
          <div className="flex items-center space-x-3">
            <button className="relative p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                <span className="w-2 h-2 bg-white rounded-full"></span>
              </span>
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
              {((adminStats.presentToday / adminStats.totalEmployees) * 100).toFixed(0)}% attendance
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
              Avg: {(adminStats.totalHoursToday / adminStats.presentToday).toFixed(1)}h per employee
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
        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
            <button className="text-sm text-gray-500 hover:text-gray-700">View All</button>
          </div>
          
          <div className="space-y-4">
            {recentActivity.map((activity) => (
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
            ))}
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
                style={{ width: `${(adminStats.presentToday / adminStats.totalEmployees) * 100}%` }}
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
                style={{ width: `${(adminStats.lateEmployees / adminStats.totalEmployees) * 100}%` }}
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
                style={{ width: `${(adminStats.absentEmployees / adminStats.totalEmployees) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardNew;
