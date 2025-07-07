import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { LeaveRequest } from '../types';

class LeaveService {
  private collectionName = 'leaveRequests';

  async createLeaveRequest(leaveRequest: Omit<LeaveRequest, 'id' | 'appliedAt'>): Promise<void> {
    try {
      const leaveRequestData = {
        ...leaveRequest,
        appliedAt: Timestamp.now(),
        status: 'pending'
      };

      await addDoc(collection(db, this.collectionName), leaveRequestData);
    } catch (error) {
      console.error('Error creating leave request:', error);
      throw error;
    }
  }

  async submitLeaveRequest(leaveRequest: Omit<LeaveRequest, 'id' | 'appliedAt'>): Promise<void> {
    try {
      const leaveRequestData = {
        ...leaveRequest,
        appliedAt: Timestamp.now(),
        status: 'pending'
      };

      await addDoc(collection(db, this.collectionName), leaveRequestData);
    } catch (error) {
      console.error('Error submitting leave request:', error);
      throw error;
    }
  }

  async getLeaveRequestsForEmployee(employeeId: string): Promise<LeaveRequest[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('employeeId', '==', employeeId),
        orderBy('appliedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        appliedAt: doc.data().appliedAt?.toDate() || new Date(),
        reviewedAt: doc.data().reviewedAt?.toDate()
      })) as LeaveRequest[];
    } catch (error) {
      console.error('Error fetching leave requests for employee:', error);
      throw error;
    }
  }

  async getAllLeaveRequests(): Promise<LeaveRequest[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        orderBy('appliedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        appliedAt: doc.data().appliedAt?.toDate() || new Date(),
        reviewedAt: doc.data().reviewedAt?.toDate()
      })) as LeaveRequest[];
    } catch (error) {
      console.error('Error fetching all leave requests:', error);
      throw error;
    }
  }

  async getPendingLeaveRequests(): Promise<LeaveRequest[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('status', '==', 'pending'),
        orderBy('appliedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        appliedAt: doc.data().appliedAt?.toDate() || new Date(),
        reviewedAt: doc.data().reviewedAt?.toDate()
      })) as LeaveRequest[];
    } catch (error) {
      console.error('Error fetching pending leave requests:', error);
      throw error;
    }
  }

  async updateLeaveRequestStatus(
    requestId: string, 
    status: 'approved' | 'rejected',
    reviewedBy: string,
    adminComments?: string
  ): Promise<void> {
    try {
      const requestRef = doc(db, this.collectionName, requestId);
      await updateDoc(requestRef, {
        status,
        reviewedBy,
        reviewedAt: Timestamp.now(),
        adminComments: adminComments || ''
      });
    } catch (error) {
      console.error('Error updating leave request status:', error);
      throw error;
    }
  }
}

export const leaveService = new LeaveService();
