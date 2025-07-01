export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  password: string;
  role: 'employee' | 'admin' | 'kiosk';
  department: string;
  position: string;
  isActive: boolean;
  joinDate?: string;
  createdAt: Date;
  lastLogin?: Date;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockIn?: Date;
  clockOut?: Date;
  lunchStart?: Date;
  lunchEnd?: Date;
  breakTimes: BreakTime[];
  location?: GeolocationData;
  earlyLogoutReason?: string;
  overtime: number;
  status: 'present' | 'absent' | 'late' | 'partial';
  totalHours: number;
  totalBreakHours?: number;
  createdAt: Date;
}

export interface BreakTime {
  id: string;
  start: Date;
  end?: Date;
  reason: string;
  duration?: number;
}

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export interface Notification {
  id: string;
  type: 'early_logout' | 'overtime' | 'system';
  title: string;
  message: string;
  employeeId?: string;
  employeeName?: string;
  isRead: boolean;
  createdAt: Date;
  priority: 'low' | 'medium' | 'high';
}

export interface DailyStats {
  date: string;
  totalEmployees: number;
  present: number;
  absent: number;
  late: number;
  overtime: number;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  assignedEmployees: string[];
  createdBy: string;
  createdAt: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
}