import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const jwt = authHeader.replace('Bearer ', '')

    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify JWT and get admin user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt)
    
    if (authError || !user) {
      throw new Error('Invalid authentication token')
    }

    // Verify caller is an admin
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('employees')
      .select('role')
      .eq('id', user.id)
      .single()

    if (adminError || adminCheck.role !== 'admin') {
      throw new Error('Not authorized: Only administrators can invite employees')
    }

    // Parse request body
    const { email, name, department, position, designation, employeeId } = await req.json()

    if (!email || !name || !department || !position) {
      throw new Error('Missing required fields: email, name, department, position')
    }

    // Invite user via Supabase Auth
    const { data: authUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          name,
          department,
          position
        },
        redirectTo: Deno.env.get('SITE_URL') || 'http://localhost:5173'
      }
    )

    if (inviteError) {
      throw new Error(`Failed to invite user: ${inviteError.message}`)
    }

    // Create employee record in database
    const { error: dbError } = await supabaseAdmin
      .from('employees')
      .insert({
        id: authUser.user.id,
        uid: authUser.user.id,
        employee_id: employeeId || null,
        name,
        email,
        role: 'employee',
        department,
        position,
        designation: designation || position,
        is_active: true,
        created_at: new Date().toISOString()
      })

    if (dbError) {
      // Rollback auth user if database insert fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      throw new Error(`Failed to create employee profile: ${dbError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Employee invited successfully',
        userId: authUser.user.id
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      }
    )
  }
})