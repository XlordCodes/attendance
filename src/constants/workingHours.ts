import { createOfficeTime } from '../utils/timezoneUtils';
import { configService, type WorkingHoursDBConfig } from '../services/configService';

// ----------------------------------------------------------------------------
// Types & Defaults
// ----------------------------------------------------------------------------
export interface WorkingHoursConfig {
  START_HOUR: number;
  START_MINUTE: number;
  END_HOUR: number;
  END_MINUTE: number;
  STANDARD_WORK_HOURS: number;
  LUNCH_START_HOUR: number;
  LUNCH_START_MINUTE: number;
  LUNCH_END_HOUR: number;
  LUNCH_END_MINUTE: number;
  OVERTIME_THRESHOLD: number;
  REQUIRE_IP_MATCH: boolean;
  REQUIRE_GEO_MATCH: boolean;
}

const DEFAULT_CONFIG: WorkingHoursConfig = {
  START_HOUR: 10,
  START_MINUTE: 0,
  END_HOUR: 20,
  END_MINUTE: 0,
  STANDARD_WORK_HOURS: 10,
  LUNCH_START_HOUR: 14,
  LUNCH_START_MINUTE: 0,
  LUNCH_END_HOUR: 15,
  LUNCH_END_MINUTE: 0,
  OVERTIME_THRESHOLD: 10,
  REQUIRE_IP_MATCH: true,
  REQUIRE_GEO_MATCH: true,
};

// Mutable reference that is exported. All getter functions read from this object.
const currentConfig: WorkingHoursConfig = { ...DEFAULT_CONFIG };

// Export both the mutable object and individual helpers
export const WORKING_HOURS = currentConfig;

// ----------------------------------------------------------------------------
// Database Loading & Updates
// ----------------------------------------------------------------------------

/**
 * Load the working hours configuration from the database.
 * This overwrites the in-memory config with persisted values.
 * Call once at application startup to ensure correct values.
 * If no config is available (e.g., unauthenticated), silently fall back to defaults.
 */
export async function loadWorkingHoursFromDB(): Promise<void> {
  const db: WorkingHoursDBConfig | null = await configService.getWorkingHoursConfig();

  if (!db) {
    // No configuration returned (could be unauthenticated, or row missing). Use defaults silently.
    return;
  }

  currentConfig.START_HOUR = db.start_hour;
  currentConfig.START_MINUTE = db.start_minute;
  currentConfig.END_HOUR = db.end_hour;
  currentConfig.END_MINUTE = db.end_minute;
  currentConfig.STANDARD_WORK_HOURS = db.standard_work_hours;
  currentConfig.LUNCH_START_HOUR = db.lunch_start_hour;
  currentConfig.LUNCH_START_MINUTE = db.lunch_start_minute;
  currentConfig.LUNCH_END_HOUR = db.lunch_end_hour;
  currentConfig.LUNCH_END_MINUTE = db.lunch_end_minute;
  currentConfig.OVERTIME_THRESHOLD = db.overtime_threshold;
  currentConfig.REQUIRE_IP_MATCH = db.require_ip_match;
  currentConfig.REQUIRE_GEO_MATCH = db.require_geo_match;
  if (import.meta.env.DEV) {
    console.log('✅ Working hours configuration loaded from database');
  }
}

/**
 * Update the working hours configuration. Only admins can call this.
 * The new values are persisted to the database and then re-loaded into memory.
 */
export async function updateWorkingHours(updates: Partial<WorkingHoursConfig>): Promise<void> {
  // Map camelCase UPPERCASE keys to snake_case DB columns
  const dbUpdates: Partial<WorkingHoursDBConfig> = {};

  if (updates.START_HOUR !== undefined) dbUpdates.start_hour = updates.START_HOUR;
  if (updates.START_MINUTE !== undefined) dbUpdates.start_minute = updates.START_MINUTE;
  if (updates.END_HOUR !== undefined) dbUpdates.end_hour = updates.END_HOUR;
  if (updates.END_MINUTE !== undefined) dbUpdates.end_minute = updates.END_MINUTE;
  if (updates.STANDARD_WORK_HOURS !== undefined) dbUpdates.standard_work_hours = updates.STANDARD_WORK_HOURS;
  if (updates.LUNCH_START_HOUR !== undefined) dbUpdates.lunch_start_hour = updates.LUNCH_START_HOUR;
  if (updates.LUNCH_START_MINUTE !== undefined) dbUpdates.lunch_start_minute = updates.LUNCH_START_MINUTE;
  if (updates.LUNCH_END_HOUR !== undefined) dbUpdates.lunch_end_hour = updates.LUNCH_END_HOUR;
  if (updates.LUNCH_END_MINUTE !== undefined) dbUpdates.lunch_end_minute = updates.LUNCH_END_MINUTE;
  if (updates.OVERTIME_THRESHOLD !== undefined) dbUpdates.overtime_threshold = updates.OVERTIME_THRESHOLD;
  if (updates.REQUIRE_IP_MATCH !== undefined) dbUpdates.require_ip_match = updates.REQUIRE_IP_MATCH;
  if (updates.REQUIRE_GEO_MATCH !== undefined) dbUpdates.require_geo_match = updates.REQUIRE_GEO_MATCH;

  await configService.updateWorkingHoursConfig(dbUpdates);
  // Refresh local config from DB to ensure consistency
  await loadWorkingHoursFromDB();
}

// ----------------------------------------------------------------------------
// Helper Functions (unchanged API, now use mutable currentConfig)
// ----------------------------------------------------------------------------

export const getWorkStartTime = (date: Date): Date => {
  return createOfficeTime(date, currentConfig.START_HOUR, currentConfig.START_MINUTE);
};

export const getWorkEndTime = (date: Date): Date => {
  return createOfficeTime(date, currentConfig.END_HOUR, currentConfig.END_MINUTE);
};

export const getLunchStartTime = (date: Date): Date => {
  return createOfficeTime(date, currentConfig.LUNCH_START_HOUR, currentConfig.LUNCH_START_MINUTE);
};

export const getLunchEndTime = (date: Date): Date => {
  return createOfficeTime(date, currentConfig.LUNCH_END_HOUR, currentConfig.LUNCH_END_MINUTE);
};

export const isLateArrival = (clockInTime: Date): boolean => {
  const workStart = getWorkStartTime(clockInTime);
  return clockInTime.getTime() > workStart.getTime();
};

export const isEarlyDeparture = (clockOutTime: Date): boolean => {
  const workEnd = getWorkEndTime(clockOutTime);
  return clockOutTime.getTime() < workEnd.getTime();
};

export const calculateOvertime = (workedHours: number): number => {
  return Math.max(0, workedHours - currentConfig.OVERTIME_THRESHOLD);
};

export const calculateLateMinutes = (clockInTime: Date): number => {
  const workStart = getWorkStartTime(clockInTime);
  if (clockInTime.getTime() <= workStart.getTime()) return 0;
  return Math.floor((clockInTime.getTime() - workStart.getTime()) / (1000 * 60));
};

export const formatWorkingHours = (): string => {
  const { START_HOUR, START_MINUTE, END_HOUR, END_MINUTE } = currentConfig;

  const format = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return `${format(START_HOUR, START_MINUTE)} - ${format(END_HOUR, END_MINUTE)}`;
};
