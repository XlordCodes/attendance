import { supabase } from './supabaseClient';
import { Meeting } from '../types';

class MeetingService {
  private readonly MEETINGS_TABLE = 'meetings';
  private readonly ASSIGNMENTS_TABLE = 'meeting_employees';

  private mapDbToMeeting(dbData: any): Meeting {
    return {
      id: dbData.id,
      title: dbData.title,
      description: dbData.description,
      date: dbData.date,
      time: dbData.time,
      assignedEmployees: dbData.employee_ids || [],
      createdBy: dbData.created_by,
      createdAt: new Date(dbData.created_at),
      status: dbData.status
    };
  }

  async createMeeting(meetingData: Omit<Meeting, 'id' | 'createdAt' | 'status'>): Promise<Meeting> {
    try {
      // Start transaction
      const { data: meeting, error: meetingError } = await supabase
        .from(this.MEETINGS_TABLE)
        .insert({
          title: meetingData.title,
          description: meetingData.description,
          date: meetingData.date,
          time: meetingData.time,
          created_by: meetingData.createdBy,
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
        assignedEmployees: meeting.meeting_employees?.map((a: any) => a.employee_id) || [],
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
      const dbUpdates: any = {};
      
      if (meetingData.title !== undefined) dbUpdates.title = meetingData.title;
      if (meetingData.description !== undefined) dbUpdates.description = meetingData.description;
      if (meetingData.date !== undefined) dbUpdates.date = meetingData.date;
      if (meetingData.time !== undefined) dbUpdates.time = meetingData.time;
      if (meetingData.status !== undefined) dbUpdates.status = meetingData.status;
      if (meetingData.createdBy !== undefined) dbUpdates.created_by = meetingData.createdBy;

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
