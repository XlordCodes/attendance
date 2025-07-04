// Quick test script to validate date handling
import { parseDDMMYYYY, formatToDDMMYYYY, compareDDMMYYYY, getTodayDDMMYYYY } from './src/utils/dateUtils';

console.log('=== Date Utils Test ===');

// Test parsing
const testDates = [
  '04-07-2025', // Today
  '03-07-2025', // Yesterday
  '01-01-2025', // New Year
  '31-12-2024', // Last day of previous year
  '29-02-2024', // Leap year Feb 29
  '29-02-2023', // Invalid - not a leap year
  'invalid',     // Invalid format
  '',           // Empty string
];

testDates.forEach(dateStr => {
  const parsed = parseDDMMYYYY(dateStr);
  console.log(`"${dateStr}" -> ${parsed ? parsed.toISOString().split('T')[0] : 'null'}`);
});

// Test formatting
const testDate = new Date(2025, 6, 4); // July 4, 2025 (month is 0-indexed)
console.log(`\nFormatting ${testDate.toISOString().split('T')[0]} -> ${formatToDDMMYYYY(testDate)}`);

// Test comparison
const dates = ['01-01-2025', '31-12-2024', '04-07-2025', '03-07-2025'];
const sorted = dates.sort((a, b) => compareDDMMYYYY(b, a)); // Descending order
console.log(`\nSorted dates (desc): ${sorted.join(', ')}`);

// Test today
console.log(`\nToday: ${getTodayDDMMYYYY()}`);

console.log('=== Test Complete ===');
