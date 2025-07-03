// Simple Node.js script to run employee setup
const { execSync } = require('child_process');

console.log('Starting employee database setup...');
console.log('Run the following command in your development server console:');
console.log('');
console.log('import { setupEmployeeDatabase } from "./src/utils/setupEmployeeDatabase";');
console.log('setupEmployeeDatabase().then(() => console.log("Setup completed!"));');
console.log('');
console.log('Or start the dev server with: npm run dev');
console.log('Then open browser console and run the setup function there.');
