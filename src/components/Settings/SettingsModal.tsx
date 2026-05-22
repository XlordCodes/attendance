import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Clock, 
  RotateCcw,
  Moon,
  Sun,
  Monitor,
  Languages,
  Calendar,
  MapPin,
  CalendarPlus
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/userService';
import { browserNotificationService } from '../../services/browserNotificationService';
import LeaveRequestModal from '../common/LeaveRequestModal';
import toast from 'react-hot-toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    clockInReminder: boolean;
    clockOutReminder: boolean;
    breakReminder: boolean;
    weeklyReport: boolean;
    sound: boolean;
  };
  workPreferences: {
    defaultBreakDuration: number;
    timezone: string;
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    timeFormat: '12h' | '24h';
  };
  privacy: {
    shareLocation: boolean;
    trackProductivity: boolean;
  };
  language: string;
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
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  const applyThemeSettings = useCallback((settingsToApply = settings) => {
    const root = document.documentElement;
    
    if (settingsToApply.theme === 'dark') {
      root.classList.add('dark');
    } else if (settingsToApply.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [settings]);

  const setupNotifications = useCallback(async (settingsToApply = settings) => {
    try {
      await browserNotificationService.setupNotifications(settingsToApply);
    } catch (error) {
      console.error('Error setting up notifications:', error);
      toast.error('Failed to setup notifications');
    }
  }, [settings]);

  useEffect(() => {
    const loadSettingsData = async () => {
      try {
        if (!employee?.id) return;
        
        const userDoc = await userService.getUserById(employee.id);
        if (userDoc && typeof userDoc === 'object' && 'settings' in userDoc) {
          const userData = userDoc as Record<string, unknown>;
          if (userData.settings && typeof userData.settings === 'object') {
            const loadedSettings = { ...defaultSettings, ...userData.settings as Partial<UserSettings> };
            setSettings(loadedSettings);
            
            // Apply loaded settings immediately
            applyThemeSettings(loadedSettings);
            await setupNotifications(loadedSettings);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      }
    };

    if (employee?.id) {
      loadSettingsData();
    }
  }, [employee?.id, applyThemeSettings, setupNotifications]);

  const saveSettings = async () => {
    try {
      if (!employee?.id) {
        toast.error('You must be logged in to save settings');
        return;
      }
      
      await userService.updateUserSettings(employee.id, settings);
      toast.success('Settings saved successfully!');
      setHasChanges(false);
      
      // Apply theme settings immediately
      applyThemeSettings();
      
      // Setup notifications if enabled
      setupNotifications();
      
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
    const newSettings = { ...settings };
    let current: Record<string, unknown> = newSettings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = value;
    
    setSettings(newSettings);
    setHasChanges(true);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'work', label: 'Work Preferences', icon: Clock },
    { id: 'privacy', label: 'Privacy & Data', icon: Shield },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] mx-4 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
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
                  className={`w-full flex items-center px-3 py-2 text-sm rounded-lg ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100'
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
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <RotateCcw className="h-4 w-4 mr-3" />
              Reset to Defaults
            </button>
            
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="w-full flex items-center px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200"
            >
              <CalendarPlus className="h-4 w-4 mr-3" />
              Request Leave
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="bg-blue-100 rounded-full p-3">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h4 className="font-medium text-gray-900">{employee?.name}</h4>
                      <p className="text-sm text-gray-600">{employee?.email}</p>
                      <p className="text-sm text-gray-600">{employee?.department} • {employee?.role}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Language & Region</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Languages className="h-4 w-4 inline mr-1" />
                      Language
                    </label>
                    <select
                      value={settings.language}
                      onChange={(e) => updateSettings('language', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="zh">中文</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      Timezone
                    </label>
                    <select
                      value={settings.workPreferences.timezone}
                      onChange={(e) => updateSettings('workPreferences.timezone', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                      <option value="Asia/Kolkata">India</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
              
              <div className="space-y-4">
                {Object.entries(settings.notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                      <h4 className="font-medium text-gray-900 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {key === 'clockInReminder' && 'Get notified to clock in at work start time'}
                        {key === 'clockOutReminder' && 'Get notified to clock out at work end time'}
                        {key === 'breakReminder' && 'Get notified to take regular breaks'}
                        {key === 'weeklyReport' && 'Receive weekly attendance summary reports'}
                        {key === 'sound' && 'Play sound for notifications'}
                      </p>
                    </div>
                    <button
                      onClick={() => updateSettings(`notifications.${key}`, !value)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        value ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* Test Notification Button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={async () => {
                    try {
                      await browserNotificationService.sendTestNotification();
                      toast.success('Test notification sent!');
                    } catch {
                      toast.error('Failed to send test notification');
                    }
                  }}
                  className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
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
              <h3 className="text-lg font-medium text-gray-900">Appearance</h3>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Theme</h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'light', label: 'Light', icon: Sun },
                    { value: 'dark', label: 'Dark', icon: Moon },
                    { value: 'system', label: 'System', icon: Monitor },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => updateSettings('theme', value)}
                      className={`p-4 border rounded-lg flex flex-col items-center space-y-2 ${
                        settings.theme === value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Date Format
                  </label>
                  <select
                    value={settings.workPreferences.dateFormat}
                    onChange={(e) => updateSettings('workPreferences.dateFormat', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Time Format
                  </label>
                  <select
                    value={settings.workPreferences.timeFormat}
                    onChange={(e) => updateSettings('workPreferences.timeFormat', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="12h">12 Hour (AM/PM)</option>
                    <option value="24h">24 Hour</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Work Preferences Tab */}
          {activeTab === 'work' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Work Preferences</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Break Duration (minutes)
                </label>
                <select
                  value={settings.workPreferences.defaultBreakDuration}
                  onChange={(e) => updateSettings('workPreferences.defaultBreakDuration', parseInt(e.target.value))}
                  className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          {/* Privacy & Data Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Privacy & Data</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <div>
                    <h4 className="font-medium text-gray-900">Share Location</h4>
                    <p className="text-sm text-gray-600">Allow location tracking for attendance verification</p>
                  </div>
                  <button
                    onClick={() => updateSettings('privacy.shareLocation', !settings.privacy.shareLocation)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.privacy.shareLocation ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.privacy.shareLocation ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <div>
                    <h4 className="font-medium text-gray-900">Track Productivity</h4>
                    <p className="text-sm text-gray-600">Allow productivity and activity monitoring</p>
                  </div>
                  <button
                    onClick={() => updateSettings('privacy.trackProductivity', !settings.privacy.trackProductivity)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.privacy.trackProductivity ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.privacy.trackProductivity ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-4 mt-8">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {hasChanges && 'You have unsaved changes'}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSettings}
                  disabled={!hasChanges}
                  className={`px-4 py-2 rounded-lg ${
                    hasChanges
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Request Modal */}
      <LeaveRequestModal 
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
      />
    </div>
  );
};

export default SettingsModal;
