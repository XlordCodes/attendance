/**
 * Supabase Edge Function: Check Absences
 *
 * Runs on a schedule (e.g., every 30 minutes) to:
 *  - Identify active employees who have not clocked in within 30 minutes after their shift start.
 *  - Insert an implicit absent attendance record for today.
 *  - Insert a notification targeted to their role (or specific recipient).
 *
 * Configuration: Expects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  autoRefreshToken: false,
  persistSession: false
});

interface EmployeeMinimal {
  id: string;
  name: string;
  role: string;
}

interface RoleSchedule {
  role: string;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  standard_work_hours: number;
  lunch_start_hour: number;
  lunch_start_minute: number;
  lunch_end_hour: number;
  lunch_end_minute: number;
  overtime_threshold: number;
}

/**
 * Compute current date/time in Asia/Kolkata timezone (UTC+5:30).
 * Returns { now: Date, todayIST: string (YYYY-MM-DD), hour: number, minute: number }
 */
function getNowInIST(): { now: Date; todayIST: string; hour: number; minute: number } {
  const now = new Date();

  // Asia/Kolkata offset = +05:30 (5 hours 30 minutes)
  const offsetMs = 5.5 * 60 * 60 * 1000;
  const istMs = now.getTime() + offsetMs;
  const istDate = new Date(istMs);

  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  const hour = istDate.getHours();
  const minute = istDate.getMinutes();

  const todayIST = `${year}-${month}-${day}`;

  return { now: istDate, todayIST, hour, minute };
}

/**
 * Determine if an employee is absent (no attendance record) as of threshold (shift_start + 30 min).
 */
async function markAbsentIfNeeded(
  employee: EmployeeMinimal,
  schedule: RoleSchedule,
  todayIST: string,
  nowIST: Date
): Promise<void> {
  // Build shift start datetime for today from schedule
  const shiftStart = new Date(
    nowIST.getFullYear(),
    nowIST.getMonth(),
    nowIST.getDate(),
    schedule.start_hour,
    schedule.start_minute,
    0
  );

  const thresholdMs = shiftStart.getTime() + 30 * 60 * 1000; // +30 minutes

  // Only check if current IST time is past threshold
  if (nowIST.getTime() < thresholdMs) {
    return; // Not yet absent
  }

  // Check if any attendance record exists for today
  const { data: existing } = await supabase
    .from('attendance_records')
    .select('id')
    .eq('user_id', employee.id)
    .eq('date', todayIST)
    .maybeSingle();

  if (existing) {
    return; // Already has a record (present, late, etc.)
  }

   // Insert absent placeholder record
   await supabase.from('attendance_records').insert({
     user_id: employee.id,
     date: todayIST,
     created_at: new Date().toISOString(),
     updated_at: new Date().toISOString()
     // All other fields remain NULL/zero
   }).catch((err) => {
     if (err.code === '23505') {
       // Duplicate key – already inserted by a prior run; safe to ignore.
       return;
     }
     console.error('Failed to insert absent record for', employee.id, err);
     throw err;
   });

  await supabase.from('notifications').insert({
    triggered_by: null, // system-generated
    target_role: employee.role,
    type: 'absence_alert',
    message: `${employee.name} is absent today (${todayIST})`
  }).catch((err) => {
    // Non-fatal – log and continue
    console.error('Failed to insert notification for', employee.id, err);
  });
}

/**
 * Main handler
  */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export default async (_req: Request): Promise<Response> => {
  try {
    const { todayIST, now: nowIST } = getNowInIST();

     // Fetch all active employees
     const { data: employees, error: empErr } = await supabase
       .from('employees')
       .select<EmployeeMinimal>('id, name, role')
       .eq('is_active', true);

     if (empErr) {
       console.error('Failed to fetch employees:', empErr);
       return new Response(JSON.stringify({ error: 'Failed to fetch employees' }), { status: 500 });
     }

     if (!employees || employees.length === 0) {
       return new Response(JSON.stringify({ message: 'No active employees found' }), { status: 200 });
     }

     // Gather distinct roles
     const roles = Array.from(new Set(employees.map((e) => e.role)));

     // Fetch schedules for all roles in one query
     const { data: scheduleRows, error: schErr } = await supabase
       .from('role_schedules')
       .select<RoleSchedule>('*')
       .in('role', roles);

    if (schErr) {
      console.error('Failed to fetch schedules:', schErr);
      return new Response(JSON.stringify({ error: 'Failed to fetch schedules' }), { status: 500 });
    }

     // Build role -> schedule map
     const scheduleMap = new Map<string, RoleSchedule>();
     for (const row of scheduleRows || []) {
       scheduleMap.set(row.role, row);
     }

     // Process each employee sequentially (small set; could parallelize with Promise.all)
     const results: { employeeId: string; marked: boolean; reason?: string }[] = [];
     for (const emp of employees) {
       const schedule = scheduleMap.get(emp.role);
       if (!schedule) {
         results.push({ employeeId: emp.id, marked: false, reason: 'No schedule configured' });
         continue;
       }

       try {
         await markAbsentIfNeeded(emp, schedule, todayIST, nowIST);
         results.push({ employeeId: emp.id, marked: true });
       } catch (e) {
         results.push({ employeeId: emp.id, marked: false, reason: (e as Error).message });
       }
     }

    const markedCount = results.filter(r => r.marked).length;

    return new Response(
      JSON.stringify({
        message: 'Absence check completed',
        date: todayIST,
        processed: employees.length,
        markedAbsent: markedCount,
        results
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unexpected error in check-absences:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
