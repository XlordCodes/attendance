import { supabase } from './supabaseClient';
import { LeaveRequest } from '../types';

class LeaveService {
  private readonly TABLE_NAME = 'leave_requests';

  private mapDbToLeaveRequest(dbData: any): LeaveRequest {
    return {
      id: dbData.id,
      employeeId: dbData.employee_id,
      employeeName: dbData.employee_name,
      employeeEmail: dbData.employee_email,
      leaveType: dbData.leave_type,
      startDate: dbData.start_date,
      endDate: dbData.end_date,
      reason: dbData.reason,
      status: dbData.status,
      appliedAt: new Date(dbData.applied_at),
      requestedAt: dbData.applied_at,
      reviewedAt: dbData.reviewed_at ? new Date(dbData.reviewed_at) : undefined,
      reviewedBy: dbData.reviewed_by,
      adminComments: dbData.admin_comments
    };
  }

  async createLeaveRequest(leaveRequest: Omit<LeaveRequest, 'id' | 'appliedAt'>): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .insert({
          employee_id: leaveRequest.employeeId,
          employee_name: leaveRequest.employeeName,
          employee_email: leaveRequest.employeeEmail,
          leave_type: leaveRequest.leaveType,
          start_date: leaveRequest.startDate,
          end_date: leaveRequest.endDate,
          reason: leaveRequest.reason,
          status: 'pending'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating leave request:', error);
      throw error;
    }
  }

  async submitLeaveRequest(leaveRequest: Omit<LeaveRequest, 'id' | 'appliedAt'>): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .insert({
          employee_id: leaveRequest.employeeId,
          employee_name: leaveRequest.employeeName,
          employee_email: leaveRequest.employeeEmail,
          leave_type: leaveRequest.leaveType,
          start_date: leaveRequest.startDate,
          end_date: leaveRequest.endDate,
          reason: leaveRequest.reason,
          status: 'pending'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error submitting leave request:', error);
      throw error;
    }
  }

  async getLeaveRequestsForEmployee(employeeId: string): Promise<LeaveRequest[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('employee_id', employeeId)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      return data.map(this.mapDbToLeaveRequest);
    } catch (error) {
      console.error('Error fetching leave requests for employee:', error);
      throw error;
    }
  }

  async getAllLeaveRequests(): Promise<LeaveRequest[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .order('applied_at', { ascending: false });

      if (error) throw error;
      return data.map(this.mapDbToLeaveRequest);
    } catch (error) {
      console.error('Error fetching all leave requests:', error);
      throw error;
    }
  }

  async getPendingLeaveRequests(): Promise<LeaveRequest[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('status', 'pending')
        .order('applied_at', { ascending: false });

      if (error) throw error;
      return data.map(this.mapDbToLeaveRequest);
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
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          status,
          reviewed_by: reviewedBy,
          reviewed_at: supabase.raw('NOW()'),
          admin_comments: adminComments || ''
        })
        .eq('id', requestId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating leave request status:', error);
      throw error;
    }
  }
}

export const leaveService = new LeaveService();
