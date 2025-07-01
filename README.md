# Aintrix Attendance Management System

A modern, responsive attendance management system built with React, TypeScript, Tailwind CSS, and Firebase.

## 🚀 Features

- **Multi-mode Login**: Employee and Admin access modes
- **Real-time Attendance Tracking**: Clock in/out with location tracking
- **Break Time Management**: Track breaks and AFK time with automatic deduction from work hours
- **Meeting Management**: Assign meetings to employees with schedule tracking
- **Responsive Design**: Mobile-first design that works on all screen sizes
- **Admin Dashboard**: Comprehensive employee and attendance management
- **Advanced Analytics**: Comprehensive attendance reporting and insights
- **Export Functionality**: Export attendance data to Excel

## 🔧 Setup Instructions

### 1. Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Firebase account

### 2. Firebase Configuration

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication and Firestore Database
3. Update `src/services/firebaseConfig.ts` with your Firebase configuration

### 3. Install Dependencies

```bash
npm install
```

### 4. Set Up Employee Database

To create all employee accounts in the database:

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:5173/db-setup` in your browser

3. Click "Setup Employee Database" to create all employee accounts

**OR** run the setup manually in the browser console:

```javascript
import { setupEmployeeDatabase } from './src/utils/setupEmployeeDatabase';
setupEmployeeDatabase().then(() => console.log('Setup completed!'));
```

### 5. Start Development

```bash
npm run dev
```

## 👥 Default User Accounts

After running the database setup, the following accounts will be available:

### Test Accounts (for development/testing)
- **Employee**: `employee@aintrix.com` / `admin123`
- **Admin**: `admin@aintrix.com` / `admin123`
- **Admin**: `admin@aintrix.com` / `admin123`

### Production Admin Account
- **Email**: `kailash.s2376@gmail.com`
- **Password**: `kailash.s2376@gmail.com`

### Employee Accounts
All employee accounts use their email as the password:

- `shanmugapriyagangadurai@gmail.com`
- `eamathew2909@gmail.com`
- `Ayishasiddiqua3112@gmail.com`
- `sannyj16@gmail.com`
- `bsnabii67@gmail.com`
- `jeevarithik24@gmail.com`
- `yousuf38152006@gmail.com`
- `siddharth.ks1566@gmail.com`
- `afiyaa1805@gmail.com`
- `jazim0014@gmail.com`
- `raj234996@gmail.com`
- `masfar391@gmail.com`

## 🎯 Key Features

### Authentication
- **Password Rule**: All users log in using their email as the password
- **Multi-mode Access**: Employee and Admin modes
- **No Password Hints**: Clean UI without password rule mentions

### Attendance Management
- **Individual Records**: Each employee's attendance is stored in their own database record
- **Break Time Calculation**: Break and AFK time automatically reduces total work time
- **Real-time Updates**: All attendance data fetched from and written to Firestore
- **Status Tracking**: Present, Late, Absent status with automatic determination

### Responsive Design
- **Mobile-First**: Optimized for mobile devices with reduced DPI
- **Responsive Layout**: Adapts to all screen sizes
- **Touch-Friendly**: Large buttons and touch targets for mobile use

### Admin Features
- **Employee Management**: Create, update, and manage employee accounts
- **Meeting Assignment**: Assign meetings to employees with scheduling
- **Attendance Reports**: View and export attendance data for all employees
- **Dashboard Analytics**: Comprehensive attendance statistics and insights

## 📱 Responsive Design

The application is designed with a mobile-first approach:

- **Reduced DPI**: Smaller fonts and compact spacing for better mobile experience
- **Touch Optimization**: Larger touch targets and improved interaction
- **Adaptive Layout**: Responsive grid system that works on all devices
- **Professional UI**: Clean, modern interface with consistent branding

## 🔄 Break Time Management

The system automatically calculates net work time by:

1. **Gross Time**: Total time between clock in and clock out
2. **Break Deduction**: Subtracts all break and AFK time
3. **Net Work Time**: Final billable hours (Gross Time - Break Time)
4. **Overtime Calculation**: Based on net work time exceeding 8 hours

## 📊 Data Storage

All data is stored in Firestore with the following structure:

- **employees**: Employee profiles and settings
- **attendance**: Daily attendance records for each employee
- **meetings**: Meeting schedules and assignments
- **notifications**: System notifications and alerts

## 🛠️ Build Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Setup helper
npm run setup-help
```

## 📝 Recent Updates

- ✅ Removed all QR code and WFH logic
- ✅ Implemented email-as-password authentication
- ✅ Added break time calculation with work hour deduction
- ✅ Enhanced responsive design with reduced DPI
- ✅ Set up comprehensive employee database
- ✅ Fixed attendance report fetching for all modes
- ✅ Enhanced admin dashboard with comprehensive employee management
- ✅ Improved admin login and access control

## 🔧 Troubleshooting

### Common Issues

1. **Firebase Connection**: Ensure Firebase configuration is correct in `firebaseConfig.ts`
2. **Employee Not Found**: Run the database setup script to create employee accounts
3. **Login Issues**: Remember that password = email for all users
4. **Mobile Layout**: The design is optimized for mobile-first with responsive breakpoints

### Support

For technical support or questions, please contact the development team.

## 📄 License

This project is proprietary and confidential. All rights reserved by Aintrix.
