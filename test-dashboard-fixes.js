// Test script to verify dashboard fixes
console.log('🧪 Testing dashboard data display...');

// Simulate employee data with different field combinations
const testEmployeeData = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'employee',
    department: 'Engineering',
    position: 'Senior Developer',
    designation: 'Web Developer'
  },
  {
    id: '2', 
    Name: 'Jane Smith', // Alternative name field
    email: 'jane@example.com',
    role: 'admin',
    department: 'HR',
    position: 'Manager',
    designation: 'HR Manager'
  },
  {
    id: '3',
    email: 'minimal@example.com',
    role: 'employee',
    department: 'Sales',
    // Missing name, position, designation
  }
];

function testGetEmployeeName(employee) {
  return employee?.name || 
         employee?.Name ||
         employee?.email?.split('@')[0] || 
         'User';
}

function testGetEmployeeDesignation(employee) {
  return employee?.designation || 
         employee?.position || 
         employee?.role || 
         'Employee';
}

testEmployeeData.forEach((employee, index) => {
  console.log(`\n👤 Test Employee ${index + 1}:`);
  console.log('  Name:', testGetEmployeeName(employee));
  console.log('  Designation:', testGetEmployeeDesignation(employee));
  console.log('  Department:', employee.department || 'Unknown');
  console.log('  Raw data:', employee);
});

// Test date parsing
console.log('\n📅 Testing date parsing:');
const testDates = ['04-07-2025', '07-04-2025', '01-12-2025'];

testDates.forEach(dateStr => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const formatted = `${day}-${month}-${year}`;
    console.log(`  ${dateStr} -> ${formatted}`);
  }
});

console.log('\n✅ Dashboard tests completed!');
