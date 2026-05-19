/**
 * Supabase Edge Function: Admin Force Password Reset
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  autoRefreshToken: false,
  persistSession: false,
});

interface RequestBody {
  targetUserId: string;
  newPassword: string;
}

async function verifyAdmin(authHeader: string | null): Promise<{ id: string; role: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, role')
    .eq('id', data.user.id)
    .single();

  if (empError || !employee || employee.role !== 'admin') {
    return null;
  }

  return employee as { id: string; role: string };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FIX: Actually start the server using Deno.serve!
Deno.serve(async (req: Request) => {
  // ── CORS ─────────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // ── 1. Verify Admin ──────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    const caller = await verifyAdmin(authHeader);

    if (!caller) {
      return new Response(JSON.stringify({ error: 'Forbidden — admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Parse Body ────────────────────────────────────────────────────
    const body = (await req.json()) as RequestBody;
    const { targetUserId, newPassword } = body;

    if (!targetUserId || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: targetUserId, newPassword' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (caller.id === targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Admins cannot reset their own password via this endpoint' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 4. Force Reset via Admin Client ───────────────────────────────────
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      targetUserId,
      {
        password: newPassword,
        email_confirm: true,
      }
    );

    if (updateError) {
      console.error('Password reset failed:', updateError);
      return new Response(
        JSON.stringify({ error: `Failed to reset password: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 5. Audit Log ───────────────────────────────────────────────────────
    try {
      await supabase.from('notifications').insert({
        triggered_by: caller.id,
        target_role: 'admin',
        type: 'password_reset',
        message: `Admin ${caller.id} force-reset password for user ${targetUserId}`,
      });
    } catch {
      /* audit log failure is non-fatal */
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password reset successfully',
        userId: targetUserId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unexpected error in admin-reset-password:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});