import { supabase } from './supabaseClient';
import { Meeting } from '../types';
import { requireAdmin } from './userService';

class MeetingService {
  private readonly MEETINGS_TABLE = 'meetings';
  private readonly ASSIGNMENTS_TABLE = 'meeting_employees';

   private mapDbToMeeting(dbData: unknown): Meeting {
    const data = dbData as Record<string, unknown>;
    return {
      id: data.id as string,
      title: data.title as string,
      description: data.description as string | undefined,
      date: data.date as string,
      time: data.time as string,
      assignedEmployees: (data.employee_ids as string[]) || [],
      createdBy: data.created_by as string,
      createdAt: new Date(data.created_at as string),
      status: data.status as Meeting['status']
    };
  }

  async createMeeting(meetingData: Omit<Meeting, 'id' | 'createdAt' | 'status'>): Promise<Meeting> {
    try {
      // Security: Require admin role
      await requireAdmin();

      // Get authenticated user ID — the true source of truth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Start transaction
      const { data: meeting, error: meetingError } = await supabase
        .from(this.MEETINGS_TABLE)
        .insert({
          title: meetingData.title,
          description: meetingData.description,
          date: meetingData.date,
          time: meetingData.time,
          created_by: user.id, // Server-side authority, never trust client
          status: 'scheduled'
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      // Insert assigned employees if any
      if (meetingData.assignedEmployees && meetingData.assignedEmployees.length > 0) {
        const assignments = meetingData.assignedEmployees.map(employeeId => ({
          meeting_id: meeting.id,
          employee_id: employeeId
        }));

        const { error: assignmentError } = await supabase
          .from(this.ASSIGNMENTS_TABLE)
          .insert(assignments);

        if (assignmentError) throw assignmentError;
      }

      const createdMeeting: Meeting = {
        id: meeting.id,
        ...meetingData,
        createdBy: user.id, // Server-side source of truth; override any client-provided value
        createdAt: new Date(meeting.created_at),
        status: 'scheduled'
      };
      
      return createdMeeting;
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  }

   async getAllMeetings(): Promise<Meeting[]> {
     try {
       const { data, error } = await supabase
         .from(this.MEETINGS_TABLE)
         .select(`
           *,
           meeting_employees (employee_id)
         `)
         .order('created_at', { ascending: false });

       if (error) throw error;

       return data.map(meeting => ({
         id: meeting.id,
         title: meeting.title,
         description: meeting.description,
         date: meeting.date,
         time: meeting.time,
          assignedEmployees: meeting.meeting_employees?.map((a: unknown) => (a as Record<string, unknown>).employee_id as string) || [],
         createdBy: meeting.created_by,
         createdAt: new Date(meeting.created_at),
         status: meeting.status
       }));
     } catch (error) {
       console.error('Error getting all meetings:', error);
       throw error;
     }
   }

  async getMeetingsForEmployee(employeeId: string): Promise<Meeting[]> {
    try {
      // Security: Require admin OR access to own meetings only
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('employees')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.role === 'admin';
      if (!isAdmin && user.id !== employeeId) {
        throw new Error('Not authorized: You can only view your own meetings');
      }

      const { data, error } = await supabase
        .from(this.MEETINGS_TABLE)
        .select(`
          *,
          meeting_employees!inner (employee_id)
        `)
        .eq('meeting_employees.employee_id', employeeId)
        .order('date', { ascending: true });

      if (error) throw error;

      return data.map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        date: meeting.date,
        time: meeting.time,
        assignedEmployees: [],
        createdBy: meeting.created_by,
        createdAt: new Date(meeting.created_at),
        status: meeting.status
      }));
    } catch (error) {
      console.error('Error getting meetings for employee:', error);
      throw error;
    }
  }

  async updateMeetingStatus(meetingId: string, status: Meeting['status']): Promise<void> {
    try {
      // Security: Require admin role
      await requireAdmin();

      const { error } = await supabase
        .from(this.MEETINGS_TABLE)
        .update({ status })
        .eq('id', meetingId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating meeting status:', error);
      throw error;
    }
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    try {
      // Security: Require admin role
      await requireAdmin();

      // Delete assignments first (cascade will handle this but explicit is safe)
      await supabase
        .from(this.ASSIGNMENTS_TABLE)
        .delete()
        .eq('meeting_id', meetingId);

      const { error } = await supabase
        .from(this.MEETINGS_TABLE)
        .delete()
        .eq('id', meetingId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting meeting:', error);
      throw error;
    }
  }

  async updateMeeting(meetingId: string, meetingData: Partial<Omit<Meeting, 'id' | 'createdAt'>>): Promise<void> {
    try {
      // Security: Require admin role
      await requireAdmin();

       const dbUpdates = {};

      if (meetingData.title !== undefined) dbUpdates.title = meetingData.title;
      if (meetingData.description !== undefined) dbUpdates.description = meetingData.description;
      if (meetingData.date !== undefined) dbUpdates.date = meetingData.date;
      if (meetingData.time !== undefined) dbUpdates.time = meetingData.time;
      if (meetingData.status !== undefined) dbUpdates.status = meetingData.status;
      // Note: createdBy is intentionally not updable via this method to preserve ownership integrity

      const { error: meetingError } = await supabase
        .from(this.MEETINGS_TABLE)
        .update(dbUpdates)
        .eq('id', meetingId);

      if (meetingError) throw meetingError;

      // Update assigned employees if provided
      if (meetingData.assignedEmployees !== undefined) {
        // Remove existing assignments
        await supabase
          .from(this.ASSIGNMENTS_TABLE)
          .delete()
          .eq('meeting_id', meetingId);

        // Add new assignments
        if (meetingData.assignedEmployees.length > 0) {
          const assignments = meetingData.assignedEmployees.map(employeeId => ({
            meeting_id: meetingId,
            employee_id: employeeId
          }));

          const { error: assignmentError } = await supabase
            .from(this.ASSIGNMENTS_TABLE)
            .insert(assignments);

          if (assignmentError) throw assignmentError;
        }
      }
    } catch (error) {
      console.error('Error updating meeting:', error);
      throw error;
    }
  }
}

export const meetingService = new MeetingService();
