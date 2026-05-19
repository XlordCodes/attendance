-- ============================================================================
-- Migration: Add role_schedules table and employee contact fields
-- Date: 2026-05-13
-- Phase: 1 — Role-Based Attendance Migration
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add new columns to employees table (idempotent)
-- ----------------------------------------------------------------------------
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS personal_email TEXT;

-- ----------------------------------------------------------------------------
-- 2. Create role_schedules table (idempotent)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_schedules (
  id SERIAL PRIMARY KEY DEFAULT 1,
  role VARCHAR(50) UNIQUE NOT NULL,
  start_hour INT NOT NULL DEFAULT 10,
  start_minute INT NOT NULL DEFAULT 0,
  end_hour INT NOT NULL DEFAULT 20,
  end_minute INT NOT NULL DEFAULT 0,
  standard_work_hours NUMERIC(5,2) NOT NULL DEFAULT 10,
  lunch_start_hour INT NOT NULL DEFAULT 14,
  lunch_start_minute INT NOT NULL DEFAULT 0,
  lunch_end_hour INT NOT NULL DEFAULT 15,
  lunch_end_minute INT NOT NULL DEFAULT 0,
  overtime_threshold NUMERIC(5,2) NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. Insert default schedule rows for all roles (upsert – safe to re-run)
-- ----------------------------------------------------------------------------
INSERT INTO role_schedules (role, start_hour, start_minute, end_hour, end_minute,
  standard_work_hours, lunch_start_hour, lunch_start_minute,
  lunch_end_hour, lunch_end_minute, overtime_threshold)
VALUES
  ('admin',   10, 0, 20, 0, 10, 14, 0, 15, 0, 10),
  ('core',    10, 0, 20, 0, 10, 14, 0, 15, 0, 10),
  ('employee',10, 0, 20, 0, 10, 14, 0, 15, 0, 10),
  ('trainee', 10, 0, 20, 0, 10, 14, 0, 15, 0, 10),
  ('intern',  10, 0, 20, 0, 10, 14, 0, 15, 0, 10)
ON CONFLICT (role) DO UPDATE SET
  start_hour = EXCLUDED.start_hour,
  start_minute = EXCLUDED.start_minute,
  end_hour = EXCLUDED.end_hour,
  end_minute = EXCLUDED.end_minute,
  standard_work_hours = EXCLUDED.standard_work_hours,
  lunch_start_hour = EXCLUDED.lunch_start_hour,
  lunch_start_minute = EXCLUDED.lunch_start_minute,
  lunch_end_hour = EXCLUDED.lunch_end_hour,
  lunch_end_minute = EXCLUDED.lunch_end_minute,
  overtime_threshold = EXCLUDED.overtime_threshold,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 4. Add trigger for updated_at (safe to create multiple times)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_role_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_role_schedules_updated_at ON role_schedules;
CREATE TRIGGER update_role_schedules_updated_at
  BEFORE UPDATE ON role_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_role_schedules_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Enable RLS on role_schedules
-- ----------------------------------------------------------------------------
ALTER TABLE role_schedules ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admins_role_schedules_full_access" ON role_schedules
  FOR ALL USING (is_admin());

-- Authenticated employees: read-only access to all schedules (for display/info)
CREATE POLICY "employees_view_role_schedules" ON role_schedules
  FOR SELECT USING (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- 6. RPC: get_role_schedule(role TEXT) — fetches schedule for a given role
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_role_schedule(p_role TEXT)
RETURNS TABLE (
  role VARCHAR,
  start_hour INT,
  start_minute INT,
  end_hour INT,
  end_minute INT,
  standard_work_hours NUMERIC,
  lunch_start_hour INT,
  lunch_start_minute INT,
  lunch_end_hour INT,
  lunch_end_minute INT,
  overtime_threshold NUMERIC
) AS $$
BEGIN
  IF NOT is_admin() AND auth.role() != 'authenticated' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    rs.role,
    rs.start_hour,
    rs.start_minute,
    rs.end_hour,
    rs.end_minute,
    rs.standard_work_hours,
    rs.lunch_start_hour,
    rs.lunch_start_minute,
    rs.lunch_end_hour,
    rs.lunch_end_minute,
    rs.overtime_threshold
  FROM role_schedules rs
  WHERE rs.role = p_role
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_role_schedule(TEXT) TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
