import { setupEmployeeDatabase } from './src/utils/setupEmployeeDatabase.ts';

// Run this script to set up all employees in the database
console.log('Starting employee database setup...');

setupEmployeeDatabase()
  .then(() => {
    console.log('✅ Employee database setup completed successfully!');
    console.log('You can now log in with any of the employee emails using the email as the password.');
    console.log('Admin user: kailash.s2376@gmail.com (password: kailash.s2376@gmail.com)');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error setting up employee database:', error);
    process.exit(1);
  });
