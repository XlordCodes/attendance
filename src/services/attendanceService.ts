import { AttendanceRecord, BreakTime, GeolocationData } from '../types';
import { format } from 'date-fns';
import { 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebaseConfig';
// import { notificationService } from './notificationService';

class AttendanceService {
  private readonly USERS_COLLECTION = 'users';
  private readonly ATTENDANCE_SUBCOLLECTION = 'attendance';

  private convertFirestoreToAttendance(attendanceData: any, id: string): AttendanceRecord {
    return {
      ...attendanceData,
      id,
      clockIn: attendanceData.clockIn?.toDate(),
      clockOut: attendanceData.clockOut?.toDate(),
      lunchStart: attendanceData.lunchStart?.toDate(),
      lunchEnd: attendanceData.lunchEnd?.toDate(),
      createdAt: attendanceData.createdAt?.toDate(),
      updatedAt: attendanceData.updatedAt?.toDate(),
      breakTimes: attendanceData.breakTimes?.map((bt: any) => ({
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
      updatedAt: Timestamp.now(),
      breakTimes: data.breakTimes?.map(bt => ({
        ...bt,
        start: bt.start ? Timestamp.fromDate(bt.start) : null,
        end: bt.end ? Timestamp.fromDate(bt.end) : null
      })) || []
    };
  }

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
      const attendanceRef = doc(db, this.USERS_COLLECTION, userId, this.ATTENDANCE_SUBCOLLECTION, today);
      const existingAttendance = await getDoc(attendanceRef);
      
      if (existingAttendance.exists() && existingAttendance.data().clockIn) {
        throw new Error('Already clocked in today');
      }

      const clockInTime = new Date();
      const newAttendanceRecord: AttendanceRecord = {
        id: today,
        userId,
        userName: userData.name || userData.displayName || 'Unknown',
        userEmail: userData.email,
        department: userData.department || 'Unknown',
        date: today,
        clockIn: clockInTime,
        clockOut: undefined,
        lunchStart: undefined,
        lunchEnd: undefined,
        breakTimes: [],
        location: location || undefined,
        overtime: 0,
        status: this.determineStatus(clockInTime),
        totalHours: 0,
        totalBreakHours: 0,
        createdAt: clockInTime,
        updatedAt: clockInTime
      };

      const firestoreRecord = this.convertAttendanceToFirestore(newAttendanceRecord);

      // Save attendance record to subcollection
      await setDoc(attendanceRef, firestoreRecord);

      console.log('✅ Clock in successful:', newAttendanceRecord);
      return newAttendanceRecord;
    } catch (error) {
      console.error('❌ Clock in failed:', error);
      throw error;
    }
  }

  async clockOut(userId: string, reason?: string): Promise<AttendanceRecord> {
    try {
      console.log('🕕 Starting clock out for user:', userId);

      const today = format(new Date(), 'yyyy-MM-dd');
      const attendanceRef = doc(db, this.USERS_COLLECTION, userId, this.ATTENDANCE_SUBCOLLECTION, today);
      const attendanceDoc = await getDoc(attendanceRef);
      
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

      const updatedData = {
        ...attendanceData,
        clockOut: Timestamp.fromDate(clockOutTime),
        totalHours: Math.round(totalHours * 100) / 100,
        earlyLogoutReason: reason,
        updatedAt: Timestamp.now()
      };

      // Update attendance record
      await updateDoc(attendanceRef, updatedData);

      const updatedRecord = this.convertFirestoreToAttendance(updatedData, today);
      console.log('✅ Clock out successful:', updatedRecord);
      return updatedRecord;
    } catch (error) {
      console.error('❌ Clock out failed:', error);
      throw error;
    }
  }

  async getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const attendanceRef = doc(db, this.USERS_COLLECTION, userId, this.ATTENDANCE_SUBCOLLECTION, today);
      const attendanceDoc = await getDoc(attendanceRef);
      
      if (!attendanceDoc.exists()) {
        return null;
      }

      return this.convertFirestoreToAttendance(attendanceDoc.data(), today);
    } catch (error) {
      console.error('Error getting today attendance:', error);
      return null;
    }
  }

  async getAttendanceHistory(userId: string, days: number = 30): Promise<AttendanceRecord[]> {
    try {
      const attendanceCollection = collection(db, this.USERS_COLLECTION, userId, this.ATTENDANCE_SUBCOLLECTION);
      const q = query(
        attendanceCollection,
        orderBy('date', 'desc'),
        limit(days)
      );
      
      const querySnapshot = await getDocs(q);
      const records: AttendanceRecord[] = [];

      querySnapshot.forEach((doc) => {
        records.push(this.convertFirestoreToAttendance(doc.data(), doc.id));
      });

      return records;
    } catch (error) {
      console.error('Error getting attendance history:', error);
      return [];
    }
  }

  async getAllAttendanceRecords(startDate?: string, endDate?: string): Promise<AttendanceRecord[]> {
    try {
      const usersCollection = collection(db, this.USERS_COLLECTION);
      const usersSnapshot = await getDocs(usersCollection);
      
      const allRecords: AttendanceRecord[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const attendanceCollection = collection(db, this.USERS_COLLECTION, userId, this.ATTENDANCE_SUBCOLLECTION);
        
        let q = query(attendanceCollection, orderBy('date', 'desc'));
        
        // Apply date filters if provided
        if (startDate && endDate) {
          q = query(
            attendanceCollection,
            where('date', '>=', startDate),
            where('date', '<=', endDate),
            orderBy('date', 'desc')
          );
        }
        
        const attendanceSnapshot = await getDocs(q);
        
        attendanceSnapshot.forEach((doc) => {
          allRecords.push(this.convertFirestoreToAttendance(doc.data(), doc.id));
        });
      }

      return allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error getting all attendance records:', error);
      return [];
    }
  }

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

  private determineStatus(clockInTime: Date): 'present' | 'late' {
    const hour = clockInTime.getHours();
    const minute = clockInTime.getMinutes();
    const totalMinutes = hour * 60 + minute;
    
    // Consider late if after 9:15 AM (555 minutes)
    return totalMinutes > 555 ? 'late' : 'present';
  }

  // Break management methods
  async startBreak(userId: string, reason?: string): Promise<AttendanceRecord> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const attendanceRef = doc(db, this.USERS_COLLECTION, userId, this.ATTENDANCE_SUBCOLLECTION, today);
      const attendanceDoc = await getDoc(attendanceRef);

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

      const updatedBreakTimes = [...(attendanceData.breakTimes || []), this.convertBreakTimeToFirestore(newBreakTime)];
      
      await updateDoc(attendanceRef, {
        breakTimes: updatedBreakTimes,
        updatedAt: Timestamp.now()
      });

      const updatedData = {
        ...attendanceData,
        breakTimes: updatedBreakTimes,
        updatedAt: Timestamp.now()
      };

      return this.convertFirestoreToAttendance(updatedData, today);
    } catch (error) {
      console.error('Error starting break:', error);
      throw error;
    }
  }

  async endBreak(userId: string): Promise<AttendanceRecord> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const attendanceRef = doc(db, this.USERS_COLLECTION, userId, this.ATTENDANCE_SUBCOLLECTION, today);
      const attendanceDoc = await getDoc(attendanceRef);

      if (!attendanceDoc.exists()) {
        throw new Error('No attendance record found for today');
      }

      const attendanceData = attendanceDoc.data();
      const breakTimes = attendanceData.breakTimes || [];
      const activeBreakIndex = breakTimes.findIndex((bt: any) => !bt.end);

      if (activeBreakIndex === -1) {
        throw new Error('No active break found');
      }

      const endTime = new Date();
      const activeBreak = breakTimes[activeBreakIndex];
      const startTime = activeBreak.start.toDate();
      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes

      // Update the break time
      breakTimes[activeBreakIndex] = {
        ...activeBreak,
        end: Timestamp.fromDate(endTime),
        duration
      };

      const totalBreakHours = breakTimes.reduce((sum: number, bt: any) => 
        sum + (bt.duration || 0), 0) / 60; // convert to hours

      await updateDoc(attendanceRef, {
        breakTimes,
        totalBreakHours: Math.round(totalBreakHours * 100) / 100,
        updatedAt: Timestamp.now()
      });

      const updatedData = {
        ...attendanceData,
        breakTimes,
        totalBreakHours: Math.round(totalBreakHours * 100) / 100,
        updatedAt: Timestamp.now()
      };

      return this.convertFirestoreToAttendance(updatedData, today);
    } catch (error) {
      console.error('Error ending break:', error);
      throw error;
    }
  }

  private convertBreakTimeToFirestore(breakTime: BreakTime) {
    return {
      ...breakTime,
      start: breakTime.start ? Timestamp.fromDate(breakTime.start) : null,
      end: breakTime.end ? Timestamp.fromDate(breakTime.end) : null
    };
  }

  // Admin methods for managing attendance records
  async updateAttendanceRecord(userId: string, date: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
    try {
      const attendanceRef = doc(db, this.USERS_COLLECTION, userId, this.ATTENDANCE_SUBCOLLECTION, date);
      const attendanceDoc = await getDoc(attendanceRef);

      if (!attendanceDoc.exists()) {
        throw new Error('Attendance record not found');
      }

      const currentData = attendanceDoc.data();
      const updatedData = {
        ...currentData,
        ...this.convertAttendanceToFirestore(updates),
        updatedAt: Timestamp.now()
      };

      await updateDoc(attendanceRef, updatedData);
      return this.convertFirestoreToAttendance(updatedData, date);
    } catch (error) {
      console.error('Error updating attendance record:', error);
      throw error;
    }
  }

  async deleteAttendanceRecord(userId: string, date: string): Promise<void> {
    try {
      const attendanceRef = doc(db, this.USERS_COLLECTION, userId, this.ATTENDANCE_SUBCOLLECTION, date);
      await deleteDoc(attendanceRef);
      console.log(`Deleted attendance record for user ${userId} on ${date}`);
    } catch (error) {
      console.error('Error deleting attendance record:', error);
      throw error;
    }
  }

  // Utility method to get attendance for a specific date range
  async getAttendanceByDateRange(userId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    try {
      const attendanceCollection = collection(db, this.USERS_COLLECTION, userId, this.ATTENDANCE_SUBCOLLECTION);
      const q = query(
        attendanceCollection,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const records: AttendanceRecord[] = [];

      querySnapshot.forEach((doc) => {
        records.push(this.convertFirestoreToAttendance(doc.data(), doc.id));
      });

      return records;
    } catch (error) {
      console.error('Error getting attendance by date range:', error);
      return [];
    }
  }
}

export const attendanceService = new AttendanceService();
