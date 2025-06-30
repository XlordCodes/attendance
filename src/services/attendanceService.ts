import { AttendanceRecord, BreakTime, GeolocationData } from '../types';
import { format } from 'date-fns';

// Mock data storage for demo
let mockAttendanceRecords: AttendanceRecord[] = [];
let mockNotifications: any[] = [];

class AttendanceService {
  async clockIn(employeeId: string, location?: GeolocationData, isWFH: boolean = false) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();

    // Check if already clocked in today
    const existingRecord = await this.getTodayAttendance(employeeId);
    
    if (existingRecord && existingRecord.clockIn) {
      throw new Error('Already clocked in today');
    }

    const attendanceData: AttendanceRecord = {
      id: `att_${Date.now()}`,
      employeeId,
      employeeName: employeeId === 'emp001' ? 'John Doe' : 'Admin User',
      date: today,
      clockIn: now,
      location,
      isWFH,
      breakTimes: [],
      overtime: 0,
      status: this.determineStatus(now),
      totalHours: 0,
      createdAt: now,
    };

    if (existingRecord) {
      // Update existing record
      const index = mockAttendanceRecords.findIndex(r => r.id === existingRecord.id);
      mockAttendanceRecords[index] = { ...existingRecord, ...attendanceData };
      return mockAttendanceRecords[index];
    } else {
      // Create new record
      mockAttendanceRecords.push(attendanceData);
      return attendanceData;
    }
  }

  async clockOut(employeeId: string, earlyLogoutReason?: string) {
    const todayRecord = await this.getTodayAttendance(employeeId);
    
    if (!todayRecord || !todayRecord.clockIn) {
      throw new Error('No clock-in record found for today');
    }

    const now = new Date();
    const clockInTime = todayRecord.clockIn;
    const totalHours = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
    
    // Calculate overtime (assuming 8 hours is standard)
    const overtime = Math.max(0, totalHours - 8);

    const updatedRecord = {
      ...todayRecord,
      clockOut: now,
      totalHours: Math.round(totalHours * 100) / 100,
      overtime: Math.round(overtime * 100) / 100,
      earlyLogoutReason,
    };

    const index = mockAttendanceRecords.findIndex(r => r.id === todayRecord.id);
    mockAttendanceRecords[index] = updatedRecord;
    
    // Create notification for early logout
    if (earlyLogoutReason) {
      mockNotifications.push({
        id: `notif_${Date.now()}`,
        type: 'early_logout',
        title: 'Early Logout',
        message: `${todayRecord.employeeName} logged out early: ${earlyLogoutReason}`,
        employeeId,
        employeeName: todayRecord.employeeName,
        priority: 'medium',
        isRead: false,
        createdAt: new Date(),
      });
    }

    return updatedRecord;
  }

  async startBreak(employeeId: string, reason: string) {
    const todayRecord = await this.getTodayAttendance(employeeId);
    
    if (!todayRecord) {
      throw new Error('No attendance record found for today');
    }

    const breakTime: BreakTime = {
      id: Date.now().toString(),
      start: new Date(),
      reason,
    };

    const updatedBreakTimes = [...todayRecord.breakTimes, breakTime];
    
    const index = mockAttendanceRecords.findIndex(r => r.id === todayRecord.id);
    mockAttendanceRecords[index] = {
      ...todayRecord,
      breakTimes: updatedBreakTimes,
    };

    return breakTime;
  }

  async endBreak(employeeId: string, breakId: string) {
    const todayRecord = await this.getTodayAttendance(employeeId);
    
    if (!todayRecord) {
      throw new Error('No attendance record found for today');
    }

    const breakIndex = todayRecord.breakTimes.findIndex(b => b.id === breakId);
    if (breakIndex === -1) {
      throw new Error('Break record not found');
    }

    const updatedBreakTimes = [...todayRecord.breakTimes];
    const endTime = new Date();
    const duration = (endTime.getTime() - updatedBreakTimes[breakIndex].start.getTime()) / (1000 * 60);
    
    updatedBreakTimes[breakIndex] = {
      ...updatedBreakTimes[breakIndex],
      end: endTime,
      duration: Math.round(duration),
    };

    const index = mockAttendanceRecords.findIndex(r => r.id === todayRecord.id);
    mockAttendanceRecords[index] = {
      ...todayRecord,
      breakTimes: updatedBreakTimes,
    };

    return updatedBreakTimes[breakIndex];
  }

  async autoLunchBreak(employeeId: string) {
    const now = new Date();
    const hour = now.getHours();
    
    // Auto lunch break between 2 PM and 3 PM
    if (hour === 14) {
      const todayRecord = await this.getTodayAttendance(employeeId);
      if (todayRecord && !todayRecord.lunchStart) {
        const index = mockAttendanceRecords.findIndex(r => r.id === todayRecord.id);
        mockAttendanceRecords[index] = {
          ...todayRecord,
          lunchStart: now,
        };
      }
    } else if (hour === 15) {
      const todayRecord = await this.getTodayAttendance(employeeId);
      if (todayRecord && todayRecord.lunchStart && !todayRecord.lunchEnd) {
        const index = mockAttendanceRecords.findIndex(r => r.id === todayRecord.id);
        mockAttendanceRecords[index] = {
          ...todayRecord,
          lunchEnd: now,
        };
      }
    }
  }

  async getTodayAttendance(employeeId: string): Promise<AttendanceRecord | null> {
    const today = format(new Date(), 'yyyy-MM-dd');
    return mockAttendanceRecords.find(record => 
      record.employeeId === employeeId && record.date === today
    ) || null;
  }

  async getAttendanceHistory(employeeId: string, limit: number = 30): Promise<AttendanceRecord[]> {
    return mockAttendanceRecords
      .filter(record => record.employeeId === employeeId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  private determineStatus(clockInTime: Date): 'present' | 'late' {
    const hour = clockInTime.getHours();
    const minute = clockInTime.getMinutes();
    
    // Consider late if after 9:15 AM
    if (hour > 9 || (hour === 9 && minute > 15)) {
      return 'late';
    }
    return 'present';
  }
}

export const attendanceService = new AttendanceService();