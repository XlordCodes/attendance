-- ============================================================================
-- Migration: Add working_hours_config table for dynamic working hours
-- Date: 2026-04-24
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create the working_hours_config table (idempotent)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS working_hours_config (
    id INT PRIMARY KEY DEFAULT 1,
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
    updated_by UUID REFERENCES employees(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default row if not present
INSERT INTO working_hours_config (id)
VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Add trigger for updated_at (safe to create multiple times)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_working_hours_config_updated_at ON working_hours_config;
CREATE TRIGGER update_working_hours_config_updated_at
    BEFORE UPDATE ON working_hours_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 3. Enable RLS on the new table
-- ----------------------------------------------------------------------------
ALTER TABLE working_hours_config ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 4. RLS Policies for working_hours_config
-- ----------------------------------------------------------------------------
-- Admin: Full unrestricted access
CREATE POLICY "admins_working_hours_full_access" ON working_hours_config
    FOR ALL USING (is_admin());

-- Authenticated employees: Read-only access
CREATE POLICY "employees_view_working_hours" ON working_hours_config
    FOR SELECT USING (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- 5. RPC: get_working_hours (optional convenience function)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_working_hours()
RETURNS TABLE (
    start_hour INT, start_minute INT,
    end_hour INT, end_minute INT,
    standard_work_hours NUMERIC,
    lunch_start_hour INT, lunch_start_minute INT,
    lunch_end_hour INT, lunch_end_minute INT,
    overtime_threshold NUMERIC,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    IF NOT is_admin() AND auth.role() != 'authenticated' THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    RETURN QUERY
    SELECT
        w.start_hour, w.start_minute,
        w.end_hour, w.end_minute,
        w.standard_work_hours,
        w.lunch_start_hour, w.lunch_start_minute,
        w.lunch_end_hour, w.lunch_end_minute,
        w.overtime_threshold,
        w.updated_at
    FROM working_hours_config w
    WHERE w.id = 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_working_hours() TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
