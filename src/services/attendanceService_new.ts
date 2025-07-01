import { AttendanceRecord, GeolocationData } from '../types';
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
import { userService } from './userService';

class AttendanceService {
  private readonly COLLECTION_NAME = 'attendance';

  // Start attendance for a user
  async startAttendance(userId: string, location?: GeolocationData): Promise<AttendanceRecord> {
    try {
      // Get user information
      const user = await userService.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user already has active attendance today
      const existingRecord = await this.getTodayAttendance(userId);
      if (existingRecord && existingRecord.clockIn && !existingRecord.clockOut) {
        throw new Error('User already has active attendance session');
      }

      const now = new Date();
      
      const attendanceData = {
        userId: userId,
        userName: user.name,
        userEmail: user.email,
        department: user.department || '',
        date: format(now, 'yyyy-MM-dd'),
        clockIn: now,
        clockOut: undefined,
        status: this.calculateStatus(now),
        totalHours: 0,
        totalBreakHours: 0,
        overtime: 0,
        location: location || undefined,
        breakTimes: [],
        lunchStart: undefined,
        lunchEnd: undefined,
        earlyLogoutReason: undefined,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...attendanceData,
        clockIn: Timestamp.fromDate(attendanceData.clockIn),
        createdAt: Timestamp.fromDate(attendanceData.createdAt),
        updatedAt: Timestamp.fromDate(attendanceData.updatedAt)
      });

      return {
        id: docRef.id,
        ...attendanceData
      } as AttendanceRecord;

    } catch (error) {
      console.error('Error starting attendance:', error);
      throw error;
    }
  }

  // End attendance for a user
  async endAttendance(userId: string, reason?: string): Promise<AttendanceRecord> {
    try {
      const todayRecord = await this.getTodayAttendance(userId);
      if (!todayRecord || !todayRecord.clockIn || todayRecord.clockOut) {
        throw new Error('No active attendance session found');
      }

      const now = new Date();
      const clockInTime = todayRecord.clockIn;
      
      // Calculate total hours worked
      const totalMinutes = (now.getTime() - clockInTime.getTime()) / (1000 * 60);
      const totalHours = Math.max(0, totalMinutes / 60);
      
      // Calculate break time
      const totalBreakMinutes = todayRecord.breakTimes?.reduce((total, breakTime) => {
        if (breakTime.start && breakTime.end) {
          return total + (breakTime.end.getTime() - breakTime.start.getTime()) / (1000 * 60);
        }
        return total;
      }, 0) || 0;
      
      const totalBreakHours = totalBreakMinutes / 60;
      const netWorkHours = Math.max(0, totalHours - totalBreakHours);
      
      // Calculate overtime (anything over 8 hours)
      const overtime = Math.max(0, netWorkHours - 8);

      const updatedData = {
        clockOut: now,
        totalHours: netWorkHours,
        totalBreakHours,
        overtime,
        earlyLogoutReason: reason || null,
        status: this.calculateFinalStatus(clockInTime, now, netWorkHours),
        updatedAt: now
      };

      await updateDoc(doc(db, this.COLLECTION_NAME, todayRecord.id!), {
        ...updatedData,
        clockOut: Timestamp.fromDate(updatedData.clockOut),
        updatedAt: Timestamp.fromDate(updatedData.updatedAt)
      });

      return {
        ...todayRecord,
        ...updatedData
      } as AttendanceRecord;

    } catch (error) {
      console.error('Error ending attendance:', error);
      throw error;
    }
  }

  // Get today's attendance for a user
  async getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const attendanceRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        attendanceRef,
        where('userId', '==', userId),
        where('date', '==', today),
        orderBy('createdAt', 'desc'),
        firestoreLimit(1)
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return this.convertFirestoreToAttendance(doc);
    } catch (error) {
      console.error('Error getting today attendance:', error);
      return null;
    }
  }

  // Get attendance history for a user
  async getUserAttendanceHistory(userId: string, days: number = 30): Promise<AttendanceRecord[]> {
    try {
      const attendanceRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        attendanceRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        firestoreLimit(days)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.convertFirestoreToAttendance(doc));
    } catch (error) {
      console.error('Error getting user attendance history:', error);
      return [];
    }
  }

  // Get all attendance records (for admin)
  async getAllAttendanceRecords(days: number = 30): Promise<AttendanceRecord[]> {
    try {
      const attendanceRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        attendanceRef,
        orderBy('createdAt', 'desc'),
        firestoreLimit(days * 50) // Assuming average of 50 employees
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.convertFirestoreToAttendance(doc));
    } catch (error) {
      console.error('Error getting all attendance records:', error);
      return [];
    }
  }

  // Start break
  async startBreak(userId: string, type: 'lunch' | 'break' = 'break'): Promise<AttendanceRecord> {
    try {
      const todayRecord = await this.getTodayAttendance(userId);
      if (!todayRecord || !todayRecord.clockIn || todayRecord.clockOut) {
        throw new Error('No active attendance session found');
      }

      const now = new Date();
      
      if (type === 'lunch') {
        if (todayRecord.lunchStart && !todayRecord.lunchEnd) {
          throw new Error('Lunch break already started');
        }
        
        await updateDoc(doc(db, this.COLLECTION_NAME, todayRecord.id!), {
          lunchStart: Timestamp.fromDate(now),
          updatedAt: Timestamp.fromDate(now)
        });
        
        return {
          ...todayRecord,
          lunchStart: now,
          updatedAt: now
        };
      } else {
        // Add break time
        const breakTimes = todayRecord.breakTimes || [];
        breakTimes.push({
          start: now,
          end: undefined,
          type: 'break'
        });
        
        await updateDoc(doc(db, this.COLLECTION_NAME, todayRecord.id!), {
          breakTimes: breakTimes.map(bt => ({
            ...bt,
            start: bt.start ? Timestamp.fromDate(bt.start) : null,
            end: bt.end ? Timestamp.fromDate(bt.end) : null
          })),
          updatedAt: Timestamp.fromDate(now)
        });
        
        return {
          ...todayRecord,
          breakTimes,
          updatedAt: now
        };
      }
    } catch (error) {
      console.error('Error starting break:', error);
      throw error;
    }
  }

  // End break
  async endBreak(userId: string, type: 'lunch' | 'break' = 'break'): Promise<AttendanceRecord> {
    try {
      const todayRecord = await this.getTodayAttendance(userId);
      if (!todayRecord || !todayRecord.clockIn || todayRecord.clockOut) {
        throw new Error('No active attendance session found');
      }

      const now = new Date();
      
      if (type === 'lunch') {
        if (!todayRecord.lunchStart || todayRecord.lunchEnd) {
          throw new Error('No active lunch break found');
        }
        
        await updateDoc(doc(db, this.COLLECTION_NAME, todayRecord.id!), {
          lunchEnd: Timestamp.fromDate(now),
          updatedAt: Timestamp.fromDate(now)
        });
        
        return {
          ...todayRecord,
          lunchEnd: now,
          updatedAt: now
        };
      } else {
        // End the latest break
        const breakTimes = todayRecord.breakTimes || [];
        const activeBreakIndex = breakTimes.findIndex(bt => bt.start && !bt.end);
        
        if (activeBreakIndex === -1) {
          throw new Error('No active break found');
        }
        
        breakTimes[activeBreakIndex].end = now;
        
        await updateDoc(doc(db, this.COLLECTION_NAME, todayRecord.id!), {
          breakTimes: breakTimes.map(bt => ({
            ...bt,
            start: bt.start ? Timestamp.fromDate(bt.start) : null,
            end: bt.end ? Timestamp.fromDate(bt.end) : null
          })),
          updatedAt: Timestamp.fromDate(now)
        });
        
        return {
          ...todayRecord,
          breakTimes,
          updatedAt: now
        };
      }
    } catch (error) {
      console.error('Error ending break:', error);
      throw error;
    }
  }

  // Helper methods
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
      updatedAt: data.updatedAt?.toDate(),
      breakTimes: data.breakTimes?.map((bt: any) => ({
        ...bt,
        start: bt.start?.toDate(),
        end: bt.end?.toDate()
      })) || []
    };
  }

  private calculateStatus(clockInTime: Date): 'present' | 'late' | 'absent' {
    const hour = clockInTime.getHours();
    const minute = clockInTime.getMinutes();
    
    // Consider late if after 9:15 AM
    if (hour > 9 || (hour === 9 && minute > 15)) {
      return 'late';
    }
    
    return 'present';
  }

  private calculateFinalStatus(clockIn: Date, _clockOut: Date, workHours: number): 'present' | 'late' | 'absent' | 'half-day' {
    const initialStatus = this.calculateStatus(clockIn);
    
    // If worked less than 4 hours, consider it half-day
    if (workHours < 4) {
      return 'half-day';
    }
    
    return initialStatus;
  }
}

export const attendanceService = new AttendanceService();
export default attendanceService;
