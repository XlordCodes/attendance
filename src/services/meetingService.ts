import { 
  collection, 
  doc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  addDoc 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Meeting } from '../types';

class MeetingService {
  async createMeeting(meetingData: Omit<Meeting, 'id' | 'createdAt' | 'status'>): Promise<Meeting> {
    try {
      const meeting: Meeting = {
        id: '', // Will be set by Firestore
        ...meetingData,
        createdAt: new Date(),
        status: 'scheduled'
      };

      const docRef = await addDoc(collection(db, 'meetings'), meeting);
      const createdMeeting = { ...meeting, id: docRef.id };
      
      // Update the document with its ID
      await updateDoc(docRef, { id: docRef.id });
      
      return createdMeeting;
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  }

  async getAllMeetings(): Promise<Meeting[]> {
    try {
      const meetingsRef = collection(db, 'meetings');
      const q = query(meetingsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Meeting));
    } catch (error) {
      console.error('Error getting meetings:', error);
      throw error;
    }
  }

  async getMeetingsForEmployee(employeeId: string): Promise<Meeting[]> {
    try {
      const meetingsRef = collection(db, 'meetings');
      const q = query(
        meetingsRef, 
        where('assignedEmployees', 'array-contains', employeeId),
        orderBy('date', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Meeting));
    } catch (error) {
      console.error('Error getting meetings for employee:', error);
      throw error;
    }
  }

  async updateMeetingStatus(meetingId: string, status: Meeting['status']): Promise<void> {
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingRef, { status });
    } catch (error) {
      console.error('Error updating meeting status:', error);
      throw error;
    }
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'meetings', meetingId));
    } catch (error) {
      console.error('Error deleting meeting:', error);
      throw error;
    }
  }
}

export const meetingService = new MeetingService();
