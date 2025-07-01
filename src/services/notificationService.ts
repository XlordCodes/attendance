import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Notification } from '../types';

class NotificationService {
  private readonly COLLECTION_NAME = 'notifications';

  private convertFirestoreToNotification(doc: any): Notification {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate(),
    };
  }

  private convertNotificationToFirestore(notification: Partial<Notification>) {
    const { id, ...data } = notification;
    return {
      ...data,
      createdAt: data.createdAt ? Timestamp.fromDate(data.createdAt) : Timestamp.now(),
    };
  }

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const notificationData = {
      ...notification,
      createdAt: new Date(),
    };

    const docRef = await addDoc(
      collection(db, this.COLLECTION_NAME), 
      this.convertNotificationToFirestore(notificationData)
    );

    return { ...notificationData, id: docRef.id };
  }

  async getNotificationsForEmployee(employeeId: string, limit: number = 20): Promise<Notification[]> {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('employeeId', '==', employeeId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.convertFirestoreToNotification(doc));
  }

  async getAllNotifications(limit: number = 50): Promise<Notification[]> {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.convertFirestoreToNotification(doc));
  }

  async getUnreadNotifications(employeeId?: string): Promise<Notification[]> {
    let q = query(
      collection(db, this.COLLECTION_NAME),
      where('isRead', '==', false),
      orderBy('createdAt', 'desc')
    );

    if (employeeId) {
      q = query(
        collection(db, this.COLLECTION_NAME),
        where('employeeId', '==', employeeId),
        where('isRead', '==', false),
        orderBy('createdAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => this.convertFirestoreToNotification(doc));
  }

  async markAsRead(notificationId: string): Promise<void> {
    const docRef = doc(db, this.COLLECTION_NAME, notificationId);
    await updateDoc(docRef, { isRead: true });
  }

  async markAllAsRead(employeeId: string): Promise<void> {
    const unreadNotifications = await this.getUnreadNotifications(employeeId);
    
    const updatePromises = unreadNotifications.map(notification => 
      this.markAsRead(notification.id)
    );
    
    await Promise.all(updatePromises);
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
