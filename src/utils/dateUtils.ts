import { format } from 'date-fns';

/**
 * Parse a dd-MM-yyyy date string into a JavaScript Date object
 * @param dateString Date string in dd-MM-yyyy format
 * @returns Date object or null if invalid
 */
export const parseDDMMYYYY = (dateString: string): Date | null => {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const parts = dateString.split('-');
  if (parts.length !== 3) {
    return null;
  }

  const [day, month, year] = parts.map(Number);
  
  // Validate the numbers
  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return null;
  }

  // Create date (month is 0-indexed in JavaScript)
  const date = new Date(year, month - 1, day);
  
  // Validate that the date is valid (e.g., no Feb 30th)
  if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
    return null;
  }

  return date;
};

/**
 * Format a Date object to dd-MM-yyyy string
 * @param date Date object
 * @returns Date string in dd-MM-yyyy format
 */
export const formatToDDMMYYYY = (date: Date): string => {
  return format(date, 'dd-MM-yyyy');
};

/**
 * Get today's date in dd-MM-yyyy format
 * @returns Today's date string in dd-MM-yyyy format
 */
export const getTodayDDMMYYYY = (): string => {
  return formatToDDMMYYYY(new Date());
};

/**
 * Compare two dd-MM-yyyy date strings
 * @param date1 First date string
 * @param date2 Second date string
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export const compareDDMMYYYY = (date1: string, date2: string): number => {
  const d1 = parseDDMMYYYY(date1);
  const d2 = parseDDMMYYYY(date2);
  
  if (!d1 || !d2) {
    return 0;
  }
  
  return d1.getTime() - d2.getTime();
};
