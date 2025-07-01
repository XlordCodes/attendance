import { setupAdminKioskUsers } from './src/utils/setupAdminKiosk.js';

// Run setup
console.log('🚀 Starting setup process...');
setupAdminKioskUsers()
  .then(() => {
    console.log('✅ Setup completed successfully!');
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
  });
