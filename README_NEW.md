# AINTRIX Attendance Management System

## 🚀 New Subcollection Architecture

The AINTRIX attendance system has been completely redesigned to use Firebase Firestore **subcollections** for storing attendance data, providing better scalability, performance, and organization.

## ✨ Key Features

- **Subcollection-based Storage**: Each user's attendance records are stored in their own subcollection
- **Scalable Architecture**: No document size limits, handles unlimited attendance history
- **Dynamic User Management**: All user data fetched from Firebase, no hardcoded users
- **Clean UI**: Removed user profile displays from sidebar and dashboards
- **Migration Tools**: Utilities to migrate from old array-based storage
- **Test Interface**: Comprehensive testing tools at `/test-attendance`

## 🏗️ Architecture Overview

### Data Structure
```
users/{userId}
├── name: "John Doe"
├── email: "john@example.com"
├── role: "Employee"
└── attendance/{date}
    ├── 2025-07-02
    │   ├── clockIn: Timestamp
    │   ├── clockOut: Timestamp
    │   ├── status: "present"
    │   └── totalHours: 8.5
    └── 2025-07-01
        ├── clockIn: Timestamp
        └── ...
```

### Benefits
- **Scalability**: No 1MB document size limit
- **Performance**: Faster queries, better indexing
- **Organization**: Clean data separation
- **Concurrency**: Better multi-user support

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Firebase project with Firestore enabled
- Firebase Authentication configured

### 1. Clone and Install
```bash
git clone <repository-url>
cd AINTRIX-attendance
npm install
```

### 2. Firebase Configuration
Create `src/services/firebaseConfig.ts`:
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### 3. Manual User Setup
Create users in Firebase Console:
```javascript
// In Firestore, create documents in 'users' collection:
users/{userId} {
  name: "John Doe",
  email: "john@example.com", 
  role: "Employee", // or "Admin"
  department: "Engineering" // optional
}
```

### 4. Start Development
```bash
npm run dev
```

## 🧪 Testing the System

### Test Interface
Navigate to `/test-attendance` to access testing tools:

1. **Check Users** - Verify user documents exist
2. **Migrate Data** - Move old array data to subcollections (if applicable)
3. **Verify Migration** - Check migration status
4. **Clock In/Out** - Test attendance functionality
5. **Load Data** - View attendance records

### Manual Testing Steps
1. Create a user in Firebase Console
2. Enable Authentication for the user
3. Log in to the application
4. Navigate to `/test-attendance`
5. Test clock in/out functionality
6. Verify data appears in Firebase Console under `users/{userId}/attendance/`

## 📁 Project Structure

```
src/
├── components/
│   ├── Admin/          # Admin components
│   ├── Auth/           # Authentication components
│   ├── Dashboard/      # Dashboard components
│   ├── Employee/       # Employee components
│   ├── Layout/         # Layout components
│   └── Test/           # Testing components
├── services/
│   ├── attendanceService.ts  # Main attendance logic
│   ├── authService.ts        # Authentication logic
│   └── firebaseConfig.ts     # Firebase configuration
├── utils/
│   ├── migrateAttendanceData.ts    # Migration utilities
│   └── initializeSubcollections.ts # Setup utilities
└── types/
    └── index.ts        # Type definitions
```

## 🔄 Migration from Array-based Storage

If you have existing attendance data stored as arrays in user documents:

### Using Migration Utility
```typescript
import { migrateFromArrayToSubcollection, verifyMigration } from './utils/migrateAttendanceData';

// 1. Backup your data first!
// 2. Run migration
await migrateFromArrayToSubcollection();

// 3. Verify migration
await verifyMigration();
```

### Using Test Interface
1. Navigate to `/test-attendance`
2. Click "Migrate Data" button
3. Click "Verify Migration" button
4. Check console for migration results

## 🛡️ Security Rules

Update Firestore security rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can manage their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Users can manage their own attendance
      match /attendance/{date} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Admins can read all data
    match /users/{userId} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
      
      match /attendance/{date} {
        allow read: if request.auth != null && 
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
      }
    }
  }
}
```

## 📊 API Reference

### AttendanceService

#### Clock In
```typescript
await attendanceService.clockIn(userId: string, location?: GeolocationData)
```

#### Clock Out
```typescript
await attendanceService.clockOut(userId: string, reason?: string)
```

#### Get Today's Attendance
```typescript
const record = await attendanceService.getTodayAttendance(userId: string)
```

#### Get Attendance History
```typescript
const records = await attendanceService.getAttendanceHistory(userId: string, days: number)
```

#### Get All Records (Admin)
```typescript
const allRecords = await attendanceService.getAllAttendanceRecords(startDate?: string, endDate?: string)
```

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📱 Routes

- `/` - Login page
- `/employee-dashboard` - Employee dashboard
- `/admin-dashboard` - Admin dashboard
- `/admin-setup` - Admin setup guide
- `/test-attendance` - Testing interface

## 🚨 Troubleshooting

### Common Issues

1. **Firebase Configuration**
   - Ensure `firebaseConfig.ts` is properly configured
   - Check Firebase Console permissions
   - Verify Firestore is enabled

2. **User Creation**
   - Users must be created manually in Firebase Console
   - Authentication users must match Firestore user documents
   - Required fields: `name`, `email`, `role`

3. **Migration Issues**
   - Backup data before migration
   - Check console logs for detailed errors
   - Use verification utility to check migration status

4. **Performance**
   - Create Firestore indexes for complex queries
   - Use pagination for large datasets
   - Monitor Firestore usage in Firebase Console

### Debug Tips

1. Check browser console for detailed error messages
2. Use `/test-attendance` interface for debugging
3. Monitor Firebase Console for query performance
4. Enable Firestore debug logging in development

## 📚 Documentation

- [Subcollection Architecture Guide](./SUBCOLLECTION_ARCHITECTURE.md)
- [Migration Guide](./SUBCOLLECTION_ARCHITECTURE.md#migration-guide)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

## 🔮 Future Enhancements

- [ ] Bulk data operations
- [ ] Advanced analytics dashboard
- [ ] Real-time attendance monitoring
- [ ] Mobile app support
- [ ] Offline functionality
- [ ] Data archiving system

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly using `/test-attendance`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Firebase Console for errors
3. Test with `/test-attendance` interface
4. Check browser console logs