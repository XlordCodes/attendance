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

## 🎯 Key Features

### Authentication
- **Multi-mode Access**: Employee and Admin modes
- **No Password Hints**: Clean UI without password rule mentions

### Attendance Management
- **Individual Records**: Each employee's attendance is stored in their own database record
- **Break Time Calculation**: Break time automatically reduces total work time
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

## 🔄 Break Time Management

The system automatically calculates net work time by:

1. **Gross Time**: Total time between clock in and clock out
2. **Break Deduction**: Subtracts all break time
3. **Net Work Time**: Final billable hours (Gross Time - Break Time)
4. **Overtime Calculation**: Based on net work time exceeding 8 hours

## 📊 Data Storage

All data is stored in Firestore with the following structure:

- **employees**: Employee profiles and settings
- **attendance**: Daily attendance records for each employee
- **meetings**: Meeting schedules and assignments


This project is proprietary and confidential. All rights reserved by Aintrix.
