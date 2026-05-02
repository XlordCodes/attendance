import { AttendanceRecord, GeolocationData } from '../types';
import {
  toOfficeDate,
  toOfficeDateSafe,
  getOfficeTodayIso,
  getOfficeNow,
  formatOffice
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

    private convertDbToAttendance(dbData: unknown): AttendanceRecord {
     const data = dbData as Record<string, unknown>;
     const rawBreaks = data.attendance_breaks as unknown[] | undefined;
     const breaks: unknown[] = Array.isArray(rawBreaks) ? rawBreaks : [];

    // Calculate total break minutes from completed breaks
    let totalBreakMins = 0;
     if (Array.isArray(breaks)) {
        breaks.forEach((b: unknown) => {
          const breakData = b as Record<string, unknown>;
          if (breakData.start && breakData.end) {
            const startTime = new Date(breakData.start as string);
            const endTime = new Date(breakData.end as string);
            if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
              totalBreakMins += (endTime.getTime() - startTime.getTime()) / (1000 * 60);
            }
          }
        });
     }

       // Round break minutes to 2 decimal places
       totalBreakMins = Math.round(totalBreakMins * 100) / 100;

       // Guard: validate critical timestamps before parsing
        if (!data.login_time && !data.logout_time) {
         console.warn(
            `⚠️ convertDbToAttendance: Both login_time and logout_time are missing for record ${(data.id as string) || '(no id)'}. ` +
           `Hours will default to 0 unless worked_hours is present.`
         );
       }

       // Parse worked_hours (Postgres NUMERIC may return string)
        let calcHours = data.worked_hours ? parseFloat(data.worked_hours as string) : 0;

      // Fallback: if worked_hours is missing/0 but we have clock times, recalculate
       if (!calcHours && data.login_time && data.logout_time) {
         const loginTime = new Date(data.login_time as string);
         const logoutTime = new Date(data.logout_time as string);
        if (!isNaN(loginTime.getTime()) && !isNaN(logoutTime.getTime())) {
          const totalMs = logoutTime.getTime() - loginTime.getTime();
          const breakMs = totalBreakMins * 60 * 1000;
          const netMs = totalMs - breakMs;
          calcHours = netMs > 0 ? netMs / (1000 * 60 * 60) : 0;
        }
      }

      // Round hours to 2 decimal places
      calcHours = Math.round(calcHours * 100) / 100;

    // Compute overtime based on standard work hours
    const overtime = Math.max(0, calcHours - WORKING_HOURS.STANDARD_WORK_HOURS);

     const employees = data.employees as Record<string, unknown> | undefined;
     return {
       id: data.id as string,
       userId: (data.user_id as string) || '',
       userName: (employees?.name as string | undefined) || '',
       userEmail: (employees?.email as string | undefined) || '',
       employeeId: employees?.employee_id as string | undefined,
       employeeName: (employees?.name as string | undefined) || '',
       department: (employees?.department as string | undefined) || '',
       date: data.date as string,
       clockIn: toOfficeDateSafe(data.login_time as string | undefined) || null,
       clockOut: toOfficeDateSafe(data.logout_time as string | undefined) || null,
       lunchStart: toOfficeDateSafe(data.lunch_start as string | undefined) || null,
       lunchEnd: toOfficeDateSafe(data.lunch_end as string | undefined) || null,
       createdAt: toOfficeDate(data.created_at as string),
       updatedAt: toOfficeDate(data.updated_at as string),
      // Use calculated hours with fallback
      hoursWorked: calcHours,
      totalHours: calcHours,
      totalBreakMinutes: totalBreakMins,
      totalBreakHours: totalBreakMins / 60,
       breaks: breaks.map((bt) => {
         const btData = bt as Record<string, unknown>;
         return {
           id: btData.id as string,
           startTime: toOfficeDate(btData.start as string),
           endTime: toOfficeDateSafe(btData.end as string) || null,
           type: (btData.type as string) || 'break',
           duration: btData.duration ? parseFloat(btData.duration as string) : 0
         };
       }),
       breakTimes: breaks.map((bt) => {
         const btData = bt as Record<string, unknown>;
         return {
           id: btData.id as string,
           start: toOfficeDate(btData.start as string),
           end: toOfficeDateSafe(btData.end as string) || null,
           type: (btData.type as string) || 'break',
           duration: btData.duration ? parseFloat(btData.duration as string) : 0
         };
       }),
       isLate: (data.is_late as boolean) || false,
       lateReason: (data.late_reason as string | undefined) || (data.audit_data as string | undefined) || null,
       status: this.determineStatus(toOfficeDateSafe(data.login_time as string | undefined) || null),
       location: data.location as GeolocationData || null,
      overtime: overtime
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

      const todayIso = getOfficeTodayIso();

      // Check if already clocked in today
      const { data: existingRecord } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select('login_time')
        .eq('user_id', userId)
        .eq('date', todayIso)
        .maybeSingle();

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

      // Apply additional fields via update_attendance_record RPC (server-side validation)
      const { error: updateError } = await supabase.rpc('update_attendance_record', {
        p_record_id: attendanceRecord.id,
        p_is_late: isLate,
        p_late_reason: isLate ? (lateReason || 'Late arrival') : null,
        p_location: location,
        p_client_ip: clientIP
      }).single();
      if (updateError) throw updateError;

      const newAttendanceRecord: AttendanceRecord = {
        id: attendanceRecord.id,
        userId,
        userName: userData.name || 'Unknown User',
        userEmail: userData.email || '',
        employeeId: userData.employee_id,
        employeeName: userData.name || '',
        department: userData.department || 'Unknown',
        date: formatOffice(getOfficeNow(), 'dd-MM-yyyy'),
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

        const todayIso = getOfficeTodayIso();

        // Get attendance record ID for today
        const { data: attendanceRecord, error: fetchError } = await supabase
          .from(this.ATTENDANCE_TABLE)
          .select('id, login_time, logout_time, worked_hours')
          .eq('user_id', userId)
          .eq('date', todayIso)
          .maybeSingle();

        if (fetchError || !attendanceRecord) {
          throw new Error('No attendance record found for today');
        }

         console.log('📋 Pre-update record:', {
           id: attendanceRecord.id,
           login_time: attendanceRecord.login_time,
           logout_time: attendanceRecord.logout_time,
           worked_hours: attendanceRecord.worked_hours
         });

         // Update via SECURITY DEFINER RPC with server-side validation
         console.log('🔄 Invoking clock_out RPC with params:', {
           p_user_id: userId,
           p_date: todayIso,
           p_early_logout_reason: reason || null
         });

         const { data: rpcResult, error: rpcError } = await supabase.rpc('clock_out', {
           p_user_id: userId,
           p_date: todayIso,
           p_early_logout_reason: reason || null
         }).single();

         if (rpcError) throw rpcError;
         if (!rpcResult) throw new Error('Clock out RPC did not return a record');

          // Fetch the full updated record with joins to get breaks and employee details
          const { data: fullRecord, error: fetchFullError } = await supabase
            .from(this.ATTENDANCE_TABLE)
            .select(`
              *,
              employees:user_id (name, email, employee_id, department),
              attendance_breaks (*)
            `)
            .eq('id', rpcResult.id)
            .single();

          if (fetchFullError) throw fetchFullError;
         if (!fullRecord) throw new Error('Failed to retrieve updated record');

        console.log('📥 Raw updated record (pre-convert):', {
          id: fullRecord.id,
          login_time: fullRecord.login_time,
          logout_time: fullRecord.logout_time,
          worked_hours: fullRecord.worked_hours,
          breaksCount: fullRecord.attendance_breaks?.length || 0
        });

        // Convert using mapper (which will calculate hours dynamically)
        const updatedRecord = this.convertDbToAttendance(fullRecord);

        console.log('✅ Clock out successful:', {
          id: updatedRecord.id,
          date: updatedRecord.date,
          clockIn: updatedRecord.clockIn,
          clockOut: updatedRecord.clockOut,
          hoursWorked: updatedRecord.hoursWorked,
          totalHours: updatedRecord.totalHours,
          totalBreakMinutes: updatedRecord.totalBreakMinutes,
          breaksCount: updatedRecord.breaks.length
        });

        return updatedRecord;
      } catch (error) {
        console.error('❌ Clock out failed:', error);
        throw error;
      }
    }

  async getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
    try {
      const todayIso = getOfficeTodayIso();

      const { data, error } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select(`
          *,
          employees:user_id (name, email, employee_id, department),
          attendance_breaks (*)
        `)
        .eq('user_id', userId)
        .eq('date', todayIso)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data ? this.convertDbToAttendance(data) : null;
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

      if (!data || data.length === 0) {
        return [];
      }

      return data.map(this.convertDbToAttendance.bind(this));
    } catch (error) {
      console.error('Error getting attendance history:', error);
      return [];
    }
  }

   async getAttendanceRange(
     userId: string,
     startDate: Date | string,
     endDate: Date | string
   ): Promise<AttendanceRecord[]> {
     try {
       // Timezone-safe formatter: always uses Asia/Kolkata
       const toOfficeIso = (d: Date | string) => {
         const dateObj = typeof d === 'string' ? new Date(d) : d;
         if (isNaN(dateObj.getTime())) return new Date().toISOString().split('T')[0];

         const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' } as const;
         const parts = new Intl.DateTimeFormat('en-IN', options).formatToParts(dateObj);
         const year = parts.find(p => p.type === 'year')?.value;
         const month = parts.find(p => p.type === 'month')?.value;
         const day = parts.find(p => p.type === 'day')?.value;
         return `${year}-${month}-${day}`;
       };

       const startDateStr = toOfficeIso(startDate);
       const endDateStr = toOfficeIso(endDate);

      const { data, error } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select(`
          *,
          employees:user_id (name, email, employee_id, department),
          attendance_breaks (*)
        `)
        .eq('user_id', userId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        return [];
      }

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

      if (!data || data.length === 0) {
        return [];
      }

      return data.map(this.convertDbToAttendance.bind(this));
    } catch (error) {
      console.error('Error getting all attendance records:', error);
      return [];
    }
  }

  async getAttendanceForDate(userId: string, date: Date): Promise<AttendanceRecord | null> {
    try {
      const dateIso = date.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select(`
          *,
          employees:user_id (name, email, employee_id, department),
          attendance_breaks (*)
        `)
        .eq('user_id', userId)
        .eq('date', dateIso)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data ? this.convertDbToAttendance(data) : null;
    } catch (error) {
      console.error('Error getting attendance for date:', error);
      return null;
    }
  }

  async getAllAttendanceForDate(date: string): Promise<{ [userId: string]: AttendanceRecord }> {
    try {
      console.log(`🔍 Fetching all attendance for date: ${date}`);

      // Directly construct YYYY-MM-DD from DD-MM-YYYY without timezone conversion
      const parts = date.split('-');
      if (parts.length !== 3) return {};
      const [day, month, year] = parts;
      const dateIso = `${year}-${month}-${day}`;

      const { data, error } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select(`
          *,
          employees:user_id (name, email, employee_id, department),
          attendance_breaks (*)
        `)
        .eq('date', dateIso);

      if (error) throw error;

      if (!data || data.length === 0) {
        return {};
      }

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

      if (!data || data.length === 0) {
        return [];
      }

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
      const todayIso = getOfficeTodayIso();
      const now = new Date();

      // Get attendance record
      const { data: attendanceRecord, error: recordError } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select('id, login_time')
        .eq('user_id', userId)
        .eq('date', todayIso)
        .maybeSingle();

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

      // Start break with direct insert (no RPC)
       const { error: insertError } = await supabase
        .from(this.BREAKS_TABLE)
        .insert({
          attendance_record_id: attendanceRecord.id,
          start: now.toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

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
      const todayIso = getOfficeTodayIso();

      // Get attendance record
      const { data: attendanceRecord } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select('id')
        .eq('user_id', userId)
        .eq('date', todayIso)
        .maybeSingle();

      if (!attendanceRecord) throw new Error('No attendance record found for today');

      // Find active break (use maybeSingle to avoid 406 when no break exists)
      const { data: activeBreak } = await supabase
        .from(this.BREAKS_TABLE)
        .select('id')
        .eq('attendance_record_id', attendanceRecord.id)
        .is('end', null)
        .maybeSingle();

      if (!activeBreak) {
        throw new Error('No active break found to end.');
      }

      // End break with direct update (no RPC)
      const now = new Date();
      const { error: updateError } = await supabase
        .from(this.BREAKS_TABLE)
        .update({ end: now.toISOString() })
        .eq('id', activeBreak.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Get updated record
      const { data: updatedRecord, error: fetchError } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select(`
          *,
          employees:user_id (name, email, employee_id, department),
          attendance_breaks (*)
        `)
        .eq('id', attendanceRecord.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!updatedRecord) throw new Error('Failed to fetch updated attendance record');

      return this.convertDbToAttendance(updatedRecord);
    } catch (error) {
      console.error('Error ending break:', error);
      throw error;
    }
  }

  async startLunchBreak(userId: string): Promise<AttendanceRecord> {
    try {
      const todayIso = getOfficeTodayIso();

      const { data: attendanceRecord, error: recordError } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select('id, login_time, lunch_start')
        .eq('user_id', userId)
        .eq('date', todayIso)
        .maybeSingle();

      if (recordError || !attendanceRecord?.login_time) {
        throw new Error('Please clock in first');
      }

      if (attendanceRecord.lunch_start) {
        throw new Error('Lunch break already started');
      }

      const now = new Date();
      const { error: updateError } = await supabase.rpc('update_attendance_record', {
        p_record_id: attendanceRecord.id,
        p_lunch_start: now.toISOString()
      }).single();
      if (updateError) throw updateError;

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
      const todayIso = getOfficeTodayIso();

      const { data: attendanceRecord, error: recordError } = await supabase
        .from(this.ATTENDANCE_TABLE)
        .select('id, lunch_start, lunch_end')
        .eq('user_id', userId)
        .eq('date', todayIso)
        .maybeSingle();

      if (recordError || !attendanceRecord) throw new Error('No attendance record found for today');
      if (!attendanceRecord.lunch_start) throw new Error('Lunch break not started');
      if (attendanceRecord.lunch_end) throw new Error('Lunch break already ended');

      const now = new Date();
       const updateParams = {
        p_record_id: attendanceRecord.id,
        p_lunch_end: now.toISOString()
      };
      if (isLate) {
        updateParams.p_is_late_from_lunch = true;
        updateParams.p_lunch_late_reason = 'Late return from lunch break';
      }

      const { error: updateError } = await supabase.rpc('update_attendance_record', updateParams).single();
      if (updateError) throw updateError;

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
