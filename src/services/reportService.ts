import { supabase } from './supabaseClient';
import { configService } from './configService';
import { DEFAULT_ROLE_SCHEDULE } from '../constants/workingHours';
import type { DailyLogCSV, MonthlyReportAggregates } from './exportService';

export interface MonthlyReport {
  employeeId: string;
  month: number;
  year: number;
  rawTotalHours: number;
  lateCount: number;
  penaltyDeduction: number;
  finalPayableHours: number;
}

/**
 * Fetch attendance summary records for an employee in a given month/year.
 * Returns worked_hours and is_late for aggregate calculation.
 * login_time / logout_time are included for fallback recalculation
 * when the DB-stored worked_hours = 0 (upstream clock_out RPC bug).
 */
async function getAttendanceForMonth(
  userId: string,
  month: number,
  year: number
): Promise<Array<{ worked_hours: number | null; is_late: boolean; login_time: string | null; logout_time: string | null }>> {
  // month: 1-12
  const monthStr = String(month).padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate(); // month is 1-based here safely
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('attendance_records')
    .select('worked_hours, is_late, login_time, logout_time')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    console.error('Error fetching attendance for report:', error);
    return [];
  }

  return (data || []) as Array<{ worked_hours: number | null; is_late: boolean; login_time: string | null; logout_time: string | null }>;
}

/**
 * Fetch full daily attendance records for an employee in a given month/year.
 * Returns date-level detail needed for CSV daily log.
 */
export async function getDailyAttendanceForMonth(
  userId: string,
  month: number,
  year: number
): Promise<DailyLogCSV[]> {
  const monthStr = String(month).padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('attendance_records')
    .select('date, login_time, logout_time, worked_hours, is_late, late_reason')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching daily attendance for report:', error);
    return [];
  }

  return (data || []).map((record: Record<string, unknown>): DailyLogCSV => ({
    date: record.date as string,
    clockIn: record.login_time ? new Date(record.login_time as string).toISOString() : null,
    clockOut: record.logout_time ? new Date(record.logout_time as string).toISOString() : null,
    workedHours: (record.worked_hours as number | null) ?? undefined,
    isLate: Boolean(record.is_late),
    lateReason: (record.late_reason as string | null) || null,
  }));
}

/**
 * Generate monthly attendance report with penalty calculation.
 * Business rule: For every 3 late arrivals, deduct half day's standard work hours.
 */
export async function getIndividualMonthlyReport(
  employeeId: string,
  month: number,
  year: number
): Promise<MonthlyReport> {
  // 1. Fetch employee role
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('role')
    .eq('id', employeeId)
    .single();

  if (empError || !employee) {
    throw new Error('Employee not found');
  }

  const role = (employee as { role: string }).role || 'employee';

  // 2. Get schedule for that role
  let schedule = await configService.getScheduleByRole(role);
  if (!schedule) {
    schedule = { ...DEFAULT_ROLE_SCHEDULE, role };
  }

  // 3. Fetch attendance records for the month
  const records = await getAttendanceForMonth(employeeId, month, year);

  console.log("RAW REPORT: ", records);
  // 4. Calculate totals
  let rawTotalHours = 0;
  let lateCount = 0;

  for (const rec of records) {
    // Prefer the DB-stored value when it is non-null and non-zero;
    // fall back to clock-time diff when the upstream RPC stored 0 (known bug)
    const rawVal = rec.worked_hours;
    const storedHours = (rawVal != null && rawVal !== 0) ? Number(rawVal) : undefined;
    let hours: number;
    if (storedHours !== undefined && !Number.isNaN(storedHours)) {
      hours = storedHours;
    } else if (rec.login_time && rec.logout_time) {
      const ms = new Date(rec.logout_time).getTime() - new Date(rec.login_time).getTime();
      hours = ms > 0 ? ms / (1000 * 60 * 60) : 0;
    } else {
      hours = 0;
    }

    rawTotalHours += hours;
    if (rec.is_late) lateCount++;
  }

  rawTotalHours = Math.round(rawTotalHours * 100) / 100;

  // 5. Penalty
  const penaltyUnits = Math.floor(lateCount / 3);
  const halfDayHours = schedule.standard_work_hours / 2;
  const penaltyDeduction = Math.round(penaltyUnits * halfDayHours * 100) / 100;

  // 6. Final payable
  const finalPayableHours = Math.round((rawTotalHours - penaltyDeduction) * 100) / 100;

  return {
    employeeId,
    month,
    year,
    rawTotalHours,
    lateCount,
    penaltyDeduction,
    finalPayableHours,
  };
}

/**
 * High-level helper: fetch MonthlyReport + daily breakdown in one call.
 * Suitable for CSV export and drill-down display alike.
 */
export async function buildMonthlyReportAggregates(
  employeeId: string,
  month: number,
  year: number
): Promise<MonthlyReportAggregates> {
  const [monthly, dailyLog] = await Promise.all([
    getIndividualMonthlyReport(employeeId, month, year),
    getDailyAttendanceForMonth(employeeId, month, year),
  ]);

  // Resolve employee name
  let employeeName = employeeId;
  try {
    const { data: emp } = await supabase
      .from('employees')
      .select('name')
      .eq('id', employeeId)
      .single();
    if (emp?.name) employeeName = emp.name;
  } catch {
    /* name lookup best-effort */
  }

  return {
    ...monthly,
    employeeName,
    dailyLog,
  };
}
