import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  User,
  Bell,
  Clock,
  RotateCcw,
  Moon,
  Sun,
  Monitor,
  Palette,
  FileText,
  Users,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/userService';
import { browserNotificationService } from '../../services/browserNotificationService';
import { getScheduleForEmployee, formatWorkingHours, DEFAULT_ROLE_SCHEDULE } from '../../constants/workingHours';
import type { RoleSchedule, UserSettings } from '../../types';
import toast from 'react-hot-toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultSettings: UserSettings = {
  theme: 'system',
  notifications: {
    clockInReminder: true,
    clockOutReminder: true,
    breakReminder: true,
    weeklyReport: false,
    sound: true,
  },
  workPreferences: {
    defaultBreakDuration: 15,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
  },
  privacy: {
    shareLocation: true,
    trackProductivity: true,
  },
  language: 'en',
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { employee } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const originalSettingsRef = useRef<UserSettings | null>(null);

  // Apply only theme — used for live preview without saving to DB
  const applyThemePreview = useCallback((cfg: UserSettings) => {
    const root = document.documentElement;
    if (cfg.theme === 'dark') {
      root.classList.add('dark');
    } else if (cfg.theme === 'light') {
      root.classList.remove('dark');
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, []);

  // Revert document theme to what is persisted in the database.
  // Called when the user explicitly cancels unsaved changes.
  const revertSavedTheme = useCallback(async () => {
    if (!employee?.id) return;
    try {
      const userDoc = await userService.getUserById(employee.id);
      if (userDoc?.settings) {
        applyThemePreview(userDoc.settings as unknown as UserSettings);
      } else {
        applyThemePreview(defaultSettings);
      }
    } catch {
      applyThemePreview(defaultSettings);
    }
  }, [employee?.id, applyThemePreview]);

  const setupNotifications = useCallback(async (settingsToApply: UserSettings) => {
    try {
      if (!employee?.id) {
        console.warn('No employee ID, cannot fetch schedule for notifications');
        return;
      }
      const schedule = await getScheduleForEmployee(employee.id);
      if (!schedule) {
        toast.error('Unable to load your schedule for notifications');
        return;
      }
      await browserNotificationService.setupNotifications(settingsToApply, schedule);
    } catch (error) {
      console.error('Error setting up notifications:', error);
      toast.error('Failed to setup notifications');
    }
  }, [employee?.id]);

  useEffect(() => {
    const loadSettingsData = async () => {
      try {
        if (!employee?.id || !isOpen) return;
        const userDoc = await userService.getUserById(employee.id);
        if (!userDoc) return;

        // --- Typed columns from employees table (may be absent on legacy
        //     accounts until back-fill has run — fall back gracefully).
        const typedBreakDuration = userDoc.default_break_duration;
        const typedBreakEnabled = userDoc.break_reminder_enabled;
        const typedSoundEnabled = userDoc.sound_enabled;

        // --- Blob path: theme / language / dateFormat still come from
        //     the JSON bundle; workPreferences breaks are overridden below.
        const blob = userDoc.settings;
        let baseSettings: UserSettings = { ...defaultSettings };
        if (blob && typeof blob === 'object') {
          baseSettings = {
            ...defaultSettings,
            ...(blob as Partial<UserSettings>),
          } as UserSettings;
        }

        // Typed columns take priority over blob for these three settings
        baseSettings.workPreferences.defaultBreakDuration =
          typedBreakDuration ?? baseSettings.workPreferences.defaultBreakDuration;
        baseSettings.notifications.breakReminder =
          typedBreakEnabled ?? baseSettings.notifications.breakReminder;
        baseSettings.notifications.sound =
          typedSoundEnabled ?? baseSettings.notifications.sound;

        setSettings(baseSettings);
        setHasChanges(false);
        originalSettingsRef.current = baseSettings;

        // Apply saved settings immediately (called on modal open)
        applyThemePreview(baseSettings);
        await setupNotifications(baseSettings);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    if (employee?.id && isOpen) {
      loadSettingsData();
    }
  }, [employee?.id, isOpen, applyThemePreview, setupNotifications]);

  const saveSettings = async () => {
    try {
      if (!employee?.id) {
        toast.error('You must be logged in to save settings');
        return;
      }
      await userService.updateUserSettings(employee.id, settings);
      toast.success('Settings saved successfully!');
      setHasChanges(false);
      applyThemePreview(settings);
      await setupNotifications(settings);
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Error saving settings:', error);
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
    toast.success('Settings reset to defaults');
  };

  const updateSettings = (path: string, value: unknown) => {
    const keys = path.split('.');
    const newSettings = JSON.parse(JSON.stringify(settings));
    let current: Record<string, unknown> = newSettings;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = value;
    setSettings(newSettings);
    setHasChanges(true);
    // Live-preview: apply theme change immediately so the user sees it
    applyThemePreview(newSettings);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'work', label: 'Work Preferences', icon: Clock },
    { id: 'terms', label: 'Terms & Conditions', icon: FileText },
  ];

  // Role-schedule for Terms tab dynamic times
  const [roleSchedule, setRoleSchedule] = useState<RoleSchedule>(DEFAULT_ROLE_SCHEDULE);

  useEffect(() => {
    if (!isOpen || !employee?.id) return;
    let cancelled = false;
    (async () => {
      const s = await getScheduleForEmployee(employee.id);
      if (!cancelled && s) setRoleSchedule(s);
    })();
    return () => { cancelled = true; };
  }, [isOpen, employee?.id]);

  const workHours = formatWorkingHours(roleSchedule);
  const start12 = `${roleSchedule.start_hour % 12 || 12}:${String(roleSchedule.start_minute).padStart(2, '0')} ${roleSchedule.start_hour >= 12 ? 'PM' : 'AM'}`;
  const end12 = `${roleSchedule.end_hour % 12 || 12}:${String(roleSchedule.end_minute).padStart(2, '0')} ${roleSchedule.end_hour >= 12 ? 'PM' : 'AM'}`;
  const lunchStart12 = `${roleSchedule.lunch_start_hour % 12 || 12}:${String(roleSchedule.lunch_start_minute).padStart(2, '0')} ${roleSchedule.lunch_start_hour >= 12 ? 'PM' : 'AM'}`;
  const lunchEnd12 = `${roleSchedule.lunch_end_hour % 12 || 12}:${String(roleSchedule.lunch_end_minute).padStart(2, '0')} ${roleSchedule.lunch_end_hour >= 12 ? 'PM' : 'AM'}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-black rounded-2xl shadow-lg border border-gray-100 dark:border-neutral-800 w-full max-w-4xl h-[80vh] mx-4 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-canvas dark:bg-neutral-900 rounded-xl p-4 m-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
            <button onClick={onClose} className="bg-transparent hover:bg-white dark:hover:bg-neutral-800 rounded-xl p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-neutral-300 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm rounded-lg ${activeTab === tab.id
                    ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-white dark:text-white font-semibold shadow-sm'
                    : 'text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:text-white dark:hover:text-white hover:bg-white/50 dark:hover:bg-neutral-800/50'
                    }`}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Action Buttons */}
          <div className="mt-8 space-y-2">
            <button
              onClick={resetSettings}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:text-white dark:hover:text-white hover:bg-white/50 dark:hover:bg-neutral-800/50 rounded-lg"
            >
              <RotateCcw className="h-4 w-4 mr-3" />
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Information card */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h3>
                <div className="bg-blue-50 dark:bg-neutral-900/80 border border-blue-200 dark:border-neutral-800 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="bg-canvas dark:bg-neutral-800 rounded-full p-3 border border-transparent dark:border-neutral-700">
                      <User className="h-6 w-6 text-brand" />
                    </div>
                    <div className="ml-4">
                      <h4 className="font-medium text-gray-900 dark:text-white">{employee?.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-neutral-400 dark:text-neutral-400">{employee?.email}</p>
                      <p className="text-sm text-gray-600 dark:text-neutral-400 dark:text-neutral-400">{employee?.department} • {employee?.role}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Employment Details — read-only metadata */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Employment Details</h3>
                <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Employee ID', value: employee?.employeeId || employee?.uid || employee?.id },
                      { label: 'Department', value: employee?.department },
                      { label: 'Role', value: employee?.role },
                      { label: 'Email', value: employee?.email },
                    ].map((field) => (
                      <div key={field.label}>
                        <p className="text-sm font-medium text-gray-500 dark:text-neutral-400">{field.label}</p>
                        <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                          {field.value
                            ? typeof field.value === 'string'
                              ? field.value.charAt(0).toUpperCase() + field.value.slice(1)
                              : field.value
                            : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Preferences</h3>

              <div className="space-y-4">
                {(
                  [
                    { key: 'breakReminder', description: 'Get notified to take regular breaks' },
                    { key: 'sound', description: 'Play sound for notifications' },
                  ] as const
                ).map(({ key, description }) => {
                  const value = settings.notifications[key];
                  return (
                    <div key={key} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-neutral-800/50">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-neutral-400 dark:text-neutral-400">{description}</p>
                      </div>
                      <button
                        onClick={() => updateSettings(`notifications.${key}`, !value)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-brand dark:bg-accent-500' : 'bg-gray-200 dark:bg-gray-600'}
                          }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Test Notification Button */}
              <div className="pt-4 border-t border-gray-200 dark:border-neutral-800/50">
                <button
                  onClick={async () => {
                    try {
                      await browserNotificationService.sendTestNotification();
                      toast.success('Test notification sent!');
                    } catch {
                      toast.error('Failed to send test notification');
                    }
                  }}
                  className="px-4 py-2 bg-brand/10 text-gray-700 dark:text-white hover:bg-brand/20 dark:hover:bg-brand/20 transition-colors border border-brand/30 rounded-full"
                >
                  <Bell className="h-4 w-4 inline mr-2" />
                  Send Test Notification
                </button>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h3>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Theme</h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'light', label: 'Light', icon: Sun },
                    { value: 'dark', label: 'Dark', icon: Moon },
                    { value: 'system', label: 'System', icon: Monitor },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => updateSettings('theme', value)}
                      className={`p-4 border rounded-lg flex flex-col items-center space-y-2 ${settings.theme === value
                        ? 'bg-brand/10 text-gray-700 dark:text-white border border-brand/30 rounded-lg'
                        : 'border-gray-300 dark:border-neutral-800 dark:hover:border-neutral-600 hover:border-gray-400 text-gray-600 dark:text-neutral-400 dark:text-neutral-400'
                        }`}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Work Preferences Tab */}
          {activeTab === 'work' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Work Preferences</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                  Default Break Duration (minutes)
                </label>
                <select
                  value={settings.workPreferences.defaultBreakDuration}
                  onChange={(e) => updateSettings('workPreferences.defaultBreakDuration', parseInt(e.target.value))}
                  className="w-full max-w-xs border border-gray-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white dark:text-white px-3 py-2 focus:ring-2 focus:ring-brand focus:border-brand focus:border-transparent"
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>
            </div>
          )}

          {/* Terms & Conditions Tab */}
          {activeTab === 'terms' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Terms & Conditions</h3>
              <div className="bg-blue-50 dark:bg-neutral-900/80 border border-blue-200 dark:border-neutral-800 rounded-lg p-4">
                <p className="text-gray-700 dark:text-neutral-300 leading-relaxed text-sm">
                  Welcome to the AINTRIX Global Attendance Management System. By using this system, you agree to comply with and be bound by the following terms and conditions. These terms govern your use of the attendance tracking system and outline your rights and responsibilities as an employee.
                </p>
              </div>

              <section>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-brand" />
                  Working Hours Policy
                </h4>
                <div className="bg-green-50 dark:bg-neutral-900/50 border border-green-200 dark:border-neutral-800 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="font-semibold text-green-800 dark:text-green-400 text-sm">Standard Hours</div>
                      <div className="text-green-700 dark:text-green-300 text-sm">{workHours}</div>
                      <div className="text-xs text-brand">{roleSchedule.standard_work_hours} hours daily</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-green-800 dark:text-green-400 text-sm">Lunch Break</div>
                      <div className="text-green-700 dark:text-green-300 text-sm">{lunchStart12} – {lunchEnd12}</div>
                      <div className="text-xs text-brand">1 hour break</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-green-800 dark:text-green-400 text-sm">Late Threshold</div>
                      <div className="text-green-700 dark:text-green-300 text-sm">After {start12}</div>
                      <div className="text-xs text-brand">Requires justification</div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-canvas dark:bg-black/50 rounded">
                    <p className="text-sm text-green-800 dark:text-neutral-300">
                      <strong className="dark:text-white">Important:</strong> Consistent late arrivals may result in disciplinary action.
                      Please ensure you clock in on time and provide valid reasons for any delays.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <Users className="h-4 w-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                  Attendance Tracking Requirements
                </h4>
                <div className="bg-indigo-50 dark:bg-neutral-900/50 border border-indigo-200 dark:border-neutral-800 rounded-lg p-4">
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-neutral-300">
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 mr-3 flex-shrink-0" />
                      <div><strong className="dark:text-white">Daily Clock-In/Out:</strong> All employees must clock in upon arrival and clock out before leaving the premises.</div>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 mr-3 flex-shrink-0" />
                      <div><strong className="dark:text-white">Break Tracking:</strong> All breaks exceeding 15 minutes must be properly logged in the system.</div>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 mr-3 flex-shrink-0" />
                      <div><strong className="dark:text-white">Late Justification:</strong> Any arrival after {start12} requires a reason to be provided in the system.</div>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 mr-3 flex-shrink-0" />
                      <div><strong className="dark:text-white">Accuracy:</strong> Employees are responsible for ensuring their attendance records are accurate and complete.</div>
                    </li>
                  </ul>
                </div>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-brand" />
                  Location &amp; Privacy Policy
                </h4>
                <div className="bg-orange-50 dark:bg-neutral-900/50 border border-orange-200 dark:border-neutral-800 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-semibold text-orange-800 dark:text-orange-400 mb-2 text-sm">Location Tracking</h5>
                      <ul className="text-xs text-orange-700 dark:text-neutral-400 space-y-1">
                        <li>• Location data may be collected for attendance verification</li>
                        <li>• Used only for legitimate business purposes</li>
                        <li>• Can be disabled in privacy settings</li>
                        <li>• Data is encrypted and securely stored</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-semibold text-orange-800 dark:text-orange-400 mb-2 text-sm">Data Protection</h5>
                      <ul className="text-xs text-orange-700 dark:text-neutral-400 space-y-1">
                        <li>• Attendance data is confidential and protected</li>
                        <li>• Access limited to authorized personnel only</li>
                        <li>• Data retention as per company policy</li>
                        <li>• Compliance with data protection regulations</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <Bell className="h-4 w-4 mr-2 text-brand" />
                  Notification Policy
                </h4>
                <div className="bg-yellow-50 dark:bg-neutral-900/50 border border-yellow-200 dark:border-neutral-800 rounded-lg p-4">
                  <p className="text-sm text-gray-700 dark:text-neutral-300 mb-3">
                    The system may send notifications for various attendance-related events. You can control these in your settings:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h5 className="font-semibold text-yellow-800 dark:text-yellow-400 mb-2">Automatic Notifications</h5>
                      <ul className="text-xs text-yellow-700 dark:text-neutral-400 space-y-1">
                        <li>• Clock-in reminders ({start12})</li>
                        <li>• Clock-out reminders ({end12})</li>
                        <li>• Break time reminders</li>
                        <li>• Weekly attendance summaries</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-semibold text-yellow-800 dark:text-yellow-400 mb-2">Optional Notifications</h5>
                      <ul className="text-xs text-yellow-700 dark:text-neutral-400 space-y-1">
                        <li>• Overtime alerts</li>
                        <li>• Leave request updates</li>
                        <li>• System maintenance notices</li>
                        <li>• Policy updates</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Your Rights &amp; Responsibilities</h4>
                <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-semibold text-gray-800 dark:text-white mb-2 text-sm">Your Rights</h5>
                      <ul className="text-xs text-gray-700 dark:text-neutral-400 space-y-1">
                        <li>• Access to your attendance records</li>
                        <li>• Request corrections to inaccurate data</li>
                        <li>• Control over optional data sharing</li>
                        <li>• Privacy protection of personal information</li>
                        <li>• Appeal attendance-related decisions</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-800 dark:text-white mb-2 text-sm">Your Responsibilities</h5>
                      <ul className="text-xs text-gray-700 dark:text-neutral-400 space-y-1">
                        <li>• Accurate and timely attendance recording</li>
                        <li>• Compliance with working hours policy</li>
                        <li>• Proper use of the attendance system</li>
                        <li>• Reporting system issues promptly</li>
                        <li>• Maintaining confidentiality of access credentials</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              <section className="border-t border-gray-200 dark:border-neutral-800/50 pt-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Questions or Concerns?</h4>
                <div className="bg-white dark:bg-neutral-900/80 rounded-2xl shadow-lg border border-gray-100 dark:border-neutral-800 p-4">
                  <p className="text-sm text-gray-700 dark:text-neutral-300 mb-3">
                    If you have any questions about these terms and conditions or the attendance system, please contact:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong className="text-gray-900 dark:text-white">HR Department</strong>
                      <div className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Shanmugapriya</div>
                      <div className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400">+918870605033</div>
                    </div>
                    <div>
                      <strong className="text-gray-900 dark:text-white">IT Support</strong>
                      <div className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Syed Muksid</div>
                      <div className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400">+919444285541</div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="border-t border-gray-200 dark:border-neutral-800/50 pt-4">
                <p className="text-center text-xs text-gray-500 dark:text-neutral-400">
                  Last updated: May 18, 2026
                </p>
              </section>
            </div>
          )}

          {/* Save Button */}
          <div className="sticky bottom-0 bg-white dark:bg-black border-t border-gray-200 dark:border-neutral-800/50 pt-4 mt-8">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-neutral-400 dark:text-neutral-400">
                {hasChanges && 'You have unsaved changes'}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    await revertSavedTheme();
                    onClose();
                  }}
                  className="px-4 py-2 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white border border-gray-200 dark:border-neutral-800 rounded-xl font-medium hover:bg-canvas dark:hover:bg-neutral-800 transition-colors flex items-center justify-center space-x-2"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSettings}
                  disabled={!hasChanges}
                  className={`px-4 py-2 rounded-lg ${hasChanges
                    ? 'bg-gray-900 dark:bg-brand text-white dark:text-gray-900 dark:text-white hover:bg-gray-800 dark:hover:bg-brand-dark transition-colors shadow-sm  '
                    : 'bg-gray-300 dark:bg-neutral-900 text-gray-500 dark:text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                    }`}
                >
                  Save Changes
                </button>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default SettingsModal;