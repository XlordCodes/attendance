import { getWorkStartTime, getWorkEndTime } from '../constants/workingHours';

interface UserSettings {
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
}

class BrowserNotificationService {
  private notificationIntervals: { [key: string]: NodeJS.Timeout } = {};
  private readonly BREAK_REMINDER_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours

  /**
   * Request permission for browser notifications
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  /**
   * Send a browser notification
   */
  private sendNotification(title: string, body: string, icon?: string, playSound = true): void {
    if (Notification.permission !== 'granted') {
      return;
    }

    const notification = new Notification(title, {
      body,
      icon: icon || '/favicon.svg',
      tag: 'attendance-reminder',
      requireInteraction: true,
    });

    // Play sound if enabled
    if (playSound) {
      try {
        const AudioContext = window.AudioContext || (window as { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
        if (AudioContext) {
          const audioContext = new AudioContext();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        }
      } catch (error) {
        console.warn('Could not play notification sound:', error);
      }
    }

    // Auto-close notification after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
  }

  /**
   * Setup clock-in reminder
   */
  private setupClockInReminder(playSound: boolean): void {
    const now = new Date();
    const workStartToday = getWorkStartTime(now);

    // Determine the next work start time (today or tomorrow)
    const target = now >= workStartToday
      ? getWorkStartTime(new Date(now.getTime() + 24 * 60 * 60 * 1000)) // tomorrow
      : workStartToday;

    const timeUntilReminder = target.getTime() - now.getTime();

    this.notificationIntervals.clockIn = setTimeout(() => {
      this.sendNotification(
        'Time to Clock In! ⏰',
        'Don\'t forget to clock in for work today.',
        undefined,
        playSound
      );

      // Set up for next day
      this.setupClockInReminder(playSound);
    }, timeUntilReminder);
  }

  /**
   * Setup clock-out reminder
   */
  private setupClockOutReminder(playSound: boolean): void {
    const now = new Date();
    const workEndToday = getWorkEndTime(now);

    // Determine the next work end time (today or tomorrow)
    const target = now >= workEndToday
      ? getWorkEndTime(new Date(now.getTime() + 24 * 60 * 60 * 1000))
      : workEndToday;

    const timeUntilReminder = target.getTime() - now.getTime();

    this.notificationIntervals.clockOut = setTimeout(() => {
      this.sendNotification(
        'Time to Clock Out! 🏠',
        'Remember to clock out before leaving work.',
        undefined,
        playSound
      );

      // Set up for next day
      this.setupClockOutReminder(playSound);
    }, timeUntilReminder);
  }

  /**
   * Setup break reminder
   */
  private setupBreakReminder(playSound: boolean): void {
    this.notificationIntervals.breakReminder = setInterval(() => {
      const now = new Date();
      const workStart = getWorkStartTime(now);
      const workEnd = getWorkEndTime(now);

      // Only send break reminders during work hours
      if (now >= workStart && now < workEnd) {
        this.sendNotification(
          'Time for a Break! ☕',
          'Take a short break to rest and recharge.',
          undefined,
          playSound
        );
      }
    }, this.BREAK_REMINDER_INTERVAL);
  }

  /**
   * Setup weekly report reminder
   */
  private setupWeeklyReportReminder(playSound: boolean): void {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysUntilFriday = (5 - currentDay + 7) % 7; // Friday is day 5
    const fridayAt5PM = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + daysUntilFriday,
      17, // 5 PM
      0,
      0
    );

    // If it's already Friday after 5 PM, set for next Friday
    if (daysUntilFriday === 0 && now.getHours() >= 17) {
      fridayAt5PM.setDate(fridayAt5PM.getDate() + 7);
    }

    const timeUntilFriday = fridayAt5PM.getTime() - now.getTime();

    this.notificationIntervals.weeklyReport = setTimeout(() => {
      this.sendNotification(
        'Weekly Attendance Report 📊',
        'Check your weekly attendance summary and stats.',
        undefined,
        playSound
      );

      // Set up for next week
      this.setupWeeklyReportReminder(playSound);
    }, timeUntilFriday);
  }

  /**
   * Clear all notification timers
   */
  private clearAllReminders(): void {
    Object.values(this.notificationIntervals).forEach(interval => {
      if (interval) {
        clearTimeout(interval as NodeJS.Timeout);
        clearInterval(interval as NodeJS.Timeout);
      }
    });
    this.notificationIntervals = {};
  }

  /**
   * Setup all notifications based on user settings
   */
  async setupNotifications(settings: UserSettings): Promise<void> {
    // Clear existing reminders
    this.clearAllReminders();

    // Check if any notifications are enabled
    const hasNotificationsEnabled = Object.values(settings.notifications).some(
      (enabled, index) => enabled && index < 4 // Exclude sound setting
    );

    if (!hasNotificationsEnabled) {
      return;
    }

    // Request permission
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    const playSound = settings.notifications.sound;

    // Setup individual reminders
    if (settings.notifications.clockInReminder) {
      this.setupClockInReminder(playSound);
    }

    if (settings.notifications.clockOutReminder) {
      this.setupClockOutReminder(playSound);
    }

    if (settings.notifications.breakReminder) {
      this.setupBreakReminder(playSound);
    }

    if (settings.notifications.weeklyReport) {
      this.setupWeeklyReportReminder(playSound);
    }
  }

  /**
   * Send a test notification
   */
  async sendTestNotification(): Promise<void> {
    const permission = await this.requestPermission();
    if (permission === 'granted') {
      this.sendNotification(
        'Test Notification 🔔',
        'Your notifications are working correctly!',
        undefined,
        true
      );
    }
  }

  /**
   * Disable all notifications
   */
  disableAllNotifications(): void {
    this.clearAllReminders();
  }
}

export const browserNotificationService = new BrowserNotificationService();
