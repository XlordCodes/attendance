import { createClient } from '@supabase/supabase-js';

// ✅ Remove unsafe type casting - use actual runtime values from Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 🔒 Strict runtime validation that works correctly after Vite static replacement
if (!supabaseUrl || typeof supabaseUrl !== 'string' || supabaseUrl.trim().length === 0) {
  throw new Error('Missing or invalid VITE_SUPABASE_URL environment variable. Ensure this variable is set before building.');
}

if (!supabaseAnonKey || typeof supabaseAnonKey !== 'string' || supabaseAnonKey.trim().length === 0) {
  throw new Error('Missing or invalid VITE_SUPABASE_ANON_KEY environment variable. Ensure this variable is set before building.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export default supabase;
