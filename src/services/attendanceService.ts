import { AttendanceRecord, BreakTime, GeolocationData } from '../types';
import { format } from 'date-fns';
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { employeeService } from './employeeService';
import { notificationService } from './notificationService';

class AttendanceService {
  private readonly COLLECTION_NAME = 'attendance';

  private convertFirestoreToAttendance(doc: any): AttendanceRecord {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      clockIn: data.clockIn?.toDate(),
      clockOut: data.clockOut?.toDate(),
      lunchStart: data.lunchStart?.toDate(),
      lunchEnd: data.lunchEnd?.toDate(),
      createdAt: data.createdAt?.toDate(),
      breakTimes: data.breakTimes?.map((bt: any) => ({
        ...bt,
        start: bt.start?.toDate(),
        end: bt.end?.toDate()
      })) || []
    };
  }

  private convertAttendanceToFirestore(record: Partial<AttendanceRecord>) {
    const { id, ...data } = record;
    return {
      ...data,
      clockIn: data.clockIn ? Timestamp.fromDate(data.clockIn) : null,
      clockOut: data.clockOut ? Timestamp.fromDate(data.clockOut) : null,
      lunchStart: data.lunchStart ? Timestamp.fromDate(data.lunchStart) : null,
      lunchEnd: data.lunchEnd ? Timestamp.fromDate(data.lunchEnd) : null,
      createdAt: data.createdAt ? Timestamp.fromDate(data.createdAt) : Timestamp.now(),
      breakTimes: data.breakTimes?.map(bt => ({
        ...bt,
        start: bt.start ? Timestamp.fromDate(bt.start) : null,
        end: bt.end ? Timestamp.fromDate(bt.end) : null
      })) || []
    };
  }

  async clockIn(employeeId: string, location?: GeolocationData) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();

    // Check if already clocked in today
    const existingRecord = await this.getTodayAttendance(employeeId);
    
    if (existingRecord && existingRecord.clockIn) {
      throw new Error('Already clocked in today');
    }

    // Get employee details
    const employee = await employeeService.getEmployeeById(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    const attendanceData: Partial<AttendanceRecord> = {
      employeeId,
      employeeName: employee.name,
      date: today,
      clockIn: now,
      location,
      breakTimes: [],
      overtime: 0,
      status: this.determineStatus(now),
      totalHours: 0,
      createdAt: now,
    };

    if (existingRecord) {
      // Update existing record
      const docRef = doc(db, this.COLLECTION_NAME, existingRecord.id);
      const updateData = this.convertAttendanceToFirestore(attendanceData);
      await updateDoc(docRef, updateData);
      return { ...existingRecord, ...attendanceData };
    } else {
      // Create new record
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), 
        this.convertAttendanceToFirestore(attendanceData));
      return { ...attendanceData, id: docRef.id } as AttendanceRecord;
    }
  }

  async clockOut(employeeId: string, earlyLogoutReason?: string) {
    const todayRecord = await this.getTodayAttendance(employeeId);
    
    if (!todayRecord || !todayRecord.clockIn) {
      throw new Error('No clock-in record found for today');
    }

    const now = new Date();
    const clockInTime = todayRecord.clockIn;
    
    // Calculate total time worked (including breaks)
    const totalTimeInMs = now.getTime() - clockInTime.getTime();
    const totalHoursGross = totalTimeInMs / (1000 * 60 * 60);
    
    // Calculate total break time
    const totalBreakTimeInMs = this.calculateTotalBreakTime(todayRecord.breakTimes);
    const totalBreakHours = totalBreakTimeInMs / (1000 * 60 * 60);
    
    // Calculate net work time (gross time - break time)
    const netWorkHours = totalHoursGross - totalBreakHours;
    
    // Calculate overtime (assuming 8 hours is standard work day)
    const overtime = Math.max(0, netWorkHours - 8);

    const updateData = {
      clockOut: now,
      totalHours: Math.round(netWorkHours * 100) / 100,
      totalBreakHours: Math.round(totalBreakHours * 100) / 100,
      overtime: Math.round(overtime * 100) / 100,
      earlyLogoutReason,
    };

    const docRef = doc(db, this.COLLECTION_NAME, todayRecord.id);
    await updateDoc(docRef, this.convertAttendanceToFirestore(updateData));
    
    // Create notification for early logout
    if (earlyLogoutReason) {
      await notificationService.createAttendanceNotification(
        employeeId,
        todayRecord.employeeName,
        'early_logout',
        `Early logout: ${earlyLogoutReason}`
      );
    }

    // Create notification for overtime
    if (overtime > 0) {
      await notificationService.createAttendanceNotification(
        employeeId,
        todayRecord.employeeName,
        'overtime',
        `Overtime worked: ${overtime.toFixed(1)} hours`
      );
    }

    return { ...todayRecord, ...updateData };
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
    
    const docRef = doc(db, this.COLLECTION_NAME, todayRecord.id);
    await updateDoc(docRef, this.convertAttendanceToFirestore({
      breakTimes: updatedBreakTimes,
    }));

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

    const docRef = doc(db, this.COLLECTION_NAME, todayRecord.id);
    await updateDoc(docRef, this.convertAttendanceToFirestore({
      breakTimes: updatedBreakTimes,
    }));

    return updatedBreakTimes[breakIndex];
  }

  async autoLunchBreak(employeeId: string) {
    const now = new Date();
    const hour = now.getHours();
    
    // Auto lunch break between 2 PM and 3 PM
    if (hour === 14) {
      const todayRecord = await this.getTodayAttendance(employeeId);
      if (todayRecord && !todayRecord.lunchStart) {
        const docRef = doc(db, this.COLLECTION_NAME, todayRecord.id);
        await updateDoc(docRef, this.convertAttendanceToFirestore({
          lunchStart: now,
        }));
      }
    } else if (hour === 15) {
      const todayRecord = await this.getTodayAttendance(employeeId);
      if (todayRecord && todayRecord.lunchStart && !todayRecord.lunchEnd) {
        const docRef = doc(db, this.COLLECTION_NAME, todayRecord.id);
        await updateDoc(docRef, this.convertAttendanceToFirestore({
          lunchEnd: now,
        }));
      }
    }
  }

  async getTodayAttendance(employeeId: string): Promise<AttendanceRecord | null> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('employeeId', '==', employeeId),
      where('date', '==', today)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    
    return this.convertFirestoreToAttendance(querySnapshot.docs[0]);
  }

  async getAttendanceHistory(employeeId: string, limit: number = 30): Promise<AttendanceRecord[]> {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('employeeId', '==', employeeId),
      orderBy('date', 'desc'),
      firestoreLimit(limit)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.convertFirestoreToAttendance(doc));
  }

  async getAllAttendanceRecords(startDate?: string, endDate?: string): Promise<AttendanceRecord[]> {
    let q = query(collection(db, this.COLLECTION_NAME), orderBy('date', 'desc'));
    
    if (startDate && endDate) {
      q = query(
        collection(db, this.COLLECTION_NAME),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
    } else if (startDate) {
      q = query(
        collection(db, this.COLLECTION_NAME),
        where('date', '>=', startDate),
        orderBy('date', 'desc')
      );
    } else if (endDate) {
      q = query(
        collection(db, this.COLLECTION_NAME),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.convertFirestoreToAttendance(doc));
  }

  async getAttendanceStats(employeeId?: string, days: number = 30): Promise<{
    totalDays: number;
    presentDays: number;
    lateDays: number;
    absentDays: number;
    attendancePercentage: number;
    averageHours: number;
    totalHours: number;
    overtimeHours: number;
  }> {
    const endDate = format(new Date(), 'yyyy-MM-dd');
    const startDate = format(new Date(Date.now() - days * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    
    let q = query(
      collection(db, this.COLLECTION_NAME),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    
    if (employeeId) {
      q = query(
        collection(db, this.COLLECTION_NAME),
        where('employeeId', '==', employeeId),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
    }
    
    const querySnapshot = await getDocs(q);
    const records = querySnapshot.docs.map(doc => this.convertFirestoreToAttendance(doc));
    
    const presentDays = records.filter(r => r.status === 'present').length;
    const lateDays = records.filter(r => r.status === 'late').length;
    const absentDays = records.filter(r => r.status === 'absent').length;
    const totalHours = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const overtimeHours = records.reduce((sum, r) => sum + (r.overtime || 0), 0);
    
    const workingDays = presentDays + lateDays;
    const attendancePercentage = days > 0 ? ((workingDays / days) * 100) : 0;
    const averageHours = workingDays > 0 ? (totalHours / workingDays) : 0;
    
    return {
      totalDays: days,
      presentDays,
      lateDays,
      absentDays,
      attendancePercentage: Math.round(attendancePercentage * 100) / 100,
      averageHours: Math.round(averageHours * 100) / 100,
      totalHours: Math.round(totalHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
    };
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

  private calculateTotalBreakTime(breakTimes: BreakTime[]): number {
    return breakTimes.reduce((total, breakTime) => {
      if (breakTime.start && breakTime.end) {
        return total + (breakTime.end.getTime() - breakTime.start.getTime());
      }
      return total;
    }, 0);
  }
}

export const attendanceService = new AttendanceService();