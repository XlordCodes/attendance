-- =============================================
-- AINTRIX ATTENDANCE SYSTEM - SECURITY PATCH
-- Fixes CRITICAL & HIGH severity vulnerabilities
-- Apply this directly in Supabase SQL Editor
-- =============================================

BEGIN;

-- =============================================
-- FIX 1: PRIVILEGE ESCALATION - EMPLOYEES RLS
-- =============================================

-- Drop old insecure policies
DROP POLICY IF EXISTS "Users can update their own profile" ON employees;

-- Create restricted update policy: Users cannot modify role or is_active
CREATE POLICY "Users can update their own profile (non-admin fields)" ON employees
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    (role = old.role OR is_admin()) AND
    (is_active = old.is_active OR is_admin())
  );

-- =============================================
-- FIX 2: INSECURE RPC FUNCTIONS - AUTHORIZATION
-- =============================================

-- Patch clock_in function
CREATE OR REPLACE FUNCTION clock_in(p_user_id UUID, p_date DATE)
RETURNS TABLE (id UUID, login_time TIMESTAMPTZ) AS $$
BEGIN
  -- Authorization check: Only self or admin
  IF p_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO attendance_records (user_id, date, login_time)
  VALUES (p_user_id, p_date, NOW())
  ON CONFLICT (user_id, date) DO UPDATE
  SET login_time = NOW()
  RETURNING attendance_records.id, attendance_records.login_time INTO id, login_time;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Patch clock_out function
CREATE OR REPLACE FUNCTION clock_out(p_user_id UUID, p_date DATE)
RETURNS TABLE (id UUID, logout_time TIMESTAMPTZ) AS $$
BEGIN
  -- Authorization check: Only self or admin
  IF p_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE attendance_records
  SET logout_time = NOW()
  WHERE user_id = p_user_id AND date = p_date
  RETURNING attendance_records.id, attendance_records.logout_time INTO id, logout_time;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Patch start_break function
CREATE OR REPLACE FUNCTION start_break(p_attendance_record_id UUID)
RETURNS TABLE (id UUID, start TIMESTAMPTZ) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Verify ownership of attendance record
  SELECT user_id INTO v_user_id 
  FROM attendance_records 
  WHERE id = p_attendance_record_id;

  -- Authorization check: Only owner or admin
  IF v_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO attendance_breaks (attendance_record_id, start)
  VALUES (p_attendance_record_id, NOW())
  RETURNING attendance_breaks.id, attendance_breaks.start INTO id, start;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Patch end_break function
CREATE OR REPLACE FUNCTION end_break(p_break_id UUID)
RETURNS TABLE (id UUID, "end" TIMESTAMPTZ) AS $$
DECLARE
  v_attendance_record_id UUID;
  v_user_id UUID;
BEGIN
  -- Verify ownership of break record
  SELECT attendance_record_id INTO v_attendance_record_id
  FROM attendance_breaks
  WHERE id = p_break_id;

  SELECT user_id INTO v_user_id
  FROM attendance_records
  WHERE id = v_attendance_record_id;

  -- Authorization check: Only owner or admin
  IF v_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE attendance_breaks
  SET "end" = NOW()
  WHERE id = p_break_id
  RETURNING attendance_breaks.id, attendance_breaks."end" INTO id, "end";
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FIX 3: ATTENDANCE MASS ASSIGNMENT PROTECTION
-- =============================================

-- Drop old insecure update policy
DROP POLICY IF EXISTS "Users can update their own attendance" ON attendance_records;

-- Restricted update policy: Users cannot modify timestamps directly
CREATE POLICY "Users can update their own attendance (limited fields)" ON attendance_records
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    (login_time = old.login_time OR is_admin()) AND
    (logout_time = old.logout_time OR is_admin()) AND
    (worked_hours = old.worked_hours OR is_admin())
  );

COMMIT;

-- =============================================
-- SECURITY PATCH COMPLETE
-- All CRITICAL & HIGH vulnerabilities remediated
-- =============================================