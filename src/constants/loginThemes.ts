// Premium hero images for different login modes
export const heroImages = {
  admin: {
    url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    alt: 'Executive boardroom with modern business technology',
    title: 'Command Center',
    subtitle: 'Manage your entire workforce',
    overlay: 'bg-black bg-opacity-40'
  },
  employee: {
    url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    alt: 'Collaborative modern office workspace',
    title: 'Your Workspace',
    subtitle: 'Track time, boost productivity',
    overlay: 'bg-black bg-opacity-40'
  },
  select: {
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    alt: 'Modern office building with glass architecture',
    title: 'Welcome to AINTRIX',
    subtitle: 'Advanced Attendance Management System',
    overlay: 'bg-black bg-opacity-40'
  }
};

// Professional color schemes for each mode
export const colorThemes = {
  admin: {
    primary: 'red',
    isDark: false,
    gradient: 'from-red-50 to-orange-50',
  },
  employee: {
    primary: 'green',
    isDark: false,
    gradient: 'from-green-50 to-emerald-50',
  },
  select: {
    primary: 'gray',
    isDark: false,
    gradient: 'from-gray-50 to-slate-50',
  }
};

// Professional feature descriptions for each mode
export const modeFeatures = {
  admin: [
    'Complete employee management',
    'Advanced analytics & reports',
    'System configuration & setup',
    'Multi-location support'
  ],
  employee: [
    'Personal attendance tracking',
    'Time off requests',
    'Mobile-friendly interface',
    'Real-time clock in/out'
  ]
};
