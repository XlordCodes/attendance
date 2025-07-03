import { AttendanceRecord, BreakTime, GeolocationData } from '../types';
import { format } from 'date-fns';
import { 
  doc, 
  getDoc,
  setDoc,
  Timestamp,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { notificationService } from './notificationService';

class AttendanceServiceSubcollection {
  private readonly USERS_COLLECTION = 'users';
  private readonly ATTENDANCE_SUBCOLLECTION = 'attendance';

  /**
   * Get attendance subcollection reference for a user
   */
  private getAttendanceCollectionRef(userId: string) {
    return collection(db, this.USERS_COLLECTION, userId, this.ATTENDANCE_SUBCOLLECTION);
  }

  /**
   * Get attendance document reference for a specific date
   */
  private getAttendanceDocRef(userId: string, date: string) {
    return doc(db, this.USERS_COLLECTION, userId, this.ATTENDANCE_SUBCOLLECTION, date);
  }

  /**
   * Convert Firestore timestamps to JavaScript dates
   */
  private convertFirestoreToAttendance(attendanceData: Record<string, unknown>, docId: string): AttendanceRecord {
    return {
      ...attendanceData,
      id: docId,
      clockIn: (attendanceData.clockIn as { toDate(): Date })?.toDate(),
      clockOut: (attendanceData.clockOut as { toDate(): Date })?.toDate(),
      lunchStart: (attendanceData.lunchStart as { toDate(): Date })?.toDate(),
      lunchEnd: (attendanceData.lunchEnd as { toDate(): Date })?.toDate(),
      createdAt: (attendanceData.createdAt as { toDate(): Date })?.toDate(),
      updatedAt: (attendanceData.updatedAt as { toDate(): Date })?.toDate(),
      breakTimes: ((attendanceData.breakTimes as Array<Record<string, unknown>>) || []).map((bt: Record<string, unknown>) => ({
        ...bt,
        start: (bt.start as { toDate(): Date })?.toDate(),
        end: (bt.end as { toDate(): Date })?.toDate()
      }))
    } as AttendanceRecord;
  }

  /**
   * Convert JavaScript dates to Firestore timestamps
   */
  private convertAttendanceToFirestore(record: Partial<AttendanceRecord>) {
    const { id: _recordId, ...data } = record;
    return {
      ...data,
      clockIn: data.clockIn ? Timestamp.fromDate(data.clockIn) : null,
      clockOut: data.clockOut ? Timestamp.fromDate(data.clockOut) : null,
      lunchStart: data.lunchStart ? Timestamp.fromDate(data.lunchStart) : null,
      lunchEnd: data.lunchEnd ? Timestamp.fromDate(data.lunchEnd) : null,
      createdAt: data.createdAt ? Timestamp.fromDate(data.createdAt) : Timestamp.now(),
      updatedAt: Timestamp.now(),
      breakTimes: data.breakTimes?.map(bt => ({
        ...bt,
        start: bt.start ? Timestamp.fromDate(bt.start) : null,
        end: bt.end ? Timestamp.fromDate(bt.end) : null
      })) || []
    };
  }

  /**
   * Clock in for a user
   */
  async clockIn(userId: string, location?: GeolocationData): Promise<AttendanceRecord> {
    try {
      console.log('🕐 Starting clock in for user:', userId);

      // Get user document to fetch user details
      const userDocRef = doc(db, this.USERS_COLLECTION, userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const today = format(new Date(), 'yyyy-MM-dd');

      // Check if user already clocked in today
      const attendanceDocRef = this.getAttendanceDocRef(userId, today);
      const attendanceDoc = await getDoc(attendanceDocRef);
      
      if (attendanceDoc.exists() && attendanceDoc.data().clockIn) {
        throw new Error('Already clocked in today');
      }

      const clockInTime = new Date();
      const attendanceRecord = {
        userId,
        userName: userData.name,
        userEmail: userData.email,
        department: userData.department || 'Unknown',
        date: today,
        clockIn: clockInTime,
        clockOut: undefined,
        lunchStart: undefined,
        lunchEnd: undefined,
        breakTimes: [],
        location: location || null,
        overtime: 0,
        status: this.determineStatus(clockInTime),
        totalHours: 0,
        totalBreakHours: 0,
        createdAt: clockInTime,
        updatedAt: clockInTime
      };

      const firestoreRecord = this.convertAttendanceToFirestore(attendanceRecord);

      // Create/update attendance document for today
      await setDoc(attendanceDocRef, firestoreRecord, { merge: true });

      // Send notification for late arrival
      if (attendanceRecord.status === 'late') {
        try {
          await notificationService.sendNotification(
            userId,
            'late_arrival',
            'You have been marked late for today.',
            userData.name || 'Employee',
            'warning'
          );
        } catch (notificationError) {
          console.warn('Failed to send notification:', notificationError);
        }
      }

      console.log('✅ Clock in successful:', attendanceRecord);
      return { ...attendanceRecord, id: today };
    } catch (error) {
      console.error('❌ Clock in failed:', error);
      throw error;
    }
  }

  /**
   * Clock out for a user
   */
  async clockOut(userId: string, reason?: string): Promise<AttendanceRecord> {
    try {
      console.log('🕕 Starting clock out for user:', userId);

      const today = format(new Date(), 'yyyy-MM-dd');
      const attendanceDocRef = this.getAttendanceDocRef(userId, today);
      const attendanceDoc = await getDoc(attendanceDocRef);
      
      if (!attendanceDoc.exists()) {
        throw new Error('No clock in record found for today');
      }

      const attendanceData = attendanceDoc.data();
      
      if (!attendanceData.clockIn) {
        throw new Error('No clock in record found for today');
      }

      if (attendanceData.clockOut) {
        throw new Error('Already clocked out today');
      }

      const clockOutTime = new Date();
      const clockInTime = attendanceData.clockIn.toDate();
      const totalHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      const updatedRecord = {
        ...attendanceData,
        clockOut: clockOutTime,
        totalHours: Math.round(totalHours * 100) / 100,
        earlyLogoutReason: reason,
        updatedAt: clockOutTime
      };

      const firestoreRecord = this.convertAttendanceToFirestore(updatedRecord);

      // Update attendance document
      await setDoc(attendanceDocRef, firestoreRecord, { merge: true });

      console.log('✅ Clock out successful');
      return this.convertFirestoreToAttendance(firestoreRecord, today);
    } catch (error) {
      console.error('❌ Clock out failed:', error);
      throw error;
    }
  }

  /**
   * Get today's attendance record for a user
   */
  async getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const attendanceDocRef = this.getAttendanceDocRef(userId, today);
      const attendanceDoc = await getDoc(attendanceDocRef);
      
      if (!attendanceDoc.exists()) {
        return null;
      }

      return this.convertFirestoreToAttendance(attendanceDoc.data(), today);
    } catch (error) {
      console.error('Error getting today attendance:', error);
      return null;
    }
  }

  /**
   * Get attendance history for a user
   */
  async getAttendanceHistory(userId: string, days: number = 30): Promise<AttendanceRecord[]> {
    try {
      const attendanceCollectionRef = this.getAttendanceCollectionRef(userId);
      const q = query(
        attendanceCollectionRef, 
        orderBy('date', 'desc'), 
        limit(days)
      );
      
      const querySnapshot = await getDocs(q);
      const records: AttendanceRecord[] = [];

      querySnapshot.forEach((doc) => {
        const record = this.convertFirestoreToAttendance(doc.data(), doc.id);
        records.push(record);
      });

      return records;
    } catch (error) {
      console.error('Error getting attendance history:', error);
      return [];
    }
  }

  /**
   * Get attendance records for a specific date range
   */
  async getAttendanceByDateRange(
    userId: string, 
    startDate: string, 
    endDate: string
  ): Promise<AttendanceRecord[]> {
    try {
      const attendanceCollectionRef = this.getAttendanceCollectionRef(userId);
      const q = query(
        attendanceCollectionRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const records: AttendanceRecord[] = [];

      querySnapshot.forEach((doc) => {
        const record = this.convertFirestoreToAttendance(doc.data(), doc.id);
        records.push(record);
      });

      return records;
    } catch (error) {
      console.error('Error getting attendance by date range:', error);
      return [];
    }
  }

  /**
   * Get all attendance records across all users (for admin)
   */
  async getAllAttendanceRecords(startDate?: string, endDate?: string): Promise<AttendanceRecord[]> {
    try {
      const usersCollection = collection(db, this.USERS_COLLECTION);
      const usersSnapshot = await getDocs(usersCollection);
      
      const allRecords: AttendanceRecord[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        let userRecords: AttendanceRecord[] = [];

        if (startDate && endDate) {
          userRecords = await this.getAttendanceByDateRange(userId, startDate, endDate);
        } else {
          userRecords = await this.getAttendanceHistory(userId, 90); // Default 90 days
        }

        allRecords.push(...userRecords);
      }

      return allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error getting all attendance records:', error);
      return [];
    }
  }

  /**
   * Get attendance statistics for a user
   */
  async getAttendanceStats(userId: string, totalDays: number) {
    try {
      const records = await this.getAttendanceHistory(userId, totalDays);
      
      const presentDays = records.filter(r => r.clockIn).length;
      const lateDays = records.filter(r => r.status === 'late').length;
      const absentDays = totalDays - presentDays;
      const totalHours = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
      const averageHours = presentDays > 0 ? totalHours / presentDays : 0;
      const overtimeHours = records.reduce((sum, r) => sum + (r.overtime || 0), 0);

      return {
        totalDays,
        presentDays,
        lateDays,
        absentDays,
        attendancePercentage: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
        averageHours: Math.round(averageHours * 100) / 100,
        totalHours: Math.round(totalHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100
      };
    } catch (error) {
      console.error('Error calculating attendance stats:', error);
      return {
        totalDays,
        presentDays: 0,
        lateDays: 0,
        absentDays: totalDays,
        attendancePercentage: 0,
        averageHours: 0,
        totalHours: 0,
        overtimeHours: 0
      };
    }
  }

  /**
   * Start a break for a user
   */
  async startBreak(userId: string, reason?: string): Promise<AttendanceRecord> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const attendanceDocRef = this.getAttendanceDocRef(userId, today);
      const attendanceDoc = await getDoc(attendanceDocRef);
      
      if (!attendanceDoc.exists()) {
        throw new Error('Please clock in first');
      }

      const attendanceData = attendanceDoc.data();
      
      if (!attendanceData.clockIn) {
        throw new Error('Please clock in first');
      }

      const newBreakTime: BreakTime = {
        id: `break_${Date.now()}`,
        start: new Date(),
        reason: reason || 'Break',
        type: 'break'
      };

      const updatedBreakTimes = [...(attendanceData.breakTimes || []), newBreakTime];
      const updatedRecord = {
        ...attendanceData,
        breakTimes: updatedBreakTimes,
        updatedAt: new Date()
      };

      const firestoreRecord = this.convertAttendanceToFirestore(updatedRecord);

      // Update attendance document
      await setDoc(attendanceDocRef, firestoreRecord, { merge: true });

      return this.convertFirestoreToAttendance(firestoreRecord, today);
    } catch (error) {
      console.error('Error starting break:', error);
      throw error;
    }
  }

  /**
   * End a break for a user
   */
  async endBreak(userId: string): Promise<AttendanceRecord> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const attendanceDocRef = this.getAttendanceDocRef(userId, today);
      const attendanceDoc = await getDoc(attendanceDocRef);
      
      if (!attendanceDoc.exists()) {
        throw new Error('No attendance record found for today');
      }

      const attendanceData = attendanceDoc.data();
      const breakTimes = attendanceData.breakTimes || [];
      const activeBreak = breakTimes.find((bt: Record<string, unknown>) => !bt.end);

      if (!activeBreak) {
        throw new Error('No active break found');
      }

      const endTime = new Date();
      const startTime = (activeBreak.start as { toDate(): Date }).toDate();
      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes

      const updatedBreakTimes = breakTimes.map((bt: Record<string, unknown>) => 
        bt.id === activeBreak.id 
          ? { ...bt, end: endTime, duration }
          : bt
      );

      const totalBreakHours = updatedBreakTimes.reduce((sum: number, bt: Record<string, unknown>) => 
        sum + ((bt.duration as number) || 0), 0) / 60; // convert to hours

      const updatedRecord = {
        ...attendanceData,
        breakTimes: updatedBreakTimes,
        totalBreakHours: Math.round(totalBreakHours * 100) / 100,
        updatedAt: endTime
      };

      const firestoreRecord = this.convertAttendanceToFirestore(updatedRecord);

      // Update attendance document
      await setDoc(attendanceDocRef, firestoreRecord, { merge: true });

      return this.convertFirestoreToAttendance(firestoreRecord, today);
    } catch (error) {
      console.error('Error ending break:', error);
      throw error;
    }
  }

  /**
   * Determine attendance status based on clock in time
   */
  private determineStatus(clockInTime: Date): 'present' | 'late' {
    const hour = clockInTime.getHours();
    const minute = clockInTime.getMinutes();
    const totalMinutes = hour * 60 + minute;
    
    // Consider late if after 9:15 AM (555 minutes)
    return totalMinutes > 555 ? 'late' : 'present';
  }
}

export const attendanceServiceSubcollection = new AttendanceServiceSubcollection();
