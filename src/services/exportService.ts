/**
 * CSV Export Service
 * Generates and downloads monthly attendance reports in CSV format.
 */

export interface DailyLogCSV {
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  workedHours?: number;
  isLate: boolean;
  lateReason?: string | null;
}

export interface MonthlyReportAggregates {
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  rawTotalHours: number;
  lateCount: number;
  penaltyDeduction: number;
  finalPayableHours: number;
  dailyLog: DailyLogCSV[];
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatField(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    // Avoid unnecessary decimals
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return escapeCsvField(String(value));
}

/**
 * Generate and trigger download of a monthly attendance CSV.
 *
 * @param data - Aggregated monthly report data.
 * @param employeeName - Display name of the employee (for the file name).
 */
export function downloadMonthlyReportCSV(
  data: MonthlyReportAggregates,
  employeeName: string,
  month: string
): void {
  const { rawTotalHours, lateCount, penaltyDeduction, finalPayableHours, dailyLog } = data;

  const lines: string[][] = [];

  // ── Summary Header ──────────────────────────────────────────────────────
  lines.push([
    '#', 'Metric', 'Value',
  ]);

  const row = (label: string, value: string | number | null | undefined) =>
    lines.push(['', formatField(label), formatField(value as number | null | undefined)]);

  row('Report For', '');

  const headerInfo: (string | number | null)[][] = [
    ['', 'Employee Name', employeeName],
    ['', 'Month', month],
    ['', 'Raw Total Hours', rawTotalHours],
    ['', 'Late Days', lateCount],
    ['', 'Penalty Deduction (hrs)', penaltyDeduction],
    ['', 'Final Payable Hours', finalPayableHours],
  ];

  headerInfo.forEach(([a, b, c]) => lines.push([
    String(a ?? ''),
    String(b ?? ''),
    formatField(c as number | null | undefined),
  ]));

  lines.push(['']); // spacer
  lines.push(['']);

  // ── Daily Log ──────────────────────────────────────────────────────────
  lines.push([
    '#', 'Date', 'Clock In', 'Clock Out',
    'Hours Worked', 'Late?', 'Late Reason',
  ]);

  dailyLog.forEach((day, idx) => {
    lines.push([
      String(idx + 1),
      day.date,
      day.clockIn ?? '',
      day.clockOut ?? '',
      day.workedHours != null ? day.workedHours.toFixed(2) : '',
      day.isLate ? 'Yes' : 'No',
      day.lateReason ?? '',
    ]);
  });

  // ── Serialise ──────────────────────────────────────────────────────────
  const csvBody = lines
    .map(row => row.map(field => escapeCsvField(field)).join(','))
    .join('\r\n');

  const BOM = '\uFEFF'; // UTF-8 BOM so Excel opens it cleanly
  const blob = new Blob([BOM + csvBody], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  // ── Filename: Attendance_Report_[Name]_[Month].csv ─────────────────────
  const safeName = employeeName
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .replace(/\s+/g, '_');
  const filename = `Attendance_Report_${safeName}_${month}.csv`;

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
