# AINTRIX Attendance System - Quick Start Guide

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Set Up Test Users (Optional)
Open your browser developer console and run:
```javascript
// Import and run the setup function
import { setupTestUsers } from './src/utils/setupTestUsers';
setupTestUsers();
```

## 🔐 Login Modes

The system supports three distinct login modes with different themes and functionality:

### 1. **Kiosk Mode** (Dark Theme)
- **Purpose**: Company dashboard & check-in terminal
- **Theme**: Dark mode with blue accents
- **Hero Image**: Modern office/technology
- **Access**: Email-based login (no password required for employees)
- **Features**: Public terminal interface, company-wide attendance dashboard

### 2. **Admin Panel** (Red Theme)
- **Purpose**: Full system management & analytics
- **Theme**: Light mode with red accents
- **Hero Image**: Executive/management office
- **Access**: Email + Password required
- **Features**: Employee management, attendance analytics, system configuration

### 3. **Employee Portal** (Green Theme)
- **Purpose**: Personal dashboard & time tracking
- **Theme**: Light mode with green accents
- **Hero Image**: Collaborative workspace
- **Access**: Email-based login (password optional)
- **Features**: Personal attendance, clock in/out, QR code display

## 🎨 Design Features

### Split Layout Design
- **Left Side**: Dynamic hero images fetched from Unsplash
- **Right Side**: Login form that adapts to selected mode
- **Responsive**: Mobile-friendly with collapsible sidebar on smaller screens

### Dynamic Theming
- Each mode has its own color scheme and branding
- Automatic logo variant selection (white for dark mode, black for light modes)
- Context-aware UI elements and messaging

### Authentication Options
- **Email + Password**: Traditional login (required for admin)
- **QR Code**: Quick sign-in overlay (UI implemented, logic pending)
- **Google Sign-in**: Social authentication (UI implemented, logic pending)
- **Apple Sign-in**: Social authentication (UI implemented, logic pending)

## 📁 Key Components

### Authentication
- `UnifiedLoginPage.tsx`: Main login interface with mode selection
- `useAuth.tsx`: Authentication hook with role-based logic
- `AuthContext.tsx`: Global authentication state management

### Dashboards
- `EmployeeDashboard.tsx`: Personal employee interface
- `AdminDashboardNew.tsx`: Administrative control panel
- `KioskDashboard.tsx`: Public kiosk interface

### Shared Components
- `AintrixLogo.tsx`: Dynamic logo component (black/white variants)
- `Sidebar.tsx`: Navigation sidebar with role-based menu items

## 🔧 Configuration

### Firebase Setup
Make sure your Firebase configuration is properly set up in:
- `src/firebase/config.ts`
- `src/services/firebaseConfig.ts`

### Test Credentials
After running the setup script, you can use these credentials:
- **Admin**: admin@aintrix.com / admin123
- **Employee**: employee@aintrix.com / employee123  
- **Kiosk**: kiosk@aintrix.com / kiosk123

## 🎯 Next Steps

### Immediate Enhancements
1. **Replace Logo Placeholders**: Add actual AINTRIX logo files
2. **Implement QR Authentication**: Add QR code generation and scanning
3. **Social Login Integration**: Connect Google/Apple sign-in APIs
4. **Custom Hero Images**: Replace Unsplash placeholders with branded images

### Future Features
- Multi-factor authentication
- Biometric login support
- Advanced analytics dashboard
- Mobile app integration
- Real-time notifications

## 🚨 Troubleshooting

### Common Issues
1. **Logo not showing**: Check that AintrixLogo component is properly imported
2. **Theme not switching**: Verify the mode state is being passed correctly
3. **Firebase errors**: Ensure Firebase configuration is complete and valid
4. **Routing issues**: Check that all dashboard components are properly exported

### Development Notes
- The system uses Vite for fast development and hot reloading
- Tailwind CSS provides the styling framework
- TypeScript ensures type safety throughout the application
- React Router handles navigation and role-based routing

---

Built with ❤️ for AINTRIX Global • Modern attendance management solution
