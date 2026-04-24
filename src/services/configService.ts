import { supabase } from './supabaseClient';
import { requireAdmin } from './userService';

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
  updated_by?: string;
  updated_at: string;
}

class ConfigService {
  private readonly TABLE_NAME = 'working_hours_config';
  private cache: WorkingHoursDBConfig | null = null;

   /**
    * Fetch the current working hours configuration from the database.
    * Caches the result. Call clearCache() to force refresh.
    * Returns null if config is not found (e.g., unauthenticated or missing row).
    */
   async getWorkingHoursConfig(): Promise<WorkingHoursDBConfig | null> {
     if (this.cache) {
       return this.cache;
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

     this.cache = data as WorkingHoursDBConfig;
     return this.cache;
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

    this.cache = data as WorkingHoursDBConfig;
    return this.cache;
  }

  /** Clear the cached configuration. Call after external updates if needed. */
  clearCache(): void {
    this.cache = null;
  }
}

export const configService = new ConfigService();
export default configService;
