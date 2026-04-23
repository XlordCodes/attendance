/**
 * Format a decimal hour value into a human-readable "h m" string.
 *
 * @param hours - Decimal hours (e.g., 7.5 → "7h 30m")
 * @returns Formatted string like "7h 30m"
 */
export const formatDuration = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${h}h ${m}m`;
};
