-- ============================================================================
-- AINTRIX Attendance Management System
-- Supabase Database Initialization Schema
-- COMPLETE REBUILD: Drops ALL existing objects before creating fresh schema
-- ============================================================================

-- ============================================================================
-- PHASE 1: DROP EVERYTHING (Clean Slate)
-- ============================================================================
-- NOTE: The DROP TABLE ... CASCADE statements below will automatically remove
-- all dependent objects (policies, triggers, constraints, indexes). No need to
-- drop them explicitly beforehand. Starting fresh with table drops.

-- Drop all functions (RPCs and helpers) - order matters for dependencies
-- Drop dependent functions first
DROP FUNCTION IF EXISTS update_attendance_record(
    UUID, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ,
    BOOLEAN, BOOLEAN, NUMERIC, TEXT, TEXT, TEXT, JSONB, JSONB, VARCHAR
) CASCADE;
DROP FUNCTION IF EXISTS clock_in(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS clock_out(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
-- Drop any other functions that might depend on types (defensive)
DROP FUNCTION IF EXISTS get_user_role() CASCADE;
DROP FUNCTION IF EXISTS get_employee_role() CASCADE;

-- Drop all tables (order matters due to foreign keys)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS meeting_employees CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS attendance_breaks CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS working_hours_config CASCADE;

-- Drop custom types (must come after tables since tables depend on them)
DROP TYPE IF EXISTS notification_priority CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS meeting_status CASCADE;
DROP TYPE IF EXISTS leave_status CASCADE;
DROP TYPE IF EXISTS leave_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- ============================================================================
-- PHASE 2: EXTENSIONS
-- ============================================================================
-- PHASE 2: EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PHASE 3: CUSTOM TYPES (ENUMS)
-- ============================================================================
CREATE TYPE user_role AS ENUM ('employee', 'admin');
CREATE TYPE leave_type AS ENUM ('sick', 'vacation', 'personal', 'emergency', 'other');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE meeting_status AS ENUM ('scheduled', 'completed', 'cancelled');
CREATE TYPE notification_type AS ENUM ('early_logout', 'overtime', 'system');
CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high');

-- ============================================================================
-- PHASE 4: TABLE CREATION (DDL)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EMPLOYEES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid UUID UNIQUE,
    employee_id VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'employee',
    department VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    designation VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    join_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    settings JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_uid ON employees(uid);
CREATE INDEX idx_employees_role ON employees(role);

-- ----------------------------------------------------------------------------
-- ATTENDANCE_RECORDS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    login_time TIMESTAMPTZ,
    logout_time TIMESTAMPTZ,
    lunch_start TIMESTAMPTZ,
    lunch_end TIMESTAMPTZ,
    is_late BOOLEAN NOT NULL DEFAULT false,
    is_late_from_lunch BOOLEAN NOT NULL DEFAULT false,
    worked_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
    late_reason TEXT DEFAULT '',
    lunch_late_reason TEXT DEFAULT '',
    early_logout_reason TEXT,
    audit_data JSONB,
    location JSONB,
    client_ip VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_employee_date UNIQUE (user_id, date),
    CONSTRAINT hours_non_negative CHECK (worked_hours >= 0),
    CONSTRAINT logout_after_login CHECK (logout_time IS NULL OR logout_time >= login_time),
    CONSTRAINT login_time_not_far_future CHECK (login_time IS NULL OR login_time <= NOW() + INTERVAL '1 hour'),
    CONSTRAINT lunch_end_after_start CHECK (lunch_end IS NULL OR lunch_end >= lunch_start)
);

CREATE INDEX idx_attendance_user_id ON attendance_records(user_id);
CREATE INDEX idx_attendance_date ON attendance_records(date);
CREATE INDEX idx_attendance_user_date ON attendance_records(user_id, date DESC);
CREATE INDEX idx_attendance_login ON attendance_records(login_time) WHERE login_time IS NOT NULL;
CREATE INDEX idx_attendance_logout ON attendance_records(logout_time) WHERE logout_time IS NOT NULL;

-- ----------------------------------------------------------------------------
-- ATTENDANCE_BREAKS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE attendance_breaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
    "start" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "end" TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT end_after_start CHECK ("end" IS NULL OR "end" >= "start")
);

CREATE INDEX idx_breaks_attendance_id ON attendance_breaks(attendance_record_id);
CREATE INDEX idx_breaks_start ON attendance_breaks("start");

-- ----------------------------------------------------------------------------
-- LEAVE_REQUESTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    reviewed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    employee_name VARCHAR(255) NOT NULL,
    employee_email VARCHAR(255) NOT NULL,
    leave_type leave_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status leave_status NOT NULL DEFAULT 'pending',
    reviewed_at TIMESTAMPTZ,
    admin_comments TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dates_logical CHECK (end_date >= start_date)
);

CREATE INDEX idx_leave_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_employee_email ON leave_requests(employee_email);
CREATE INDEX idx_leave_status ON leave_requests(status);
CREATE INDEX idx_leave_dates ON leave_requests(start_date, end_date);
CREATE INDEX idx_leave_reviewed_by ON leave_requests(reviewed_by);

-- ----------------------------------------------------------------------------
-- MEETINGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time VARCHAR(20) NOT NULL,
    status meeting_status NOT NULL DEFAULT 'scheduled',
    created_by UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meetings_created_by ON meetings(created_by);
CREATE INDEX idx_meetings_date ON meetings(date);
CREATE INDEX idx_meetings_status ON meetings(status);

-- ----------------------------------------------------------------------------
-- MEETING_EMPLOYEES (Join Table)
-- ----------------------------------------------------------------------------
CREATE TABLE meeting_employees (
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    PRIMARY KEY (meeting_id, employee_id)
);

CREATE INDEX idx_meeting_employees_employee ON meeting_employees(employee_id);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority notification_priority NOT NULL DEFAULT 'medium',
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_employee ON notifications(employee_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ----------------------------------------------------------------------------
-- WORKING_HOURS_CONFIG TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE working_hours_config (
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

-- Insert the default single row
INSERT INTO working_hours_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PHASE 5: HELPER FUNCTIONS & RPCs
-- ============================================================================

-- Generic updated_at helper (used by multiple triggers)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Authorization helper function
-- SECURITY DEFINER: bypasses RLS to prevent recursion when called from RLS policies
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM employees
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RPC: Clock In (atomic upsert with server timestamp)
CREATE OR REPLACE FUNCTION clock_in(p_user_id UUID, p_date DATE)
RETURNS attendance_records AS $$
DECLARE
    result attendance_records%ROWTYPE;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Authorization: must be admin or the same user
    IF NOT is_admin() AND auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Not authorized to clock in for this user';
    END IF;

    -- Non-admins: restrict date to today or yesterday only (prevent back-dating)
    IF NOT is_admin() THEN
        IF p_date NOT IN (v_today, v_today - 1) THEN
            RAISE EXCEPTION 'Clock-in restricted to current date or yesterday only';
        END IF;
    END IF;

    INSERT INTO attendance_records (user_id, date, login_time, worked_hours)
    VALUES (p_user_id, p_date, NOW(), 0)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
        login_time = EXCLUDED.login_time,
        updated_at = NOW()
    RETURNING * INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Clock Out (atomic update with server timestamp)
CREATE OR REPLACE FUNCTION clock_out(
    p_user_id UUID,
    p_date DATE,
    p_early_logout_reason TEXT DEFAULT NULL
) RETURNS attendance_records AS $$
DECLARE
    result attendance_records%ROWTYPE;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Authorization: must be admin or the same user
    IF NOT is_admin() AND auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Not authorized to clock out for this user';
    END IF;

    -- Non-admins: restrict date to today or yesterday only
    IF NOT is_admin() THEN
        IF p_date NOT IN (v_today, v_today - 1) THEN
            RAISE EXCEPTION 'Clock-out restricted to current date or yesterday only';
        END IF;
    END IF;

    UPDATE attendance_records
    SET logout_time = NOW(),
        early_logout_reason = COALESCE(p_early_logout_reason, early_logout_reason),
        updated_at = NOW()
    WHERE user_id = p_user_id AND date = p_date
    RETURNING * INTO result;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No attendance record found for the given user and date';
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Update attendance record with full column access (partial-update safe)
CREATE OR REPLACE FUNCTION update_attendance_record(
    p_record_id UUID,
    p_login_time TIMESTAMPTZ DEFAULT NULL,
    p_logout_time TIMESTAMPTZ DEFAULT NULL,
    p_lunch_start TIMESTAMPTZ DEFAULT NULL,
    p_lunch_end TIMESTAMPTZ DEFAULT NULL,
    p_is_late BOOLEAN DEFAULT NULL,
    p_is_late_from_lunch BOOLEAN DEFAULT NULL,
    p_worked_hours NUMERIC DEFAULT NULL,
    p_late_reason TEXT DEFAULT NULL,
    p_lunch_late_reason TEXT DEFAULT NULL,
    p_early_logout_reason TEXT DEFAULT NULL,
    p_audit_data JSONB DEFAULT NULL,
    p_location JSONB DEFAULT NULL,
    p_client_ip VARCHAR DEFAULT NULL
)
RETURNS attendance_records AS $$
DECLARE
    result attendance_records%ROWTYPE;
    record_owner UUID;
BEGIN
    -- Get the record owner
    SELECT user_id INTO record_owner FROM attendance_records WHERE id = p_record_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attendance record not found';
    END IF;

    -- Authorization check: only admin or record owner can update
    IF NOT is_admin() AND auth.uid() != record_owner THEN
        RAISE EXCEPTION 'Not authorized to update this attendance record';
    END IF;

    -- Input validation
    IF p_worked_hours IS NOT NULL AND p_worked_hours < 0 THEN
        RAISE EXCEPTION 'Worked hours cannot be negative';
    END IF;
    IF p_login_time IS NOT NULL AND p_logout_time IS NOT NULL AND p_logout_time < p_login_time THEN
        RAISE EXCEPTION 'Logout time must be after login time';
    END IF;
    -- Future bounds: prevent timestamps far in the future
    IF p_login_time IS NOT NULL AND p_login_time > NOW() + INTERVAL '1 hour' THEN
        RAISE EXCEPTION 'Login time cannot be in the far future';
    END IF;
    IF p_logout_time IS NOT NULL AND p_logout_time > NOW() + INTERVAL '1 hour' THEN
        RAISE EXCEPTION 'Logout time cannot be in the far future';
    END IF;
    -- Past bounds: limit how far back timestamps can be set (allow reasonable correction window)
    IF p_login_time IS NOT NULL AND p_login_time < NOW() - INTERVAL '30 days' THEN
        RAISE EXCEPTION 'Login time cannot be more than 30 days in the past';
    END IF;
    IF p_logout_time IS NOT NULL AND p_logout_time < NOW() - INTERVAL '30 days' THEN
        RAISE EXCEPTION 'Logout time cannot be more than 30 days in the past';
    END IF;
    -- Lunch consistency
    IF p_lunch_start IS NOT NULL AND p_lunch_end IS NOT NULL AND p_lunch_end < p_lunch_start THEN
        RAISE EXCEPTION 'Lunch end time must be after lunch start time';
    END IF;

    -- Perform partial UPDATE using COALESCE to preserve existing values for NULL parameters
    UPDATE attendance_records
    SET
        login_time = COALESCE(p_login_time, login_time),
        logout_time = COALESCE(p_logout_time, logout_time),
        lunch_start = COALESCE(p_lunch_start, lunch_start),
        lunch_end = COALESCE(p_lunch_end, lunch_end),
        is_late = COALESCE(p_is_late, is_late),
        is_late_from_lunch = COALESCE(p_is_late_from_lunch, is_late_from_lunch),
        worked_hours = COALESCE(p_worked_hours, worked_hours),
        late_reason = COALESCE(p_late_reason, late_reason),
        lunch_late_reason = COALESCE(p_lunch_late_reason, lunch_late_reason),
        early_logout_reason = COALESCE(p_early_logout_reason, early_logout_reason),
        audit_data = COALESCE(p_audit_data, audit_data),
        location = COALESCE(p_location, location),
        client_ip = COALESCE(p_client_ip, client_ip),
        updated_at = NOW()
    WHERE id = p_record_id
    RETURNING * INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION clock_in(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION clock_out(UUID, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_attendance_record(
    UUID, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ,
    BOOLEAN, BOOLEAN, NUMERIC, TEXT, TEXT, TEXT, JSONB, JSONB, VARCHAR
) TO authenticated;

-- ============================================================================
-- PHASE 6: TRIGGERS
-- ============================================================================
CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_working_hours_config_updated_at
    BEFORE UPDATE ON working_hours_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Prevent non-admins from modifying sensitive employee columns (privilege escalation)
CREATE OR REPLACE FUNCTION prevent_employee_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- Admins can modify any column
    IF is_admin() THEN
        RETURN NEW;
    END IF;

    -- Block changes to critical columns for non-admins
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Cannot modify role field';
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        RAISE EXCEPTION 'Cannot modify is_active field';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
        RAISE EXCEPTION 'Cannot modify email field';
    END IF;
    IF NEW.employee_id IS DISTINCT FROM OLD.employee_id THEN
        RAISE EXCEPTION 'Cannot modify employee_id field (immutable)';
    END IF;
    IF NEW.uid IS DISTINCT FROM OLD.uid THEN
        RAISE EXCEPTION 'Cannot modify uid field';
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Cannot modify id field';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS FOR SAFE EMPLOYEE SELF-SERVICE
-- ============================================================================
-- These functions allow an employee to update their own profile and settings
-- without requiring direct table UPDATE privileges. They enforce column-level
-- restrictions at the database boundary, preventing mass assignment attacks.

-- Function: update_own_profile
-- Allows an employee to update only their own non-sensitive fields.
-- Sensitive fields (role, is_active, email, employee_id, uid) are NOT permitted.
CREATE OR REPLACE FUNCTION update_own_profile(
    p_name VARCHAR,
    p_department VARCHAR,
    p_position VARCHAR,
    p_designation VARCHAR,
    p_join_date DATE
) RETURNS employees AS $$
DECLARE
    updated employees%ROWTYPE;
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE employees
    SET
        name = p_name,
        department = p_department,
        position = p_position,
        designation = p_designation,
        join_date = p_join_date,
        updated_at = NOW()
    WHERE id = v_user_id
    RETURNING * INTO updated;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee record not found';
    END IF;

    RETURN updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_own_profile(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, DATE
) TO authenticated;

GRANT EXECUTE ON FUNCTION update_own_profile(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, DATE
) TO service_role;

-- Function: update_own_settings
-- Allows an employee to update their own settings JSONB only.
CREATE OR REPLACE FUNCTION update_own_settings(p_settings JSONB)
RETURNS employees AS $$
DECLARE
    updated employees%ROWTYPE;
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE employees
    SET settings = p_settings, updated_at = NOW()
    WHERE id = v_user_id
    RETURNING * INTO updated;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee record not found';
    END IF;

    RETURN updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_own_settings(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_own_settings(JSONB) TO service_role;

-- Enforce column-level protections for all direct/indirect updates (defense-in-depth)
DROP TRIGGER IF EXISTS prevent_employee_privilege_escalation_trigger ON employees;
CREATE TRIGGER prevent_employee_privilege_escalation_trigger
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION prevent_employee_privilege_escalation();

-- ============================================================================
-- PHASE 7: ROW LEVEL SECURITY (RLS) ENABLEMENT
-- ============================================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours_config ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PHASE 8: RLS POLICIES
-- ============================================================================

-- ============================================================================
-- EMPLOYEES TABLE POLICIES
-- ============================================================================
-- Admin: Full unrestricted access to all employee records
CREATE POLICY "admins_employees_full_access" ON employees
    FOR ALL USING (is_admin());

-- Employee: Can view their own profile only
CREATE POLICY "employees_view_own_profile" ON employees
    FOR SELECT USING (auth.uid() = id);

-- NOTE: Direct employee UPDATE on own profile is intentionally RESTRICTED.
-- Employees must use the SECURITY DEFINER function `update_own_profile()` for
-- safe self-service updates (name, department, position, designation, join_date).
-- This prevents mass assignment attacks (role, is_active, email, employee_id, uid).
-- The BEFORE UPDATE trigger provides defense-in-depth, but the RLS policy is
-- deliberately absent to enforce the secure-by-default principle.

-- ============================================================================
-- ATTENDANCE_RECORDS TABLE POLICIES
-- ============================================================================
-- Admin: Full unrestricted access to all attendance records
CREATE POLICY "admins_attendance_full_access" ON attendance_records
    FOR ALL USING (is_admin());

-- Employee: Can SELECT their own attendance records
CREATE POLICY "employees_select_own_attendance" ON attendance_records
    FOR SELECT USING (user_id = auth.uid());

-- NOTE: Direct INSERT/UPDATE on attendance_records by employees is intentionally RESTRICTED.
-- All attendance mutations must go through SECURITY DEFINER RPCs:
--   - clock_in(p_user_id, p_date)        → creates record with server timestamp, date-limited
--   - clock_out(p_user_id, p_date, ...)   → updates logout, date-limited
--   - update_attendance_record(...)       → fine-grained field updates with validation
-- These RPCs enforce authorization, input validation, and temporal constraints.
-- The admin policy "admins_attendance_full_access" permits direct modifications for admins.

-- ============================================================================
-- ATTENDANCE_BREAKS TABLE POLICIES
-- ============================================================================
-- Admin: Full unrestricted access to all breaks
CREATE POLICY "admins_breaks_full_access" ON attendance_breaks
    FOR ALL USING (is_admin());

-- Employee: Can manage (SELECT, INSERT, UPDATE, DELETE) their own breaks
-- Breaks belong to employee via attendance_records relationship
CREATE POLICY "employees_manage_own_breaks" ON attendance_breaks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM attendance_records ar
            WHERE ar.id = attendance_record_id AND ar.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM attendance_records ar
            WHERE ar.id = attendance_record_id AND ar.user_id = auth.uid()
        )
    );

-- ============================================================================
-- LEAVE_REQUESTS TABLE POLICIES
-- ============================================================================
-- Admin: Full unrestricted access to all leave requests
CREATE POLICY "admins_leaves_full_access" ON leave_requests
    FOR ALL USING (is_admin());

-- Employee: Can SELECT their own leave requests
CREATE POLICY "employees_view_own_leaves" ON leave_requests
    FOR SELECT USING (employee_id = auth.uid());

-- Employee: Can INSERT their own leave requests
-- WITH CHECK enforces that employee_id matches the authenticated user AND status is 'pending'
-- This prevents employees from bypassing the approval workflow by inserting approved/rejected requests
CREATE POLICY "employees_insert_own_leaves" ON leave_requests
    FOR INSERT WITH CHECK (
        employee_id = auth.uid() AND
        status = 'pending'
    );

-- Employee: Can UPDATE their own PENDING leave requests only
-- Once reviewed (approved/rejected), only admins can modify
CREATE POLICY "employees_update_own_pending_leaves" ON leave_requests
    FOR UPDATE USING (
        employee_id = auth.uid() AND status = 'pending'
    )
    WITH CHECK (
        employee_id = auth.uid() AND status = 'pending'
    );

-- ============================================================================
-- MEETINGS TABLE POLICIES
-- ============================================================================
-- Admin: Full unrestricted access to all meetings
CREATE POLICY "admins_manage_meetings" ON meetings
    FOR ALL USING (is_admin());

-- Authenticated employees: Can view all meetings (read-only)
CREATE POLICY "employees_view_all_meetings" ON meetings
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- MEETING_EMPLOYEES TABLE POLICIES
-- ============================================================================
-- Admin: Full unrestricted access to meeting assignments
CREATE POLICY "admins_manage_meeting_assignments" ON meeting_employees
    FOR ALL USING (is_admin());

-- Employee: Can view their own meeting assignments
CREATE POLICY "employees_view_own_meeting_assignments" ON meeting_employees
    FOR SELECT USING (employee_id = auth.uid());

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================
-- Admin: Full unrestricted access to all notifications
CREATE POLICY "admins_notifications_full_access" ON notifications
    FOR ALL USING (is_admin());

-- Employee: Can SELECT their own notifications
CREATE POLICY "employees_select_own_notifications" ON notifications
    FOR SELECT USING (employee_id = auth.uid());

-- Employee: Can UPDATE (mark as read) their own notifications
-- WITH CHECK prevents changing employee_id to reassign ownership
CREATE POLICY "employees_update_own_notifications" ON notifications
    FOR UPDATE USING (employee_id = auth.uid())
    WITH CHECK (employee_id = auth.uid());

-- ============================================================================
-- WORKING_HOURS_CONFIG POLICIES
-- ============================================================================
-- Admin: Full access to working hours configuration
CREATE POLICY "admins_working_hours_full_access" ON working_hours_config
    FOR ALL USING (is_admin());

-- Authenticated employees: Can view working hours (read-only)
CREATE POLICY "employees_view_working_hours" ON working_hours_config
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- END OF SCHEMA INITIALIZATION
-- ============================================================================
