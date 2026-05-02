import { supabase } from './supabaseClient';
import { LeaveRequest } from '../types';
import { requireAdmin } from './userService';

class LeaveService {
  private readonly TABLE_NAME = 'leave_requests';

  private mapDbToLeaveRequest(dbData: unknown): LeaveRequest {
    const data = dbData as Record<string, unknown>;
    return {
      id: data.id as string,
      employeeId: data.employee_id as string,
      employeeName: data.employee_name as string,
      employeeEmail: data.employee_email as string | undefined,
      leaveType: data.leave_type as LeaveRequest['leaveType'],
      startDate: data.start_date as string,
      endDate: data.end_date as string,
      reason: data.reason as string,
      status: data.status as LeaveRequest['status'],
      appliedAt: new Date(data.applied_at as string),
      requestedAt: data.applied_at as string,
      reviewedAt: data.reviewed_at ? new Date(data.reviewed_at as string) : undefined,
      reviewedBy: data.reviewed_by as string | undefined,
      adminComments: data.admin_comments as string | undefined
    };
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
    reviewedBy: string, // Note: client-provided, ignored — server uses authenticated user
    adminComments?: string
   ): Promise<LeaveRequest> {
    try {
      // Security: Require admin role
      await requireAdmin();

      // Authenticated user is the reviewer — never trust client-supplied reviewedBy
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

       const updateData = {
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      };
      if (adminComments !== undefined) updateData.admin_comments = adminComments;

      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating leave request status:', error);
      throw error;
    }
  }
}

export const leaveService = new LeaveService();
