import { supabase } from './supabaseClient';
import type { Employee } from '../types';

/**
 * Security: Get current authenticated user's role
 * @returns 'admin' | 'employee' | null
 */
export const getCurrentUserRole = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('employees')
      .select('role')
      .eq('id', user.id)
      .single();

    return data?.role || null;
  } catch {
    return null;
  }
};

/**
 * Security: Require current user to be admin, throw if not
 * @throws {Error} if user is not an admin
 */
export const requireAdmin = async (): Promise<void> => {
  const role = await getCurrentUserRole();
  if (role !== 'admin') {
    throw new Error('Not authorized: Administrator access required');
  }
};

/**
 * Security: Check if current user is admin
 * @returns true if user is admin, false otherwise
 */
export const isAdmin = async (): Promise<boolean> => {
  const role = await getCurrentUserRole();
  return role === 'admin';
};

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    clockInReminder: boolean;
    clockOutReminder: boolean;
    breakReminder: boolean;
    weeklyReport: boolean;
    sound: boolean;
  };
  workPreferences: {
    defaultBreakDuration: number;
    timezone: string;
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    timeFormat: '12h' | '24h';
  };
  privacy: {
    shareLocation: boolean;
    trackProductivity: boolean;
  };
  language: string;
}

class UserService {
  private readonly TABLE_NAME = 'employees';

  private generateSecurePassword(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

   async createUser(userData: Omit<Employee, 'id' | 'createdAt'> & { password: string }): Promise<Employee> {
    try {
      // Security: BFLA Protection - Only admins can create users
      const currentRole = await getCurrentUserRole();
      if (currentRole !== 'admin') {
        throw new Error('Not authorized: Only administrators can create users');
      }

      // Get current admin session for Authorization header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Missing authentication token. Please log in again.');
      }

      // Invoke create-employee edge function with password support
      const { data, error } = await supabase.functions.invoke('create-employee', {
        body: {
          employeeData: {
            ...userData,
            // Ensure role is set correctly
            role: userData.role || 'employee'
          }
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || data.message || 'Failed to create employee');
      }

      // Fetch the created employee from DB to return full Employee object
      const { data: emp, error: fetchError } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', data.userId)
        .single();

      if (fetchError || !emp) {
        console.error('Failed to fetch created employee:', fetchError);
        throw new Error('Employee created but could not be retrieved from database');
      }

      return this.mapDbToEmployee(emp);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

   async updateUser(id: string, updates: Partial<Employee>): Promise<void> {
     try {
       const currentRole = await getCurrentUserRole();
       const isAdmin = currentRole === 'admin';
       
        const dbUpdates = {};
       
       // Non-admin mutable fields (self-service)
       if (updates.name !== undefined) dbUpdates.name = updates.name;
       if (updates.department !== undefined) dbUpdates.department = updates.department;
       if (updates.position !== undefined) dbUpdates.position = updates.position;
       if (updates.designation !== undefined) dbUpdates.designation = updates.designation;
       if (updates.joinDate !== undefined) dbUpdates.join_date = updates.joinDate;
       
       // Immutable fields: employee_id cannot be changed through this interface
       // (database trigger prevents non-admin changes; admins should use dedicated function if ever needed)
       // Note: updates.employeeId is intentionally ignored to prevent mass assignment

       // Admin-only fields
       if (isAdmin) {
         if (updates.role !== undefined) dbUpdates.role = updates.role;
         if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
         if (updates.email !== undefined) dbUpdates.email = updates.email;
         // Admins may change employee_id with caution (though typically immutable)
         if (updates.employeeId !== undefined) dbUpdates.employee_id = updates.employeeId;
         if (updates.lastLogin !== undefined) dbUpdates.last_login = updates.lastLogin;
       }

       const { error } = await supabase
         .from(this.TABLE_NAME)
         .update(dbUpdates)
         .eq('id', id);

       if (error) throw error;
     } catch (error) {
       console.error('Error updating user:', error);
       throw error;
     }
   }

  async deleteUser(id: string): Promise<void> {
    try {
      // Security: BFLA Protection - Only admins can delete users
      const currentRole = await getCurrentUserRole();
      if (currentRole !== 'admin') {
        throw new Error('Not authorized: Only administrators can delete users');
      }

      // Delete from database first
      const { error: dbError } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // Delete from Supabase Auth
      const { error: authError } = await supabase.auth.admin.deleteUser(id);
      if (authError) console.warn('User deleted from DB but not from Auth:', authError);

    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  private mapDbToEmployee(dbData: unknown): Employee {
    const data = dbData as Record<string, unknown>;
    return {
      id: data.id as string,
      uid: (data.uid as string | undefined) || (data.id as string),
      employeeId: data.employee_id as string | undefined,
      name: data.name as string,
      Name: data.name as string,
      email: data.email as string,
      role: data.role as 'employee' | 'admin',
      department: data.department as string,
      position: data.position as string,
      designation: data.designation as string | undefined,
      Designation: data.designation as string | undefined,
      isActive: data.is_active as boolean,
      joinDate: data.join_date as string | undefined,
      createdAt: new Date(data.created_at as string),
      lastLogin: data.last_login ? new Date(data.last_login as string) : undefined
    };
  }

  async getAllUsers(): Promise<Employee[]> {
    try {
      // Security: BFLA Protection - Only admins can view all users
      const currentRole = await getCurrentUserRole();
      if (currentRole !== 'admin') {
        throw new Error('Not authorized: Only administrators can view all users');
      }

      console.log('📋 Fetching all users from database...');
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const users = data.map(this.mapDbToEmployee);
      
      console.log(`👥 Found ${users.length} users in database:`, users.map(u => ({
        id: u.id,
        name: u.name || u.Name,
        email: u.email,
        role: u.role,
        isActive: u.isActive
      })));
      
      return users;
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<Employee | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        throw error;
      }

      return this.mapDbToEmployee(data);
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<Employee | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('email', email)
        .limit(1);

      if (error) throw error;
      if (data.length === 0) return null;

      return this.mapDbToEmployee(data[0]);
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  async getUsersByRole(role: 'admin' | 'employee'): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('role', role)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(this.mapDbToEmployee);
    } catch (error) {
      console.error('Error getting users by role:', error);
      throw error;
    }
  }

  async getUsersByDepartment(department: string): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('department', department)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(this.mapDbToEmployee);
    } catch (error) {
      console.error('Error getting users by department:', error);
      throw error;
    }
  }

  async getActiveUsers(): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(this.mapDbToEmployee);
    } catch (error) {
      console.error('Error getting active users:', error);
      throw error;
    }
  }

  async setUserActiveStatus(id: string, isActive: boolean): Promise<void> {
    try {
      await this.updateUser(id, { isActive });
    } catch (error) {
      console.error('Error setting user active status:', error);
      throw error;
    }
  }

  // Alias for getAllUsers to maintain compatibility
  async getAllEmployees(): Promise<Employee[]> {
    return this.getAllUsers();
  }

  // Cleanup user documents by removing password fields and other sensitive data
  async cleanupUserDocuments(): Promise<void> {
    try {
      console.log('🧹 Starting user document cleanup...');
      
      // In Supabase we don't store passwords in user records
      // This function now ensures proper field structure
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('id, designation, Designation, is_active');

      if (error) throw error;

      let cleanedCount = 0;

      for (const user of data) {
        const updates = {};
        
        // Ensure proper field structure
        if (user.is_active === undefined || user.is_active === null) {
          updates.is_active = true;
        }

        // Fix designation field naming
        if (user.Designation && !user.designation) {
          updates.designation = user.Designation;
        }

        if (Object.keys(updates).length > 0) {
          await supabase
            .from(this.TABLE_NAME)
            .update(updates)
            .eq('id', user.id);
          cleanedCount++;
          console.log(`✅ Cleaned document: ${user.id}`);
        }
      }
      
      console.log(`🎉 Cleanup completed! ${cleanedCount} documents cleaned out of ${data.length} total.`);
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      throw error;
    }
  }

  // Verify that all users have proper designation field
  async verifyDesignationFix(): Promise<void> {
    try {
      console.log('🔍 Verifying designation fields...');
      
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('id, name, designation, Designation');

      if (error) throw error;

      let fixedCount = 0;

      for (const user of data) {
        // Check if designation field needs fixing
        if (user.Designation && !user.designation) {
          await supabase
            .from(this.TABLE_NAME)
            .update({ designation: user.Designation })
            .eq('id', user.id);
          fixedCount++;
          console.log(`✅ Fixed designation for: ${user.name || user.id}`);
        }
      }
      
      console.log(`🎉 Designation verification completed! ${fixedCount} documents fixed.`);
    } catch (error) {
      console.error('❌ Error during designation verification:', error);
      throw error;
    }
  }

  // Get user statistics
  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    admins: number;
    employees: number;
    departments: string[];
  }> {
    try {
      const users = await this.getAllUsers();
      
      const stats = {
        total: users.length,
        active: users.filter(u => u.isActive !== false).length,
        inactive: users.filter(u => u.isActive === false).length,
        admins: users.filter(u => u.role === 'admin').length,
        employees: users.filter(u => u.role === 'employee').length,
        departments: [...new Set(users.map(u => u.department).filter(Boolean))]
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  async updateUserSettings(userId: string, settings: UserSettings): Promise<void> {
    try {
      const currentRole = await getCurrentUserRole();
      const isAdmin = currentRole === 'admin';

      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      if (!currentUserId) {
        throw new Error('Not authenticated');
      }

      if (!isAdmin && userId !== currentUserId) {
        throw new Error('Not authorized: Can only update your own settings');
      }

      if (!isAdmin) {
        // Non-admins: use RPC to update only their own settings safely
        const { error } = await supabase.rpc('update_own_settings', {
          p_settings: settings
        }).single();
        if (error) throw error;
        return;
      }

      // Admins: direct update allowed via admin RLS policy
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }
}

// Standalone helper functions (operate independently of UserService class)
// They are exported above the class instantiation to avoid circular reference issues.
export const userService = new UserService();
export default userService;
