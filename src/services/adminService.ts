import { supabase } from '../services/supabaseClient';

/**
 * Invoke the admin-reset-password Edge Function.
 * The caller's JWT is forwarded automatically via supabase-client auth headers.
 */
export async function forceResetPassword(targetUserId: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.functions.invoke('admin-reset-password', {
    body: { targetUserId, newPassword },
  });

  if (error) {
    throw new Error(error.message || 'Failed to invoke password reset');
  }

  return data as { success: boolean; message: string };
}
