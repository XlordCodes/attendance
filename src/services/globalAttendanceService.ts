import { AttendanceRecord, GeolocationData } from '../types';
import { format } from 'date-fns';
import { parseDDMMYYYY, compareDDMMYYYY } from '../utils/dateUtils';
import { 
  toOfficeDate, 
  toOfficeDateSafe, 
  getOfficeTodayIso, 
  getOfficeTodayDDMMYYYY, 
  getOfficeNow 
} from '../utils/timezoneUtils';
import {
  isLateArrival,
  WORKING_HOURS,
  getLunchStartTime,
  getLunchEndTime,
  getWorkEndTime
} from '../constants/workingHours';
import { supabase } from './supabaseClient';

class GlobalAttendanceService {
  private readonly ATTENDANCE_TABLE = 'attendance_records';
  private readonly BREAKS_TABLE = 'attendance_breaks';
  private readonly USERS_TABLE = 'employees';

  private convertDbToAttendance(dbData: any): AttendanceRecord {
    const breaks = (dbData.attendance_breaks || []) as Array<any>;

    return {
      id: dbData.id,
      userId: dbData.user_id || '',
      userName: dbData.employees?.name || '',
      userEmail: dbData.employees?.email || '',
      employeeId: dbData.employees?.employee_id,
      employeeName: dbData.employees?.name || '',
      department: dbData.employees?.department || '',
      date: dbData.date,
      clockIn: toOfficeDateSafe(dbData.login_time),
      clockOut: toOfficeDateSafe(dbData.logout_time),
      lunchStart: toOfficeDateSafe(dbData.lunch_start),
      lunchEnd: toOfficeDateSafe(dbData.lunch_end),
      createdAt: toOfficeDate(dbData.created_at),
      updatedAt: toOfficeDate(dbData.updated_at),
      hoursWorked: dbData.worked_hours || 0,
      totalHours: dbData.worked_hours || 0,
      breaks: breaks.map((bt: any) => ({
        id: bt.id,
        startTime: toOfficeDate(bt.start),
        endTime: toOfficeDateSafe(bt.end),
        type: bt.type || 'break',
        duration: bt.duration || 0
      })),
      breakTimes: breaks.map((bt: any) => ({
        id: bt.id,
        start: toOfficeDate(bt.start),
        end: toOfficeDateSafe(bt.end),
        type: bt.type || 'break',
        duration: bt.duration || 0
      })),
      isLate: dbData.is_late || false,
      lateReason: dbData.late_reason || null,
      status: this.determineStatus(toOfficeDateSafe(dbData.login_time) || null),
      location: dbData.location as GeolocationData || null,
      overtime: dbData.overtime || 0
    } as AttendanceRecord;
  }

  async clockIn(userId: string, lateReason?: string, location?: GeolocationData, clientIP?: string): Promise<AttendanceRecord> {
    try {
      console.log('🕐 Starting clock in for user:', userId);

      // Get user details
      const { data: userData, error: userError } = await supabase
        .from(this.USERS_TABLE)
        .select('name, email, employee_id, department')
        .eq('id', userId)
        .single();

      if (userError) throw new Error('User not found');

      const today = getOfficeTodayDDMMYYYY();
      const todayIso = getOfficeTodayIso();

      // Check if already clocked in today
      const { data: existingRecord } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select('login_time')
        .eq('user_id', userId)
        .eq('date', todayIso)
        .single();

      if (existingRecord?.login_time) {
        throw new Error('Already clocked in today');
      }

      // Create attendance record with SERVER TIMESTAMP
      const { data: attendanceRecord, error: insertError } = await supabase
        .rpc('clock_in', {
          p_user_id: userId,
          p_date: todayIso
        })
        .single();

      if (insertError) throw insertError;

      const clockInTime = toOfficeDate(attendanceRecord.login_time);
      const isLate = this.isLateArrival(clockInTime);

      // Update with late status, location, reason and audit data
      await supabase
        .from(this.ATTENDANCE_TABLE)
        .update({
          is_late: isLate,
          late_reason: isLate ? (lateReason || 'Late arrival') : null,
          location: location,
          client_ip: clientIP
        })
        .eq('id', attendanceRecord.id);

      const newAttendanceRecord: AttendanceRecord = {
        id: attendanceRecord.id,
        userId,
        userName: userData.name || 'Unknown User',
        userEmail: userData.email || '',
        employeeId: userData.employee_id,
        employeeName: userData.name || '',
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
        isLate: isLate,
        lateReason: isLate ? (lateReason || 'Late arrival') : undefined,
        location: location,
        overtime: 0,
        status: this.determineStatus(clockInTime),
        createdAt: clockInTime,
        updatedAt: clockInTime
      };

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

      const todayIso = new Date().toISOString().split('T')[0];
      const today = format(new Date(), 'dd-MM-yyyy');

      // Clock out with SERVER TIMESTAMP
      const { data: attendanceRecord, error: updateError } = await supabase
        .rpc('clock_out', {
          p_user_id: userId,
          p_date: todayIso
        })
        .single();

      if (updateError) throw updateError;

      // Get full record with user and breaks
      const { data: fullRecord, error: fetchError } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select(`
          *,
          employees:user_id (name, email, employee_id, department),
          attendance_breaks (*)
        `)
        .eq('id', attendanceRecord.id)
        .single();

      if (fetchError) throw fetchError;

      const clockInTime = toOfficeDate(fullRecord.login_time);
      const clockOutTime = toOfficeDate(attendanceRecord.logout_time);
      const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
      const overtime = Math.max(0, hoursWorked - WORKING_HOURS.STANDARD_WORK_HOURS);

      // Update worked hours and overtime
      await supabase
        .from(this.ATTENDANCE_TABLE)
        .update({
          worked_hours: Math.round(hoursWorked * 100) / 100,
          overtime: Math.round(overtime * 100) / 100,
          early_logout_reason: reason
        })
        .eq('id', attendanceRecord.id);

      const updatedRecord = this.convertDbToAttendance({
        ...fullRecord,
        logout_time: attendanceRecord.logout_time,
        worked_hours: Math.round(hoursWorked * 100) / 100,
        overtime: Math.round(overtime * 100) / 100
      });

      console.log('✅ Clock out successful:', updatedRecord);
      return updatedRecord;
    } catch (error) {
      console.error('❌ Clock out failed:', error);
      throw error;
    }
  }

  async getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
    try {
      const todayIso = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select(`
          *,
          employees:user_id (name, email, employee_id, department),
          attendance_breaks (*)
        `)
        .eq('user_id', userId)
        .eq('date', todayIso)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.convertDbToAttendance(data);
    } catch (error) {
      console.error('Error getting today attendance:', error);
      return null;
    }
  }

  async getAttendanceHistory(userId: string, days: number = 30): Promise<AttendanceRecord[]> {
    try {
      const endDate = getOfficeNow();
      const startDate = getOfficeNow();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select(`
          *,
          employees:user_id (name, email, employee_id, department),
          attendance_breaks (*)
        `)
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

      return data.map(this.convertDbToAttendance.bind(this));
    } catch (error) {
      console.error('Error getting attendance history:', error);
      return [];
    }
  }

  async getAttendanceRange(userId: string, startDate: Date, endDate: Date): Promise<AttendanceRecord[]> {
    try {
      const { data, error } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select(`
          *,
          employees:user_id (name, email, employee_id, department),
          attendance_breaks (*)
        `)
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

      return data.map(this.convertDbToAttendance.bind(this));
    } catch (error) {
      console.error('Error getting attendance range:', error);
      return [];
    }
  }

  async getAllAttendanceRecords(startDate?: string, endDate?: string): Promise<AttendanceRecord[]> {
    try {
      let query = supabase
        .from(this.ATTENDANCE_TABLE)
        .select(`
          *,
          employees:user_id (name, email, employee_id, department),
          attendance_breaks (*)
        `)
        .order('date', { ascending: false });

      if (startDate && endDate) {
        query = query
          .gte('date', new Date(startDate).toISOString().split('T')[0])
          .lte('date', new Date(endDate).toISOString().split('T')[0]);
      } else {
        const thirtyDaysAgo = getOfficeNow();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('date', thirtyDaysAgo.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(this.convertDbToAttendance.bind(this));
    } catch (error) {
      console.error('Error getting all attendance records:', error);
      return [];
    }
  }

  async getAttendanceForDate(userId: string, date: Date): Promise<AttendanceRecord | null> {
    try {
      const dateStr = date.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select(`
          *,
          employees:user_id (name, email, employee_id, department),
          attendance_breaks (*)
        `)
        .eq('user_id', userId)
        .eq('date', dateStr)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.convertDbToAttendance(data);
    } catch (error) {
      console.error('Error getting attendance for date:', error);
      return null;
    }
  }

  async getAllAttendanceForDate(date: string): Promise<{ [userId: string]: AttendanceRecord }> {
    try {
      console.log(`🔍 Fetching all attendance for date: ${date}`);

      const dateIso = parseDDMMYYYY(date)?.toISOString().split('T')[0];
      if (!dateIso) return {};

      const { data, error } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select(`
          *,
          employees:user_id (name, email, employee_id, department),
          attendance_breaks (*)
        `)
        .eq('date', dateIso);

      if (error) throw error;

      const attendanceByUser: { [userId: string]: AttendanceRecord } = {};
      data.forEach(record => {
        attendanceByUser[record.user_id] = this.convertDbToAttendance(record);
      });

      console.log(`📊 Found attendance for ${Object.keys(attendanceByUser).length} users on ${date}`);
      return attendanceByUser;
    } catch (error) {
      console.error(`❌ Error fetching attendance for date ${date}:`, error);
      return {};
    }
  }

  async getAttendanceRecords(employeeId: string): Promise<AttendanceRecord[]> {
    try {
      console.log(`🔍 Fetching attendance records for employee: ${employeeId}`);

      const { data, error } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select(`
          *,
          employees:user_id (name, email, employee_id, department),
          attendance_breaks (*)
        `)
        .eq('user_id', employeeId)
        .order('date', { ascending: false });

      if (error) throw error;

      const records = data.map(this.convertDbToAttendance.bind(this));

      console.log(`📊 Found ${records.length} records for ${employeeId}`);
      return records;
    } catch (error) {
      console.error(`❌ Error fetching attendance for ${employeeId}:`, error);
      return [];
    }
  }

  private isLateArrival(clockInTime: Date | null): boolean {
    if (!clockInTime) return false;
    return isLateArrival(clockInTime);
  }

  private determineStatus(clockInTime: Date | null): 'present' | 'absent' | 'late' | 'partial' | 'half-day' {
    if (!clockInTime) return 'absent';
    return this.isLateArrival(clockInTime) ? 'late' : 'present';
  }

  async startBreak(userId: string): Promise<AttendanceRecord> {
    try {
      const todayIso = new Date().toISOString().split('T')[0];
      const today = format(new Date(), 'dd-MM-yyyy');

      // Get attendance record
      const { data: attendanceRecord, error: recordError } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select('id, login_time')
        .eq('user_id', userId)
        .eq('date', todayIso)
        .single();

      if (recordError || !attendanceRecord?.login_time) {
        throw new Error('Please clock in first');
      }

      // Check for active break
      const { count: activeBreaks } = await supabase
        .from(this.BREAKS_TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('attendance_record_id', attendanceRecord.id)
        .is('end', null);

      if (activeBreaks && activeBreaks > 0) {
        throw new Error('A break is already in progress');
      }

      // Start break with SERVER TIMESTAMP
      const { data: newBreak } = await supabase
        .rpc('start_break', {
          p_attendance_record_id: attendanceRecord.id
        })
        .single();

      // Get updated record
      const { data: updatedRecord } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select(`
          *,
          employees:user_id (name, email, employee_id, department),
          attendance_breaks (*)
        `)
        .eq('id', attendanceRecord.id)
        .single();

      return this.convertDbToAttendance(updatedRecord);
    } catch (error) {
      console.error('Error starting break:', error);
      throw error;
    }
  }

  async endBreak(userId: string): Promise<AttendanceRecord> {
    try {
      const todayIso = new Date().toISOString().split('T')[0];

      // Get attendance record
      const { data: attendanceRecord } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select('id')
        .eq('user_id', userId)
        .eq('date', todayIso)
        .single();

      if (!attendanceRecord) throw new Error('No attendance record found for today');

      // Find active break
      const { data: activeBreak } = await supabase
        .from(this.BREAKS_TABLE)
        .select('id')
        .eq('attendance_record_id', attendanceRecord.id)
        .is('end', null)
        .single();

      if (!activeBreak) throw new Error('No active break found');

      // End break with SERVER TIMESTAMP
      const { data: endedBreak } = await supabase
        .rpc('end_break', {
          p_break_id: activeBreak.id
        })
        .single();

      // Calculate duration
      const { data } = await supabase.from(this.BREAKS_TABLE).select('start').eq('id', activeBreak.id).single();
      const startTime = data?.start;
      const duration = (new Date(endedBreak.end).getTime() - new Date(startTime).getTime()) / (1000 * 60);

      await supabase
        .from(this.BREAKS_TABLE)
        .update({ duration: Math.round(duration * 100) / 100 })
        .eq('id', activeBreak.id);

      // Get updated record
      const { data: updatedRecord } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select(`
          *,
          employees:user_id (name, email, employee_id, department),
          attendance_breaks (*)
        `)
        .eq('id', attendanceRecord.id)
        .single();

      return this.convertDbToAttendance(updatedRecord);
    } catch (error) {
      console.error('Error ending break:', error);
      throw error;
    }
  }

  async startLunchBreak(userId: string): Promise<AttendanceRecord> {
    try {
      const todayIso = new Date().toISOString().split('T')[0];

      const { data: attendanceRecord, error: recordError } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select('id, login_time, lunch_start')
        .eq('user_id', userId)
        .eq('date', todayIso)
        .single();

      if (recordError || !attendanceRecord?.login_time) {
        throw new Error('Please clock in first');
      }

      if (attendanceRecord.lunch_start) {
        throw new Error('Lunch break already started');
      }

      await supabase
        .from(this.ATTENDANCE_TABLE)
        .update({ lunch_start: supabase.raw('NOW()') })
        .eq('id', attendanceRecord.id);

      // Get updated record
      const { data: updatedRecord } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select(`
          *,
          employees:user_id (name, email, employee_id, department),
          attendance_breaks (*)
        `)
        .eq('id', attendanceRecord.id)
        .single();

      return this.convertDbToAttendance(updatedRecord);
    } catch (error) {
      console.error('Error starting lunch break:', error);
      throw error;
    }
  }

  async endLunchBreak(userId: string, isLate?: boolean): Promise<AttendanceRecord> {
    try {
      const todayIso = new Date().toISOString().split('T')[0];

      const { data: attendanceRecord, error: recordError } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select('id, lunch_start, lunch_end')
        .eq('user_id', userId)
        .eq('date', todayIso)
        .single();

      if (recordError) throw new Error('No attendance record found for today');
      if (!attendanceRecord.lunch_start) throw new Error('Lunch break not started');
      if (attendanceRecord.lunch_end) throw new Error('Lunch break already ended');

      const updateData: any = {
        lunch_end: supabase.raw('NOW()')
      };

      if (isLate) {
        updateData.is_late_from_lunch = true;
        updateData.lunch_late_reason = 'Late return from lunch break';
      }

      await supabase
        .from(this.ATTENDANCE_TABLE)
        .update(updateData)
        .eq('id', attendanceRecord.id);

      // Get updated record
      const { data: updatedRecord } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select(`
          *,
          employees:user_id (name, email, employee_id, department),
          attendance_breaks (*)
        `)
        .eq('id', attendanceRecord.id)
        .single();

      return this.convertDbToAttendance(updatedRecord);
    } catch (error) {
      console.error('Error ending lunch break:', error);
      throw error;
    }
  }

  isLunchTime(): boolean {
    const now = getOfficeNow();
    const lunchStart = getLunchStartTime(now);
    const lunchEnd = getLunchEndTime(now);

    return now.getTime() >= lunchStart.getTime() && now.getTime() <= lunchEnd.getTime();
  }

  isLateFromLunch(): boolean {
    const now = getOfficeNow();
    const lunchEnd = getLunchEndTime(now);

    return now.getTime() > lunchEnd.getTime();
  }

  hasCompletedMinimumHours(clockInTime: Date, clockOutTime: Date): boolean {
    const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
    return hoursWorked >= WORKING_HOURS.STANDARD_WORK_HOURS;
  }

  isEarlyDeparture(clockOutTime: Date): boolean {
    const workEnd = getWorkEndTime(clockOutTime);
    return clockOutTime.getTime() < workEnd.getTime();
  }
}

export const globalAttendanceService = new GlobalAttendanceService();
