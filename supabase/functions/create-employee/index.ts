import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

// These CORS headers are mandatory to prevent the browser from blocking the request
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Get authorization header from request (admin-only)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const jwt = authHeader.replace('Bearer ', '')

    // 3. Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Verify JWT and get admin user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt)

    if (authError || !user) {
      throw new Error('Invalid authentication token')
    }

    // 5. Verify caller is an admin
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('employees')
      .select('role')
      .eq('id', user.id)
      .single()

    if (adminError || adminCheck?.role !== 'admin') {
      throw new Error('Not authorized: Only administrators can create employees')
    }

    // 6. Parse the incoming employee data (including password)
    const { employeeData } = await req.json()

    // Validate required fields
    const { email, password, name, department, position, employeeId, role = 'employee', designation } = employeeData

    if (!email || !password || !name || !department || !position) {
      throw new Error('Missing required fields: email, password, name, department, position')
    }

    // 7. Create the user in Auth with explicit password
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm to skip email verification
      user_metadata: { name, role, employee_id: employeeId }
    })

    if (createAuthError) throw createAuthError

    const userId = authData.user.id

    // 8. Insert the employee record in the database
    const { error: dbError } = await supabaseAdmin
      .from('employees')
      .insert({
        id: userId,
        uid: userId,
        employee_id: employeeId || null,
        name,
        email,
        role: role === 'admin' ? 'admin' : 'employee',
        department,
        position,
        designation: designation || position,
        is_active: true,
        created_at: new Date().toISOString()
      })

    // 9. Rollback: delete the Auth user if DB insert fails
    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw new Error(`Failed to create employee profile: ${dbError.message}`)
    }

    // 10. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Employee created successfully',
        userId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})