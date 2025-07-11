// Working Hours Configuration
export const WORKING_HOURS = {
  START_HOUR: 10,          // 10:00 AM
  START_MINUTE: 0,
  END_HOUR: 20,            // 8:00 PM (20:00 in 24-hour format)
  END_MINUTE: 0,
  STANDARD_WORK_HOURS: 10, // 10 hours (10 AM to 8 PM)
  
  // Lunch break configuration
  LUNCH_START_HOUR: 14,    // 2:00 PM
  LUNCH_START_MINUTE: 0,
  LUNCH_END_HOUR: 15,      // 3:00 PM  
  LUNCH_END_MINUTE: 0,
  
  // Overtime calculation
  OVERTIME_THRESHOLD: 10,  // Hours after which overtime kicks in
} as const;

// Helper functions for working hours
export const getWorkStartTime = (date: Date = new Date()): Date => {
  const startTime = new Date(date);
  startTime.setHours(WORKING_HOURS.START_HOUR, WORKING_HOURS.START_MINUTE, 0, 0);
  return startTime;
};

export const getWorkEndTime = (date: Date = new Date()): Date => {
  const endTime = new Date(date);
  endTime.setHours(WORKING_HOURS.END_HOUR, WORKING_HOURS.END_MINUTE, 0, 0);
  return endTime;
};

export const getLunchStartTime = (date: Date = new Date()): Date => {
  const lunchStart = new Date(date);
  lunchStart.setHours(WORKING_HOURS.LUNCH_START_HOUR, WORKING_HOURS.LUNCH_START_MINUTE, 0, 0);
  return lunchStart;
};

export const getLunchEndTime = (date: Date = new Date()): Date => {
  const lunchEnd = new Date(date);
  lunchEnd.setHours(WORKING_HOURS.LUNCH_END_HOUR, WORKING_HOURS.LUNCH_END_MINUTE, 0, 0);
  return lunchEnd;
};

export const isLateArrival = (clockInTime: Date): boolean => {
  const workStart = getWorkStartTime(clockInTime);
  return clockInTime > workStart;
};

export const isEarlyDeparture = (clockOutTime: Date): boolean => {
  const workEnd = getWorkEndTime(clockOutTime);
  return clockOutTime < workEnd;
};

export const calculateOvertime = (workedHours: number): number => {
  return Math.max(0, workedHours - WORKING_HOURS.OVERTIME_THRESHOLD);
};

export const calculateLateMinutes = (clockInTime: Date): number => {
  const workStart = getWorkStartTime(clockInTime);
  if (clockInTime <= workStart) return 0;
  return Math.floor((clockInTime.getTime() - workStart.getTime()) / (1000 * 60));
};

export const formatWorkingHours = (): string => {
  return `${WORKING_HOURS.START_HOUR}:${WORKING_HOURS.START_MINUTE.toString().padStart(2, '0')} AM - ${WORKING_HOURS.END_HOUR - 12}:${WORKING_HOURS.END_MINUTE.toString().padStart(2, '0')} PM`;
};
