import { supabase } from './supabaseClient';
import { requireAdmin } from './userService';
import type { RoleSchedule } from '../types';

// Interface matching the working_hours_config table columns (snake_case)
export interface WorkingHoursDBConfig {
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  standard_work_hours: number;
  lunch_start_hour: number;
  lunch_start_minute: number;
  lunch_end_hour: number;
  lunch_end_minute: number;
  overtime_threshold: number;
  require_ip_match: boolean;
  require_geo_match: boolean;
  updated_by?: string;
  updated_at: string;
}

let cachedConfig: WorkingHoursDBConfig | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 300000; // 5 minutes

class ConfigService {
  private readonly TABLE_NAME = 'working_hours_config';

  /**
   * Fetch the current working hours configuration from the database.
   * Caches the result. Call clearCache() to force refresh.
   * Returns null if config is not found (e.g., unauthenticated or missing row).
   */
  async getWorkingHoursConfig(): Promise<WorkingHoursDBConfig | null> {
    const now = Date.now();
    if (cachedConfig && (now - lastFetchTime < CACHE_TTL)) {
      return cachedConfig;
    }

    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch working hours config:', error);
      return null;
    }

    if (!data) {
      // No config visible (likely due to RLS for unauthenticated users)
      return null;
    }

    cachedConfig = data as WorkingHoursDBConfig;
    lastFetchTime = Date.now();
    return cachedConfig;
  }

  /**
   * Update working hours configuration. Only admins can call this.
   * @param updates Partial fields to update
   * @returns The updated configuration record
   * @throws Error if not admin or update fails
   */
  async updateWorkingHoursConfig(
    updates: Partial<WorkingHoursDBConfig>
  ): Promise<WorkingHoursDBConfig> {
    // Security: Only admins can update system configuration
    await requireAdmin();

    // Get current user for audit
    const { data: { user } } = await supabase.auth.getUser();
    const updatedBy = user?.id || null;

    const { data, error } = await supabase
      .from(this.TABLE_NAME)
      .update({
        ...updates,
        updated_by: updatedBy
      })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      console.error('Failed to update working hours config:', error);
      throw error;
    }

    cachedConfig = data as WorkingHoursDBConfig;
    lastFetchTime = Date.now();
    return cachedConfig;
  }

  /** Clear the cached configuration. Call after external updates if needed. */
  clearCache(): void {
    cachedConfig = null;
    lastFetchTime = 0;
  }

  /**
   * PHASE 1: Get schedule for a specific role from role_schedules table.
   * Returns null if role not found or error occurs.
   */
  async getScheduleByRole(role: string): Promise<RoleSchedule | null> {
    try {
      const { data, error } = await supabase
        .from('role_schedules')
        .select('*')
        .eq('role', role)
        .maybeSingle();

      if (error) {
        console.error(`Failed to fetch schedule for role "${role}":`, error);
        return null;
      }

      if (!data) {
        console.warn(`No schedule found for role "${role}", returning null`);
        return null;
      }

      return {
        role: data.role,
        start_hour: data.start_hour,
        start_minute: data.start_minute,
        end_hour: data.end_hour,
        end_minute: data.end_minute,
        standard_work_hours: data.standard_work_hours,
        lunch_start_hour: data.lunch_start_hour,
        lunch_start_minute: data.lunch_start_minute,
        lunch_end_hour: data.lunch_end_hour,
        lunch_end_minute: data.lunch_end_minute,
        overtime_threshold: data.overtime_threshold,
        restDays: data.restDays,
      };
    } catch (error) {
      console.error(`Error fetching schedule for role "${role}":`, error);
      return null;
    }
  }

  /**
   * PHASE 3: Update role-specific schedule in role_schedules table.
   * Only admins can call this.
   */
  async updateRoleSchedule(role: string, updates: Partial<RoleSchedule>): Promise<RoleSchedule> {
    await requireAdmin();

    const { data, error } = await supabase
      .from('role_schedules')
      .update(updates)
      .eq('role', role)
      .select()
      .single();

    if (error) {
      console.error(`Failed to update schedule for role "${role}":`, error);
      throw error;
    }

    if (!data) {
      throw new Error(`No schedule found for role "${role}" after update`);
    }

    return {
      role: data.role,
      start_hour: data.start_hour,
      start_minute: data.start_minute,
      end_hour: data.end_hour,
      end_minute: data.end_minute,
      standard_work_hours: data.standard_work_hours,
      lunch_start_hour: data.lunch_start_hour,
      lunch_start_minute: data.lunch_start_minute,
      lunch_end_hour: data.lunch_end_hour,
      lunch_end_minute: data.lunch_end_minute,
      overtime_threshold: data.overtime_threshold,
      restDays: data.restDays,
    };
  }
}

export const configService = new ConfigService();
export default configService;
