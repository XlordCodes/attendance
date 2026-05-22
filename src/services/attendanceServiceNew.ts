import { supabase } from './supabaseClient';

import { getOfficeTodayIso, toOfficeDate, toOfficeDateSafe } from '../utils/timezoneUtils';
import { isLateArrival, calculateLateMinutes } from '../constants/workingHours';

// Types for the new attendance structure
export interface AttendanceDocumentNew {
  loginTime: Date | null;
  logoutTime: Date | null;
  breaks: BreakSession[];
  isLate: boolean;
  lateReason: string;
  workedHours: number;
}

export interface BreakSession {
  start: Date;
  end: Date | null;
  id?: string;
}

export interface AttendanceDocumentDisplay {
  date: string;
  loginTime: Date | null;
  logoutTime: Date | null;
  breaks: BreakSessionDisplay[];
  isLate: boolean;
  lateReason: string;
  workedHours: number;
}

export interface BreakSessionDisplay {
  start: Date;
  end: Date | null;
  id?: string;
}

class AttendanceServiceNew {
  private readonly ATTENDANCE_TABLE = 'attendance_records';
  private readonly BREAKS_TABLE = 'attendance_breaks';

  /**
   * Convert database attendance record to display format
   */
  private convertDbToDisplay(dbData: any, breaks: any[], date: string): AttendanceDocumentDisplay {
    return {
      date,
      loginTime: toOfficeDateSafe(dbData.login_time) || null,
      logoutTime: toOfficeDateSafe(dbData.logout_time) || null,
      breaks: breaks.map((breakDb: any) => ({
        id: breakDb.id,
        start: toOfficeDate(breakDb.start),
        end: toOfficeDateSafe(breakDb.end) || null
      })),
      isLate: dbData.is_late || false,
      lateReason: dbData.late_reason || '',
      workedHours: dbData.worked_hours || 0
    };
  }

  /**
   * Calculate if user is late based on login time
   */
  private calculateIsLate(loginTime: Date): { isLate: boolean; lateReason: string } {
    const isLate = isLateArrival(loginTime);
    const lateMinutes = isLate ? calculateLateMinutes(loginTime) : 0;
    
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
      // Get attendance record
      const { data: attendanceRecord, error: attendanceError } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .single();

      if (attendanceError) {
        if (attendanceError.code === 'PGRST116') return null; // No record found
        throw attendanceError;
      }

      // Get breaks for this attendance record
      const { data: breaks, error: breaksError } = await supabase
        .from(this.BREAKS_TABLE)
        .select('*')
        .eq('attendance_record_id', attendanceRecord.id)
        .order('start', { ascending: true });

      if (breaksError) throw breaksError;

      return this.convertDbToDisplay(attendanceRecord, breaks, date);
    } catch (error) {
      console.error('Error getting attendance for date:', error);
      throw error;
    }
  }

  /**
   * Get attendance for today
   */
  async getTodayAttendance(userId: string): Promise<AttendanceDocumentDisplay | null> {
    const today = getOfficeTodayIso();
    return this.getAttendanceForDate(userId, today);
  }

  /**
   * Clock in - create or update attendance document with login time
   * USES SERVER-SIDE TIMESTAMP TO PREVENT TIME SPOOFING
   */
  async clockIn(userId: string, customLateReason?: string): Promise<AttendanceDocumentDisplay> {
    try {
      const today = getOfficeTodayIso();
      
      // Check if already clocked in today
      const existingAttendance = await this.getAttendanceForDate(userId, today);
      if (existingAttendance?.loginTime) {
        throw new Error('Already clocked in today');
      }

      // First create attendance record with server timestamp
      const { data: insertedRecord, error: insertError } = await supabase
        .rpc('clock_in', {
          p_user_id: userId,
          p_date: today
        })
        .single();

      if (insertError) throw insertError;

      // Type assertion for RPC return value
      const typedInsertedRecord = insertedRecord as { id: string; login_time: string };

      // Get the server-generated login time
      const loginTime = toOfficeDate(typedInsertedRecord.login_time);
      const lateInfo = this.calculateIsLate(loginTime);
      
      // Use custom late reason if provided and user is actually late
      const finalLateReason = lateInfo.isLate && customLateReason 
        ? customLateReason 
        : lateInfo.lateReason;

      // Update late status
      await supabase
        .from(this.ATTENDANCE_TABLE)
        .update({
          is_late: lateInfo.isLate,
          late_reason: finalLateReason
        })
        .eq('id', typedInsertedRecord.id);

      console.log('✅ Clock in successful for user:', userId);
      
      return {
        date: today,
        loginTime,
        logoutTime: null,
        breaks: [],
        isLate: lateInfo.isLate,
        lateReason: finalLateReason,
        workedHours: 0
      };
    } catch (error) {
      console.error('❌ Clock in failed:', error);
      throw error;
    }
  }

  /**
   * Clock out - update attendance document with logout time and calculate worked hours
   * USES SERVER-SIDE TIMESTAMP TO PREVENT TIME SPOOFING
   */
  async clockOut(userId: string): Promise<AttendanceDocumentDisplay> {
    try {
      const today = getOfficeTodayIso();
      
      const existingAttendance = await this.getAttendanceForDate(userId, today);
      if (!existingAttendance?.loginTime) {
        throw new Error('Must clock in before clocking out');
      }

      if (existingAttendance.logoutTime) {
        throw new Error('Already clocked out today');
      }

      // State machine validation: Check for active break
      const activeBreak = existingAttendance.breaks.find(b => !b.end);
      if (activeBreak) {
        throw new Error('Cannot clock out while a break is active. Please end your break first.');
      }

      // Update with server timestamp
      const { data: updatedRecord, error: updateError } = await supabase
        .rpc('clock_out', {
          p_user_id: userId,
          p_date: today
        })
        .single();

      if (updateError) throw updateError;

      // Type assertion for RPC return value
      const typedUpdatedRecord = updatedRecord as { id: string; logout_time: string };

      const logoutTime = toOfficeDate(typedUpdatedRecord.logout_time);

      const workedHours = this.calculateWorkedHours(
        existingAttendance.loginTime,
        logoutTime,
        existingAttendance.breaks
      );

      // Update worked hours
      await supabase
        .from(this.ATTENDANCE_TABLE)
        .update({ worked_hours: workedHours })
        .eq('id', typedUpdatedRecord.id);

      const updatedAttendance: AttendanceDocumentDisplay = {
        ...existingAttendance,
        logoutTime,
        workedHours
      };

      console.log('✅ Clock out successful for user:', userId);
      return updatedAttendance;
    } catch (error) {
      console.error('❌ Clock out failed:', error);
      throw error;
    }
  }

  /**
   * Start a break
   * USES SERVER-SIDE TIMESTAMP TO PREVENT TIME SPOOFING
   */
  async startBreak(userId: string): Promise<AttendanceDocumentDisplay> {
    try {
      const today = getOfficeTodayIso();
      
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

      // Get attendance record ID
      const { data: attendanceRecord, error: recordError } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select('id')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (recordError) throw recordError;

      // Create break with server timestamp
      const { data: newBreak, error: breakError } = await supabase
        .rpc('start_break', {
          p_attendance_record_id: attendanceRecord.id
        })
        .single();

      if (breakError) throw breakError;

      // Type assertion for RPC return value
      const typedNewBreak = newBreak as { id: string; start: string };

      const updatedBreaks = [...existingAttendance.breaks, {
        id: typedNewBreak.id,
        start: toOfficeDate(typedNewBreak.start),
        end: null
      }];

      const updatedAttendance: AttendanceDocumentDisplay = {
        ...existingAttendance,
        breaks: updatedBreaks
      };

      console.log('✅ Break started for user:', userId);
      return updatedAttendance;
    } catch (error) {
      console.error('❌ Start break failed:', error);
      throw error;
    }
  }

  /**
   * End a break
   * USES SERVER-SIDE TIMESTAMP TO PREVENT TIME SPOOFING
   */
  async endBreak(userId: string): Promise<AttendanceDocumentDisplay> {
    try {
      const today = getOfficeTodayIso();
      
      const existingAttendance = await this.getAttendanceForDate(userId, today);
      if (!existingAttendance?.loginTime) {
        throw new Error('Must clock in before ending a break');
      }

      // Find the ongoing break
      const ongoingBreakIndex = existingAttendance.breaks.findIndex(b => !b.end);
      if (ongoingBreakIndex === -1) {
        throw new Error('No break in progress');
      }

      const ongoingBreak = existingAttendance.breaks[ongoingBreakIndex];

      // End break with server timestamp
      const { data: updatedBreak, error: breakError } = await supabase
        .rpc('end_break', {
          p_break_id: ongoingBreak.id
        })
        .single();

      if (breakError) throw breakError;

      // Type assertion for RPC return value
      const typedUpdatedBreak = updatedBreak as { id: string; end: string };

      const updatedBreaks = [...existingAttendance.breaks];
      updatedBreaks[ongoingBreakIndex] = {
        ...updatedBreaks[ongoingBreakIndex],
        end: toOfficeDate(typedUpdatedBreak.end)
      };

      // Recalculate worked hours if already clocked out
      let workedHours = existingAttendance.workedHours;
      if (existingAttendance.logoutTime) {
        workedHours = this.calculateWorkedHours(
          existingAttendance.loginTime,
          existingAttendance.logoutTime,
          updatedBreaks
        );

        // Get attendance record ID
        const { data: attendanceRecord, error: recordError } = await supabase
          .from(this.ATTENDANCE_TABLE)
          .select('id')
          .eq('user_id', userId)
          .eq('date', today)
          .single();

        if (recordError) throw recordError;
        
        if (attendanceRecord) {
          await supabase
            .from(this.ATTENDANCE_TABLE)
            .update({ worked_hours: workedHours })
            .eq('id', attendanceRecord.id);
        }
      }

      const updatedAttendance: AttendanceDocumentDisplay = {
        ...existingAttendance,
        breaks: updatedBreaks,
        workedHours
      };

      console.log('✅ Break ended for user:', userId);
      return updatedAttendance;
    } catch (error) {
      console.error('❌ End break failed:', error);
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
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (attendanceError) throw attendanceError;

      // Get all breaks for these records
      const recordIds = attendanceRecords.map(r => r.id);
      const { data: allBreaks, error: breaksError } = await supabase
        .from(this.BREAKS_TABLE)
        .select('*')
        .in('attendance_record_id', recordIds)
        .order('start', { ascending: true });

      if (breaksError) throw breaksError;

      // Map breaks to records
      const records: AttendanceDocumentDisplay[] = attendanceRecords.map(record => {
        const recordBreaks = allBreaks.filter(b => b.attendance_record_id === record.id);
        return this.convertDbToDisplay(record, recordBreaks, record.date);
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
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limitCount);

      if (attendanceError) throw attendanceError;

      // Get all breaks for these records
      const recordIds = attendanceRecords.map(r => r.id);
      const { data: allBreaks, error: breaksError } = await supabase
        .from(this.BREAKS_TABLE)
        .select('*')
        .in('attendance_record_id', recordIds)
        .order('start', { ascending: true });

      if (breaksError) throw breaksError;

      // Map breaks to records
      const records: AttendanceDocumentDisplay[] = attendanceRecords.map(record => {
        const recordBreaks = allBreaks.filter(b => b.attendance_record_id === record.id);
        return this.convertDbToDisplay(record, recordBreaks, record.date);
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
