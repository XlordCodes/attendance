export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  password: string;
  role: 'employee' | 'admin' | 'kiosk';
  department: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  wfhApproved?: boolean;
  wfhExpiry?: Date;
  qrCode?: string;
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
  isWFH: boolean;
  earlyLogoutReason?: string;
  overtime: number;
  status: 'present' | 'absent' | 'late' | 'partial';
  totalHours: number;
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

export interface WFHRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  requestDate: Date;
  fromDate: Date;
  toDate: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  adminResponse?: string;
  processedBy?: string;
  processedAt?: Date;
}

export interface Notification {
  id: string;
  type: 'wfh_request' | 'early_logout' | 'overtime' | 'system';
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
  wfh: number;
  overtime: number;
}