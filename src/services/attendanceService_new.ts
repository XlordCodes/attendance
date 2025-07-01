import { AttendanceRecord, BreakTime, GeolocationData } from '../types';
import { format } from 'date-fns';
import { 
  doc, 
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
  getDocs,
  collection,
  query,
  where
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { notificationService } from './notificationService';

class AttendanceService {
  private readonly COLLECTION_NAME = 'users';

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

      // Get user document
      const userDocRef = doc(db, this.COLLECTION_NAME, userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const today = format(new Date(), 'yyyy-MM-dd');

      // Check if user already clocked in today
      const todayAttendance = userData.attendance?.find((att: any) => att.date === today);
      if (todayAttendance && todayAttendance.clockIn) {
        throw new Error('Already clocked in today');
      }

      const clockInTime = new Date();
      const newAttendanceRecord = {
        id: `${userId}_${today}`,
        userId,
        userName: userData.name,
        userEmail: userData.email,
        department: userData.department || 'Unknown',
        date: today,
        clockIn: clockInTime,
        clockOut: null,
        lunchStart: null,
        lunchEnd: null,
        breakTimes: [],
        location: location || null,
        overtime: 0,
        status: this.determineStatus(clockInTime),
        totalHours: 0,
        totalBreakHours: 0,
        createdAt: clockInTime,
        updatedAt: clockInTime
      };

      const firestoreRecord = this.convertAttendanceToFirestore(newAttendanceRecord);

      // If today's attendance exists, remove it first
      if (todayAttendance) {
        await updateDoc(userDocRef, {
          attendance: arrayRemove(todayAttendance)
        });
      }

      // Add new attendance record
      await updateDoc(userDocRef, {
        attendance: arrayUnion(firestoreRecord)
      });

      // Send notification for late arrival
      if (newAttendanceRecord.status === 'late') {
        await notificationService.sendNotification(
          userId,
          'late_arrival',
          'You have been marked late for today.',
          userData.name || 'Employee',
          'warning'
        );
      }

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

      const userDocRef = doc(db, this.COLLECTION_NAME, userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const today = format(new Date(), 'yyyy-MM-dd');

      // Find today's attendance record
      const todayAttendance = userData.attendance?.find((att: any) => att.date === today);
      if (!todayAttendance || !todayAttendance.clockIn) {
        throw new Error('No clock in record found for today');
      }

      if (todayAttendance.clockOut) {
        throw new Error('Already clocked out today');
      }

      const clockOutTime = new Date();
      const clockInTime = todayAttendance.clockIn.toDate();
      const totalHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      const updatedRecord = {
        ...todayAttendance,
        clockOut: clockOutTime,
        totalHours: Math.round(totalHours * 100) / 100,
        earlyLogoutReason: reason,
        updatedAt: clockOutTime
      };

      const firestoreRecord = this.convertAttendanceToFirestore(updatedRecord);

      // Remove old record and add updated one
      await updateDoc(userDocRef, {
        attendance: arrayRemove(todayAttendance)
      });

      await updateDoc(userDocRef, {
        attendance: arrayUnion(firestoreRecord)
      });

      console.log('✅ Clock out successful:', updatedRecord);
      return this.convertFirestoreToAttendance(firestoreRecord, updatedRecord.id);
    } catch (error) {
      console.error('❌ Clock out failed:', error);
      throw error;
    }
  }

  async getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
    try {
      const userDocRef = doc(db, this.COLLECTION_NAME, userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data();
      const today = format(new Date(), 'yyyy-MM-dd');

      const todayAttendance = userData.attendance?.find((att: any) => att.date === today);
      if (!todayAttendance) {
        return null;
      }

      return this.convertFirestoreToAttendance(todayAttendance, todayAttendance.id || `${userId}_${today}`);
    } catch (error) {
      console.error('Error getting today attendance:', error);
      return null;
    }
  }

  async getAttendanceHistory(userId: string, days: number = 30): Promise<AttendanceRecord[]> {
    try {
      const userDocRef = doc(db, this.COLLECTION_NAME, userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        return [];
      }

      const userData = userDoc.data();
      const attendanceRecords = userData.attendance || [];

      // Sort by date descending and limit to requested days
      return attendanceRecords
        .map((att: any) => this.convertFirestoreToAttendance(att, att.id || `${userId}_${att.date}`))
        .sort((a: AttendanceRecord, b: AttendanceRecord) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        .slice(0, days);
    } catch (error) {
      console.error('Error getting attendance history:', error);
      return [];
    }
  }

  async getAllAttendanceRecords(startDate?: string, endDate?: string): Promise<AttendanceRecord[]> {
    try {
      const usersCollection = collection(db, this.COLLECTION_NAME);
      const querySnapshot = await getDocs(usersCollection);
      
      const allRecords: AttendanceRecord[] = [];

      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const attendanceRecords = userData.attendance || [];

        attendanceRecords.forEach((att: any) => {
          const record = this.convertFirestoreToAttendance(att, att.id || `${doc.id}_${att.date}`);
          
          // Filter by date range if provided
          if (startDate && endDate) {
            if (record.date >= startDate && record.date <= endDate) {
              allRecords.push(record);
            }
          } else {
            allRecords.push(record);
          }
        });
      });

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
      const userDocRef = doc(db, this.COLLECTION_NAME, userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayAttendance = userData.attendance?.find((att: any) => att.date === today);

      if (!todayAttendance || !todayAttendance.clockIn) {
        throw new Error('Please clock in first');
      }

      const newBreakTime: BreakTime = {
        id: `break_${Date.now()}`,
        start: new Date(),
        reason: reason || 'Break',
        type: 'break'
      };

      const updatedBreakTimes = [...(todayAttendance.breakTimes || []), newBreakTime];
      const updatedRecord = {
        ...todayAttendance,
        breakTimes: updatedBreakTimes,
        updatedAt: new Date()
      };

      const firestoreRecord = this.convertAttendanceToFirestore(updatedRecord);

      // Update attendance record
      await updateDoc(userDocRef, {
        attendance: arrayRemove(todayAttendance)
      });

      await updateDoc(userDocRef, {
        attendance: arrayUnion(firestoreRecord)
      });

      return this.convertFirestoreToAttendance(firestoreRecord, updatedRecord.id);
    } catch (error) {
      console.error('Error starting break:', error);
      throw error;
    }
  }

  async endBreak(userId: string): Promise<AttendanceRecord> {
    try {
      const userDocRef = doc(db, this.COLLECTION_NAME, userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayAttendance = userData.attendance?.find((att: any) => att.date === today);

      if (!todayAttendance) {
        throw new Error('No attendance record found for today');
      }

      const breakTimes = todayAttendance.breakTimes || [];
      const activeBreak = breakTimes.find((bt: any) => !bt.end);

      if (!activeBreak) {
        throw new Error('No active break found');
      }

      const endTime = new Date();
      const duration = (endTime.getTime() - activeBreak.start.toDate().getTime()) / (1000 * 60); // minutes

      const updatedBreakTimes = breakTimes.map((bt: any) => 
        bt.id === activeBreak.id 
          ? { ...bt, end: endTime, duration }
          : bt
      );

      const totalBreakHours = updatedBreakTimes.reduce((sum: number, bt: any) => 
        sum + (bt.duration || 0), 0) / 60; // convert to hours

      const updatedRecord = {
        ...todayAttendance,
        breakTimes: updatedBreakTimes,
        totalBreakHours: Math.round(totalBreakHours * 100) / 100,
        updatedAt: endTime
      };

      const firestoreRecord = this.convertAttendanceToFirestore(updatedRecord);

      // Update attendance record
      await updateDoc(userDocRef, {
        attendance: arrayRemove(todayAttendance)
      });

      await updateDoc(userDocRef, {
        attendance: arrayUnion(firestoreRecord)
      });

      return this.convertFirestoreToAttendance(firestoreRecord, updatedRecord.id);
    } catch (error) {
      console.error('Error ending break:', error);
      throw error;
    }
  }
}

export const attendanceService = new AttendanceService();
