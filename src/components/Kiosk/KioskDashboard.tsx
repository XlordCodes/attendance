import { useState, useEffect } from 'react';
import { Clock, Users, TrendingUp, CheckCircle, AlertCircle, UserCheck, Coffee } from 'lucide-react';
import { format } from 'date-fns';

interface EmployeeStatus {
  id: string;
  name: string;
  status: 'present' | 'absent' | 'late' | 'break';
  clockIn?: Date;
  clockOut?: Date;
  department: string;
}

const KioskDashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [presentEmployees] = useState<EmployeeStatus[]>([
    {
      id: '1',
      name: 'John Doe',
      status: 'present',
      clockIn: new Date(new Date().setHours(9, 0, 0)),
      department: 'Engineering'
    },
    {
      id: '2',
      name: 'Jane Smith',
      status: 'present',
      clockIn: new Date(new Date().setHours(8, 45, 0)),
      department: 'Design'
    },
    {
      id: '3',
      name: 'Mike Johnson',
      status: 'break',
      clockIn: new Date(new Date().setHours(9, 15, 0)),
      department: 'Marketing'
    },
    {
      id: '4',
      name: 'Sarah Wilson',
      status: 'present',
      clockIn: new Date(new Date().setHours(8, 30, 0)),
      department: 'HR'
    },
    {
      id: '5',
      name: 'David Brown',
      status: 'late',
      clockIn: new Date(new Date().setHours(9, 30, 0)),
      department: 'Engineering'
    }
  ]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'late':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'break':
        return <Coffee className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'break':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const stats = {
    totalEmployees: 25,
    presentToday: presentEmployees.filter(emp => emp.status === 'present' || emp.status === 'late' || emp.status === 'break').length,
    onBreak: presentEmployees.filter(emp => emp.status === 'break').length,
    lateArrivals: presentEmployees.filter(emp => emp.status === 'late').length
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-2xl">A</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">AINTRIX</h1>
                <p className="text-gray-600">Company Dashboard • Kiosk Mode</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <div className="text-gray-600">
                {format(currentTime, 'EEEE, MMMM d, yyyy')}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-md">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs text-gray-500 font-medium">TOTAL</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalEmployees}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-md">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs text-gray-500 font-medium">TODAY</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Present Today</p>
              <p className="text-3xl font-bold text-gray-900">{stats.presentToday}</p>
              <p className="text-xs text-gray-500">
                {((stats.presentToday / stats.totalEmployees) * 100).toFixed(0)}% attendance
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-md">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-xs text-gray-500 font-medium">LATE</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Late Arrivals</p>
              <p className="text-3xl font-bold text-gray-900">{stats.lateArrivals}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-md">
                <Coffee className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs text-gray-500 font-medium">BREAK</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">On Break</p>
              <p className="text-3xl font-bold text-gray-900">{stats.onBreak}</p>
            </div>
          </div>
        </div>

        {/* Current Employees */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-8 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Currently Present Employees</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <TrendingUp className="w-4 h-4" />
                <span>Live Updates</span>
              </div>
            </div>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {presentEmployees.map((employee) => (
                <div key={employee.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
                        <span className="font-bold text-gray-600">
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                        <p className="text-sm text-gray-500">{employee.department}</p>
                      </div>
                    </div>
                    
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${getStatusColor(employee.status)}`}>
                      {getStatusIcon(employee.status)}
                      <span className="ml-1 capitalize">{employee.status}</span>
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Clock In:</span>
                      <span className="font-medium text-gray-900">
                        {employee.clockIn ? format(employee.clockIn, 'HH:mm') : '--:--'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium text-gray-900">
                        {employee.clockIn 
                          ? `${Math.floor((currentTime.getTime() - employee.clockIn.getTime()) / (1000 * 60 * 60))}h ${Math.floor(((currentTime.getTime() - employee.clockIn.getTime()) % (1000 * 60 * 60)) / (1000 * 60))}m`
                          : '--h --m'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {presentEmployees.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No employees currently present</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Footer */}
        <div className="mt-8 bg-gray-900 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white">
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">{((stats.presentToday / stats.totalEmployees) * 100).toFixed(0)}%</div>
              <div className="text-sm text-gray-300">Attendance Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">
                {format(currentTime, 'HH:mm')}
              </div>
              <div className="text-sm text-gray-300">Current Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">{stats.presentToday}/{stats.totalEmployees}</div>
              <div className="text-sm text-gray-300">Present/Total</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KioskDashboard;
