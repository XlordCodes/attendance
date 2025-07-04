import { AttendanceRecord, BreakTime, GeolocationData } from '../types';
import { format } from 'date-fns';
import { parseDDMMYYYY, compareDDMMYYYY } from '../utils/dateUtils';
import { 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  getDocs,
  collection
} from 'firebase/firestore';
import { db } from './firebaseConfig';

class GlobalAttendanceService {
  private readonly GLOBAL_ATTENDANCE_COLLECTION = 'globalAttendance';
  private readonly RECORDS_SUBCOLLECTION = 'records';
  private readonly USERS_COLLECTION = 'users';

  private convertFirestoreToAttendance(attendanceData: Record<string, unknown>, id: string): AttendanceRecord {
    const breaks = ((attendanceData.breaks || attendanceData.breakTimes) as Array<Record<string, unknown>>) || [];
    
    return {
      id,
      userId: (attendanceData.userId as string) || '',
      userName: (attendanceData.userName as string) || '',
      userEmail: (attendanceData.userEmail as string) || '',
      department: (attendanceData.department as string) || '',
      date: (attendanceData.date as string) || id,
      clockIn: (attendanceData.clockIn as { toDate(): Date })?.toDate(),
      clockOut: (attendanceData.clockOut as { toDate(): Date })?.toDate(),
      lunchStart: (attendanceData.lunchStart as { toDate(): Date })?.toDate(),
      lunchEnd: (attendanceData.lunchEnd as { toDate(): Date })?.toDate(),
      createdAt: (attendanceData.createdAt as { toDate(): Date })?.toDate(),
      updatedAt: (attendanceData.updatedAt as { toDate(): Date })?.toDate(),
      hoursWorked: (attendanceData.hoursWorked || attendanceData.totalHours || 0) as number,
      totalHours: (attendanceData.totalHours || attendanceData.hoursWorked || 0) as number,
      breaks: breaks.map((bt: Record<string, unknown>) => ({
        startTime: (bt.startTime as { toDate(): Date })?.toDate(),
        endTime: (bt.endTime as { toDate(): Date })?.toDate(),
        type: (bt.type as string) || 'break',
        duration: (bt.duration as number) || 0
      })),
      breakTimes: breaks.map((bt: Record<string, unknown>) => ({
        start: (bt.startTime as { toDate(): Date })?.toDate(),
        end: (bt.endTime as { toDate(): Date })?.toDate(),
        type: (bt.type as string) || 'break',
        duration: (bt.duration as number) || 0
      })),
      isLate: (attendanceData.isLate as boolean) || false,
      lateReason: (attendanceData.lateReason as string) || null,
      status: (attendanceData.status as string) || 'unknown',
      location: attendanceData.location as GeolocationData || null,
      overtime: (attendanceData.overtime as number) || 0
    } as AttendanceRecord;
  }

  private convertAttendanceToFirestore(record: Partial<AttendanceRecord>) {
    const { id, ...data } = record;
    
    // Remove any undefined values to prevent Firestore errors
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );
    
    return {
      ...cleanData,
      clockIn: cleanData.clockIn ? Timestamp.fromDate(cleanData.clockIn as Date) : null,
      clockOut: cleanData.clockOut ? Timestamp.fromDate(cleanData.clockOut as Date) : null,
      lunchStart: cleanData.lunchStart ? Timestamp.fromDate(cleanData.lunchStart as Date) : null,
      lunchEnd: cleanData.lunchEnd ? Timestamp.fromDate(cleanData.lunchEnd as Date) : null,
      createdAt: cleanData.createdAt ? Timestamp.fromDate(cleanData.createdAt as Date) : Timestamp.now(),
      updatedAt: Timestamp.now(),
      // Convert breaks to the format expected by Firestore
      breaks: (cleanData.breaks as any[])?.map(bt => ({
        startTime: bt.startTime ? Timestamp.fromDate(bt.startTime) : null,
        endTime: bt.endTime ? Timestamp.fromDate(bt.endTime) : null,
        type: bt.type || 'break',
        duration: bt.duration || 0
      })) || []
    };
  }

  async clockIn(userId: string, lateReason?: string, location?: GeolocationData): Promise<AttendanceRecord> {
    try {
      console.log('🕐 Starting clock in for user:', userId);

      // Get user document to fetch user details
      const userDocRef = doc(db, this.USERS_COLLECTION, userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const userName = userData.name || userData.displayName || `user_${userId}`;
      const today = format(new Date(), 'dd-MM-yyyy');

      // Check if user already clocked in today
      const attendanceRef = doc(
        db, 
        this.GLOBAL_ATTENDANCE_COLLECTION, 
        today, 
        this.RECORDS_SUBCOLLECTION, 
        userId  // Use userId instead of userName for consistency
      );
      const existingAttendance = await getDoc(attendanceRef);
      
      if (existingAttendance.exists() && existingAttendance.data().clockIn) {
        throw new Error('Already clocked in today');
      }

      const clockInTime = new Date();
      const newAttendanceRecord: AttendanceRecord = {
        id: today,
        userId,
        userName: userName || 'Unknown User',
        userEmail: userData.email || '',
        department: userData.department || 'Unknown',
        date: today,
        clockIn: clockInTime,
        clockOut: undefined,
        lunchStart: undefined,
        lunchEnd: undefined,
        breaks: [],
        breakTimes: [],
        hoursWorked: 0,
        totalHours: 0,
        isLate: this.isLateArrival(clockInTime),
        lateReason: this.isLateArrival(clockInTime) ? (lateReason || 'Late arrival') : undefined,
        location: location,
        overtime: 0,
        status: this.determineStatus(clockInTime),
        createdAt: clockInTime,
        updatedAt: clockInTime
      };

      const firestoreRecord = this.convertAttendanceToFirestore(newAttendanceRecord);

      // Save attendance record to global collection
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

      const today = format(new Date(), 'dd-MM-yyyy');
      const attendanceRef = doc(
        db, 
        this.GLOBAL_ATTENDANCE_COLLECTION, 
        today, 
        this.RECORDS_SUBCOLLECTION, 
        userId  // Use userId consistently
      );
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
      const clockInTime = (attendanceData.clockIn as { toDate(): Date }).toDate();
      const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      const updatedData = {
        clockOut: Timestamp.fromDate(clockOutTime),
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        status: 'completed',
        updatedAt: Timestamp.now(),
        ...(reason && { earlyLogoutReason: reason }) // Only add earlyLogoutReason if reason exists
      };

      // Update attendance record
      await updateDoc(attendanceRef, updatedData);

      // Get the updated document to return
      const updatedDoc = await getDoc(attendanceRef);
      const updatedRecord = this.convertFirestoreToAttendance(updatedDoc.data(), today);
      console.log('✅ Clock out successful:', updatedRecord);
      return updatedRecord;
    } catch (error) {
      console.error('❌ Clock out failed:', error);
      throw error;
    }
  }

  async getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
    try {
      const today = format(new Date(), 'dd-MM-yyyy');
      const attendanceRef = doc(
        db, 
        this.GLOBAL_ATTENDANCE_COLLECTION, 
        today, 
        this.RECORDS_SUBCOLLECTION, 
        userId  // Use userId consistently
      );
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
      const records: AttendanceRecord[] = [];

      // Get the last 'days' dates
      const dates: string[] = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(format(date, 'dd-MM-yyyy')); // Use consistent dd-MM-yyyy format
      }

      // Fetch attendance records for each date
      for (const date of dates) {
        const attendanceRef = doc(
          db, 
          this.GLOBAL_ATTENDANCE_COLLECTION, 
          date, 
          this.RECORDS_SUBCOLLECTION, 
          userId
        );
        const attendanceDoc = await getDoc(attendanceRef);
        
        if (attendanceDoc.exists()) {
          records.push(this.convertFirestoreToAttendance(attendanceDoc.data(), date));
        }
      }

      return records.sort((a, b) => compareDDMMYYYY(b.date, a.date));
    } catch (error) {
      console.error('Error getting attendance history:', error);
      return [];
    }
  }

  async getAttendanceRange(userId: string, startDate: Date, endDate: Date): Promise<AttendanceRecord[]> {
    try {
      const records: AttendanceRecord[] = [];

      // Generate all dates in the range
      const dates: string[] = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        dates.push(format(currentDate, 'dd-MM-yyyy'));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Fetch attendance records for each date
      for (const date of dates) {
        const attendanceRef = doc(
          db, 
          this.GLOBAL_ATTENDANCE_COLLECTION, 
          date, 
          this.RECORDS_SUBCOLLECTION, 
          userId
        );
        const attendanceDoc = await getDoc(attendanceRef);
        
        if (attendanceDoc.exists()) {
          records.push(this.convertFirestoreToAttendance(attendanceDoc.data(), date));
        }
      }

      return records.sort((a, b) => compareDDMMYYYY(b.date, a.date));
    } catch (error) {
      console.error('Error getting attendance range:', error);
      return [];
    }
  }

  async getAllAttendanceRecords(startDate?: string, endDate?: string): Promise<AttendanceRecord[]> {
    try {
      const allRecords: AttendanceRecord[] = [];

      // If date range is specified, use it; otherwise get last 30 days
      const dates: string[] = [];
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const currentDate = new Date(start);
        while (currentDate <= end) {
          dates.push(format(currentDate, 'dd-MM-yyyy')); // Use consistent dd-MM-yyyy format
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        // Get last 30 days
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          dates.push(format(date, 'dd-MM-yyyy')); // Use consistent dd-MM-yyyy format
        }
      }

      // Fetch all records for each date
      for (const date of dates) {
        const recordsSnapshot = await getDocs(
          collection(db, this.GLOBAL_ATTENDANCE_COLLECTION, date, this.RECORDS_SUBCOLLECTION)
        );
        
        recordsSnapshot.forEach((doc) => {
          allRecords.push(this.convertFirestoreToAttendance(doc.data(), date));
        });
      }

      return allRecords.sort((a, b) => compareDDMMYYYY(b.date, a.date));
    } catch (error) {
      console.error('Error getting all attendance records:', error);
      return [];
    }
  }

  async getAttendanceForDate(userId: string, date: Date): Promise<AttendanceRecord | null> {
    try {
      const dateStr = format(date, 'dd-MM-yyyy'); // Use consistent dd-MM-yyyy format
      const attendanceRef = doc(
        db, 
        this.GLOBAL_ATTENDANCE_COLLECTION, 
        dateStr, 
        this.RECORDS_SUBCOLLECTION, 
        userId
      );
      const attendanceDoc = await getDoc(attendanceRef);
      
      if (!attendanceDoc.exists()) {
        return null;
      }

      return this.convertFirestoreToAttendance(attendanceDoc.data(), dateStr);
    } catch (error) {
      console.error('Error getting attendance for date:', error);
      return null;
    }
  }

  private isLateArrival(clockInTime: Date): boolean {
    // Consider 10:00 AM as the standard start time
    const standardStartTime = new Date(clockInTime);
    standardStartTime.setHours(10, 0, 0, 0);
    
    return clockInTime > standardStartTime;
  }

  private determineStatus(clockInTime: Date): 'present' | 'absent' | 'late' | 'partial' | 'half-day' {
    const hour = clockInTime.getHours();
    
    if (hour > 10 || (hour === 10 && clockInTime.getMinutes() > 0)) {
      return 'late';
    }
    return 'present';
  }

  // Helper Methods removed AFK functionality

  async startBreak(userId: string, reason?: string): Promise<AttendanceRecord> {
    try {
      const today = format(new Date(), 'dd-MM-yyyy');
      const attendanceRef = doc(
        db, 
        this.GLOBAL_ATTENDANCE_COLLECTION, 
        today, 
        this.RECORDS_SUBCOLLECTION, 
        userId
      );
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
      const today = format(new Date(), 'dd-MM-yyyy');
      const attendanceRef = doc(
        db, 
        this.GLOBAL_ATTENDANCE_COLLECTION, 
        today, 
        this.RECORDS_SUBCOLLECTION, 
        userId
      );
      const attendanceDoc = await getDoc(attendanceRef);

      if (!attendanceDoc.exists()) {
        throw new Error('No attendance record found for today');
      }

      const attendanceData = attendanceDoc.data();
      const breakTimes = attendanceData.breakTimes || [];
      const activeBreakIndex = breakTimes.findIndex((bt: Record<string, unknown>) => !bt.end);

      if (activeBreakIndex === -1) {
        throw new Error('No active break found');
      }

      const endTime = new Date();
      const activeBreak = breakTimes[activeBreakIndex];
      const startTime = (activeBreak.start as { toDate(): Date }).toDate();
      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes

      // Update the break time
      breakTimes[activeBreakIndex] = {
        ...activeBreak,
        end: Timestamp.fromDate(endTime),
        duration
      };

      const totalBreakHours = breakTimes.reduce((sum: number, bt: Record<string, unknown>) => 
        sum + ((bt.duration as number) || 0), 0) / 60; // convert to hours

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

  async startLunchBreak(userId: string): Promise<AttendanceRecord> {
    try {
      const today = format(new Date(), 'dd-MM-yyyy');
      const attendanceRef = doc(
        db, 
        this.GLOBAL_ATTENDANCE_COLLECTION, 
        today, 
        this.RECORDS_SUBCOLLECTION, 
        userId
      );
      const attendanceDoc = await getDoc(attendanceRef);

      if (!attendanceDoc.exists()) {
        throw new Error('Please clock in first');
      }

      const attendanceData = attendanceDoc.data();
      if (!attendanceData.clockIn) {
        throw new Error('Please clock in first');
      }

      if (attendanceData.lunchStart) {
        throw new Error('Lunch break already started');
      }

      const lunchStartTime = new Date();
      
      await updateDoc(attendanceRef, {
        lunchStart: Timestamp.fromDate(lunchStartTime),
        updatedAt: Timestamp.now()
      });

      const updatedData = {
        ...attendanceData,
        lunchStart: Timestamp.fromDate(lunchStartTime),
        updatedAt: Timestamp.now()
      };

      return this.convertFirestoreToAttendance(updatedData, today);
    } catch (error) {
      console.error('Error starting lunch break:', error);
      throw error;
    }
  }

  async endLunchBreak(userId: string, isLate?: boolean): Promise<AttendanceRecord> {
    try {
      const today = format(new Date(), 'dd-MM-yyyy');
      const attendanceRef = doc(
        db, 
        this.GLOBAL_ATTENDANCE_COLLECTION, 
        today, 
        this.RECORDS_SUBCOLLECTION, 
        userId
      );
      const attendanceDoc = await getDoc(attendanceRef);

      if (!attendanceDoc.exists()) {
        throw new Error('No attendance record found for today');
      }

      const attendanceData = attendanceDoc.data();
      if (!attendanceData.lunchStart) {
        throw new Error('Lunch break not started');
      }

      if (attendanceData.lunchEnd) {
        throw new Error('Lunch break already ended');
      }

      const lunchEndTime = new Date();
      const updateData: any = {
        lunchEnd: Timestamp.fromDate(lunchEndTime),
        updatedAt: Timestamp.now()
      };

      // If returning late from lunch (after 3:00 PM), mark as late
      if (isLate) {
        updateData.isLateFromLunch = true;
        updateData.lunchLateReason = 'Late return from lunch break';
      }

      await updateDoc(attendanceRef, updateData);

      const updatedData = {
        ...attendanceData,
        ...updateData
      };

      return this.convertFirestoreToAttendance(updatedData, today);
    } catch (error) {
      console.error('Error ending lunch break:', error);
      throw error;
    }
  }

  // Helper method to check if it's lunch time
  isLunchTime(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Lunch time is 2:00 PM to 3:00 PM (14:00 to 15:00)
    return (currentHour === 14) || (currentHour === 15 && currentMinute === 0);
  }

  // Helper method to check if user is late returning from lunch
  isLateFromLunch(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Late if it's after 3:00 PM (15:00)
    return currentHour > 15;
  }
}

export const globalAttendanceService = new GlobalAttendanceService();



