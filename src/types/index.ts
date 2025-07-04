export interface Employee {
  id: string;
  uid?: string; // Firebase Auth UID (same as id, but kept for clarity)
  employeeId?: string;
  name: string;
  Name?: string; // Alternative field name used in Firestore
  email: string;
  // NO password field - handled entirely by Firebase Auth with reset emails
  role: 'employee' | 'admin';
  department: string;
  position: string;
  designation?: string; // Additional field for job title/designation
  Designation?: string; // Alternative field name used in Firestore (capital D)
  isActive: boolean;
  joinDate?: string;
  createdAt: Date;
  lastLogin?: Date;
}

export interface AttendanceRecord {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  employeeId?: string; // For backward compatibility
  employeeName?: string; // For backward compatibility
  department: string;
  date: string;
  clockIn?: Date;
  clockOut?: Date;
  lunchStart?: Date;
  lunchEnd?: Date;
  breaks: BreakTime[]; // Updated field name for consistency
  breakTimes?: BreakTime[]; // For backward compatibility
  location?: GeolocationData;
  earlyLogoutReason?: string;
  lateReason?: string; // Added for late arrival reasons
  isLate?: boolean; // Added for late status
  overtime: number;
  status: 'present' | 'absent' | 'late' | 'partial' | 'half-day';
  totalHours: number;
  hoursWorked?: number; // Alternative field name used in components
  totalBreakHours?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface BreakTime {
  id?: string;
  start?: Date;
  startTime?: Date; // Alternative field name for consistency
  end?: Date;
  endTime?: Date; // Alternative field name for consistency
  reason?: string;
  type?: 'break' | 'lunch';
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