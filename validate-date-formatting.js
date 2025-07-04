/**
 * Validation script for attendance system date formatting
 * Run this to check for date-related issues in the codebase
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Date Formatting in Attendance System...\n');

// Files to check for date formatting issues
const filesToCheck = [
  'src/services/globalAttendanceService.ts',
  'src/components/Attendance/AttendanceLogsNew.tsx',
  'src/components/Attendance/AttendancePageNew.tsx',
  'src/components/Dashboard/AdminDashboardNew.tsx',
  'src/components/Dashboard/EmployeeDashboardNew.tsx',
  'src/components/Employee/ClockInOutNew.tsx'
];

// Patterns that might indicate date issues
const problematicPatterns = [
  /new Date\([^)]*\.date[^)]*\)/g,           // new Date(record.date)
  /format\([^,]*,\s*['"]yyyy-MM-dd['"]\)/g, // yyyy-MM-dd format
  /format\([^,]*,\s*['"]MM-dd-yyyy['"]\)/g, // MM-dd-yyyy format
  /\.split\(['"]-['"]\).*new Date/g,         // Manual date parsing
];

const goodPatterns = [
  /format\([^,]*,\s*['"]dd-MM-yyyy['"]\)/g, // dd-MM-yyyy format
  /parseDDMMYYYY/g,                          // Using utility function
  /compareDDMMYYYY/g,                        // Using utility function
];

let issuesFound = 0;

filesToCheck.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log(`📄 Checking ${filePath}:`);
  
  // Check for problematic patterns
  problematicPatterns.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`  ❌ Found problematic pattern ${index + 1}: ${matches.length} occurrence(s)`);
      matches.forEach(match => {
        console.log(`     "${match}"`);
      });
      issuesFound += matches.length;
    }
  });
  
  // Check for good patterns
  goodPatterns.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`  ✅ Found good pattern ${index + 1}: ${matches.length} occurrence(s)`);
    }
  });
  
  console.log('');
});

// Check if date utilities are imported where needed
console.log('📦 Checking imports of date utilities:');
filesToCheck.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('parseDDMMYYYY') || content.includes('compareDDMMYYYY')) {
    const hasImport = content.includes('from \'../../utils/dateUtils\'') || 
                     content.includes('from \'../utils/dateUtils\'');
    
    if (!hasImport) {
      console.log(`  ❌ ${filePath} uses date utilities but doesn't import them`);
      issuesFound++;
    } else {
      console.log(`  ✅ ${filePath} properly imports date utilities`);
    }
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Issues found: ${issuesFound}`);

if (issuesFound === 0) {
  console.log('🎉 All date formatting looks good!');
} else {
  console.log('⚠️  Please review and fix the issues above.');
}

console.log('\n🔍 Date format consistency check complete.');
