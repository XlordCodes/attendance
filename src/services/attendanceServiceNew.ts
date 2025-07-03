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
  limit,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { format } from 'date-fns';

// Types for the new attendance structure
export interface AttendanceDocumentNew {
  loginTime: Timestamp | null;
  logoutTime: Timestamp | null;
  breaks: BreakSession[];
  isLate: boolean;
  lateReason: string;
  workedHours: number;
  afkTime: number;
}

export interface BreakSession {
  start: Timestamp;
  end: Timestamp | null;
}

export interface AttendanceDocumentDisplay {
  date: string;
  loginTime: Date | null;
  logoutTime: Date | null;
  breaks: BreakSessionDisplay[];
  isLate: boolean;
  lateReason: string;
  workedHours: number;
  afkTime: number;
}

export interface BreakSessionDisplay {
  start: Date;
  end: Date | null;
}

class AttendanceServiceNew {
  private readonly USERS_COLLECTION = 'users';
  private readonly ATTENDANCE_SUBCOLLECTION = 'attendance_kailash';

  /**
   * Get attendance document reference for a specific date
   */
  private getAttendanceDocRef(userId: string, date: string) {
    return doc(db, this.USERS_COLLECTION, userId, this.ATTENDANCE_SUBCOLLECTION, date);
  }

  /**
   * Get attendance collection reference for a user
   */
  private getAttendanceCollectionRef(userId: string) {
    return collection(db, this.USERS_COLLECTION, userId, this.ATTENDANCE_SUBCOLLECTION);
  }

  /**
   * Convert Firestore attendance document to display format
   */
  private convertFirestoreToDisplay(data: any, date: string): AttendanceDocumentDisplay {
    return {
      date,
      loginTime: data.loginTime?.toDate() || null,
      logoutTime: data.logoutTime?.toDate() || null,
      breaks: (data.breaks || []).map((breakSession: any) => ({
        start: breakSession.start?.toDate(),
        end: breakSession.end?.toDate() || null
      })),
      isLate: data.isLate || false,
      lateReason: data.lateReason || '',
      workedHours: data.workedHours || 0,
      afkTime: data.afkTime || 0
    };
  }

  /**
   * Convert display format to Firestore document
   */
  private convertDisplayToFirestore(attendance: Partial<AttendanceDocumentDisplay>): Partial<AttendanceDocumentNew> {
    const result: Partial<AttendanceDocumentNew> = {};

    if (attendance.loginTime !== undefined) {
      result.loginTime = attendance.loginTime ? Timestamp.fromDate(attendance.loginTime) : null;
    }
    if (attendance.logoutTime !== undefined) {
      result.logoutTime = attendance.logoutTime ? Timestamp.fromDate(attendance.logoutTime) : null;
    }
    if (attendance.breaks !== undefined) {
      result.breaks = attendance.breaks.map(breakSession => ({
        start: Timestamp.fromDate(breakSession.start),
        end: breakSession.end ? Timestamp.fromDate(breakSession.end) : null
      }));
    }
    if (attendance.isLate !== undefined) {
      result.isLate = attendance.isLate;
    }
    if (attendance.lateReason !== undefined) {
      result.lateReason = attendance.lateReason;
    }
    if (attendance.workedHours !== undefined) {
      result.workedHours = attendance.workedHours;
    }
    if (attendance.afkTime !== undefined) {
      result.afkTime = attendance.afkTime;
    }

    return result;
  }

  /**
   * Calculate if user is late based on login time
   */
  private calculateIsLate(loginTime: Date): { isLate: boolean; lateReason: string } {
    const startOfWorkDay = new Date(loginTime);
    startOfWorkDay.setHours(9, 0, 0, 0); // Assuming work starts at 9:00 AM

    const isLate = loginTime > startOfWorkDay;
    const lateMinutes = isLate ? Math.floor((loginTime.getTime() - startOfWorkDay.getTime()) / (1000 * 60)) : 0;
    
    return {
      isLate,
      lateReason: isLate ? `Late by ${lateMinutes} minutes` : ''
    };
  }

  /**
   * Calculate worked hours from login/logout times and breaks
   */
  private calculateWorkedHours(
    loginTime: Date | null, 
    logoutTime: Date | null, 
    breaks: BreakSessionDisplay[]
  ): number {
    if (!loginTime || !logoutTime) return 0;

    const totalWorkTimeMs = logoutTime.getTime() - loginTime.getTime();
    
    // Calculate total break time
    const totalBreakTimeMs = breaks.reduce((total, breakSession) => {
      if (breakSession.end) {
        return total + (breakSession.end.getTime() - breakSession.start.getTime());
      }
      return total;
    }, 0);

    const actualWorkTimeMs = totalWorkTimeMs - totalBreakTimeMs;
    return Math.max(0, actualWorkTimeMs / (1000 * 60 * 60)); // Convert to hours
  }

  /**
   * Get attendance for a specific date
   */
  async getAttendanceForDate(userId: string, date: string): Promise<AttendanceDocumentDisplay | null> {
    try {
      const docRef = this.getAttendanceDocRef(userId, date);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return this.convertFirestoreToDisplay(docSnap.data(), date);
      }
      return null;
    } catch (error) {
      console.error('Error getting attendance for date:', error);
      throw error;
    }
  }

  /**
   * Get attendance for today
   */
  async getTodayAttendance(userId: string): Promise<AttendanceDocumentDisplay | null> {
    const today = format(new Date(), 'yyyy-MM-dd');
    return this.getAttendanceForDate(userId, today);
  }

  /**
   * Clock in - create or update attendance document with login time
   */
  async clockIn(userId: string): Promise<AttendanceDocumentDisplay> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const loginTime = new Date();
      
      // Check if already clocked in today
      const existingAttendance = await this.getAttendanceForDate(userId, today);
      if (existingAttendance?.loginTime) {
        throw new Error('Already clocked in today');
      }

      const lateInfo = this.calculateIsLate(loginTime);

      const attendanceData: AttendanceDocumentDisplay = {
        date: today,
        loginTime,
        logoutTime: null,
        breaks: [],
        isLate: lateInfo.isLate,
        lateReason: lateInfo.lateReason,
        workedHours: 0,
        afkTime: 0
      };

      const firestoreData = this.convertDisplayToFirestore(attendanceData);
      const docRef = this.getAttendanceDocRef(userId, today);
      
      await setDoc(docRef, firestoreData, { merge: true });

      console.log('✅ Clock in successful for user:', userId);
      return attendanceData;
    } catch (error) {
      console.error('❌ Clock in failed:', error);
      throw error;
    }
  }

  /**
   * Clock out - update attendance document with logout time and calculate worked hours
   */
  async clockOut(userId: string): Promise<AttendanceDocumentDisplay> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const logoutTime = new Date();
      
      const existingAttendance = await this.getAttendanceForDate(userId, today);
      if (!existingAttendance?.loginTime) {
        throw new Error('Must clock in before clocking out');
      }

      if (existingAttendance.logoutTime) {
        throw new Error('Already clocked out today');
      }

      const workedHours = this.calculateWorkedHours(
        existingAttendance.loginTime,
        logoutTime,
        existingAttendance.breaks
      );

      const updatedAttendance: AttendanceDocumentDisplay = {
        ...existingAttendance,
        logoutTime,
        workedHours
      };

      const firestoreData = this.convertDisplayToFirestore(updatedAttendance);
      const docRef = this.getAttendanceDocRef(userId, today);
      
      await updateDoc(docRef, firestoreData);

      console.log('✅ Clock out successful for user:', userId);
      return updatedAttendance;
    } catch (error) {
      console.error('❌ Clock out failed:', error);
      throw error;
    }
  }

  /**
   * Start a break
   */
  async startBreak(userId: string): Promise<AttendanceDocumentDisplay> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const breakStart = new Date();
      
      const existingAttendance = await this.getAttendanceForDate(userId, today);
      if (!existingAttendance?.loginTime) {
        throw new Error('Must clock in before taking a break');
      }

      if (existingAttendance.logoutTime) {
        throw new Error('Cannot start break after clocking out');
      }

      // Check if there's already an ongoing break
      const ongoingBreak = existingAttendance.breaks.find(b => !b.end);
      if (ongoingBreak) {
        throw new Error('Break already in progress');
      }

      const newBreak: BreakSessionDisplay = {
        start: breakStart,
        end: null
      };

      const updatedAttendance: AttendanceDocumentDisplay = {
        ...existingAttendance,
        breaks: [...existingAttendance.breaks, newBreak]
      };

      const firestoreData = this.convertDisplayToFirestore(updatedAttendance);
      const docRef = this.getAttendanceDocRef(userId, today);
      
      await updateDoc(docRef, { breaks: firestoreData.breaks });

      console.log('✅ Break started for user:', userId);
      return updatedAttendance;
    } catch (error) {
      console.error('❌ Start break failed:', error);
      throw error;
    }
  }

  /**
   * End a break
   */
  async endBreak(userId: string): Promise<AttendanceDocumentDisplay> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const breakEnd = new Date();
      
      const existingAttendance = await this.getAttendanceForDate(userId, today);
      if (!existingAttendance?.loginTime) {
        throw new Error('Must clock in before ending a break');
      }

      // Find the ongoing break
      const ongoingBreakIndex = existingAttendance.breaks.findIndex(b => !b.end);
      if (ongoingBreakIndex === -1) {
        throw new Error('No break in progress');
      }

      const updatedBreaks = [...existingAttendance.breaks];
      updatedBreaks[ongoingBreakIndex] = {
        ...updatedBreaks[ongoingBreakIndex],
        end: breakEnd
      };

      // Recalculate worked hours if already clocked out
      let workedHours = existingAttendance.workedHours;
      if (existingAttendance.logoutTime) {
        workedHours = this.calculateWorkedHours(
          existingAttendance.loginTime,
          existingAttendance.logoutTime,
          updatedBreaks
        );
      }

      const updatedAttendance: AttendanceDocumentDisplay = {
        ...existingAttendance,
        breaks: updatedBreaks,
        workedHours
      };

      const firestoreData = this.convertDisplayToFirestore(updatedAttendance);
      const docRef = this.getAttendanceDocRef(userId, today);
      
      await updateDoc(docRef, { 
        breaks: firestoreData.breaks,
        workedHours: firestoreData.workedHours
      });

      console.log('✅ Break ended for user:', userId);
      return updatedAttendance;
    } catch (error) {
      console.error('❌ End break failed:', error);
      throw error;
    }
  }

  /**
   * Update AFK time
   */
  async updateAfkTime(userId: string, afkMinutes: number): Promise<void> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const docRef = this.getAttendanceDocRef(userId, today);
      
      await updateDoc(docRef, { 
        afkTime: afkMinutes 
      });

      console.log('✅ AFK time updated for user:', userId, 'minutes:', afkMinutes);
    } catch (error) {
      console.error('❌ Update AFK time failed:', error);
      throw error;
    }
  }

  /**
   * Get attendance records for a date range
   */
  async getAttendanceRange(
    userId: string, 
    startDate: string, 
    endDate: string
  ): Promise<AttendanceDocumentDisplay[]> {
    try {
      const collectionRef = this.getAttendanceCollectionRef(userId);
      const q = query(
        collectionRef,
        where('__name__', '>=', startDate),
        where('__name__', '<=', endDate),
        orderBy('__name__', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const records: AttendanceDocumentDisplay[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        records.push(this.convertFirestoreToDisplay(data, doc.id));
      });

      return records;
    } catch (error) {
      console.error('Error getting attendance range:', error);
      throw error;
    }
  }

  /**
   * Get recent attendance records
   */
  async getRecentAttendance(userId: string, limitCount: number = 10): Promise<AttendanceDocumentDisplay[]> {
    try {
      const collectionRef = this.getAttendanceCollectionRef(userId);
      const q = query(
        collectionRef,
        orderBy('__name__', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const records: AttendanceDocumentDisplay[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        records.push(this.convertFirestoreToDisplay(data, doc.id));
      });

      return records;
    } catch (error) {
      console.error('Error getting recent attendance:', error);
      throw error;
    }
  }

  /**
   * Check if user is currently on break
   */
  async isOnBreak(userId: string): Promise<boolean> {
    try {
      const todayAttendance = await this.getTodayAttendance(userId);
      if (!todayAttendance) return false;

      return todayAttendance.breaks.some(breakSession => !breakSession.end);
    } catch (error) {
      console.error('Error checking break status:', error);
      return false;
    }
  }

  /**
   * Check if user is currently clocked in
   */
  async isClockedIn(userId: string): Promise<boolean> {
    try {
      const todayAttendance = await this.getTodayAttendance(userId);
      return Boolean(todayAttendance?.loginTime && !todayAttendance?.logoutTime);
    } catch (error) {
      console.error('Error checking clock in status:', error);
      return false;
    }
  }
}

export const attendanceServiceNew = new AttendanceServiceNew();
export default attendanceServiceNew;
