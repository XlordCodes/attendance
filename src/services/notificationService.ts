import { supabase } from './supabaseClient';
import { Notification } from '../types';

class NotificationService {
  private readonly TABLE_NAME = 'notifications';

  private mapDbToNotification(dbData: unknown): Notification {
    const data = dbData as Record<string, unknown>;
    return {
      id: data.id as string,
      type: data.type as unknown as Notification['type'],
      title: data.title as string,
      message: data.message as string,
      employeeId: data.employee_id as string | undefined,
      employeeName: data.employee_name as string,
      isRead: data.is_read as boolean,
      createdAt: new Date(data.created_at as string),
      priority: data.priority as unknown as Notification['priority']
    };
  }

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .insert({
          type: notification.type,
          title: notification.title,
          message: notification.message,
          employee_id: notification.employeeId,
          employee_name: notification.employeeName,
          is_read: notification.isRead,
          priority: notification.priority
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapDbToNotification(data);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async getNotificationsForEmployee(employeeId: string, limit: number = 20): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data.map(this.mapDbToNotification);
    } catch (error) {
      console.error('Error getting notifications for employee:', error);
      throw error;
    }
  }

  async getAllNotifications(limit: number = 50): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data.map(this.mapDbToNotification);
    } catch (error) {
      console.error('Error getting all notifications:', error);
      throw error;
    }
  }

  async getUnreadNotifications(employeeId?: string): Promise<Notification[]> {
    try {
      let query = supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data.map(this.mapDbToNotification);
    } catch (error) {
      console.error('Error getting unread notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(employeeId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({ is_read: true })
        .eq('employee_id', employeeId)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // System notifications
  async createSystemNotification(title: string, message: string, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<Notification> {
    return this.createNotification({
      type: 'system',
      title,
      message,
      priority,
      isRead: false,
    });
  }

  // Attendance-specific notifications
  async createAttendanceNotification(
    employeeId: string, 
    employeeName: string, 
    type: 'early_logout' | 'overtime', 
    message: string
  ): Promise<Notification> {
    return this.createNotification({
      type,
      title: type === 'early_logout' ? 'Early Logout' : 'Overtime Alert',
      message,
      employeeId,
      employeeName,
      priority: type === 'early_logout' ? 'medium' : 'low',
      isRead: false,
    });
  }
}

export const notificationService = new NotificationService();
