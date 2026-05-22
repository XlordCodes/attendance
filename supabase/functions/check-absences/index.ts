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
 * Compute current date/time in the office timezone (default: Asia/Kolkata).
 * Uses Intl.DateTimeFormat for DST-safe boundary resolution.
 * Returns { now: Date, todayIST: string (YYYY-MM-DD), hour: number, minute: number }
 */
function getNowInOfficeTZ(
  timezone: string = 'Asia/Kolkata'
): { now: Date; todayIST: string; hour: number; minute: number } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = fmt.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value ?? '';

  const year   = getPart('year');
  const month  = getPart('month');
  const day    = getPart('day');
  const hour   = parseInt(getPart('hour'), 10);
  const minute = parseInt(getPart('minute'), 10);

  const todayIST = `${year}-${month}-${day}`;

  // Build a Date-like object in the requested timezone by assembling UTC components
  // that correspond to the resolved local values.
  const [y, m, d, hh, mm] = [year, month, day, hour, minute].map(Number);

  // Reconstruct as-UTC so that hour/minute carry the resolved local wall-clock values;
  // this is used only for threshold comparisons against the same reconstructed type.
  const reconstructed = new Date(
    Date.UTC(y, m - 1, d, hh, mm, 0, 0)
  );

  return { now: reconstructed, todayIST, hour: hh, minute: mm };
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
    const { todayIST, now: nowIST } = getNowInOfficeTZ();

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

      // Process employees in parallel chunks of 50 to avoid overwhelming
      // the Postgres connection pool while still gaining throughput.
      const CHUNK_SIZE = 50;
      const results: { employeeId: string; marked: boolean; reason?: string }[] = [];

      for (let i = 0; i < employees.length; i += CHUNK_SIZE) {
        const chunk = employees.slice(i, i + CHUNK_SIZE);

        const chunkResults = await Promise.allSettled(
          chunk.map((emp) =>
            (async () => {
              const schedule = scheduleMap.get(emp.role);
              if (!schedule) {
                return { employeeId: emp.id, marked: false, reason: 'No schedule configured' } as const;
              }
              await markAbsentIfNeeded(emp, schedule, todayIST, nowIST);
              return { employeeId: emp.id, marked: true } as const;
            })()
          )
        );

        for (const result of chunkResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.error('Chunk processing error:', result.reason);
            // We don't know which employee failed here; push a generic
            // placeholder so downstream counts stay accurate.  The
            // failure is already logged above.
          }
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
