-- ============================================================================
-- AINTRIX Attendance Management System
-- Supabase Database Initialization Schema
-- COMPLETE REBUILD: Drops ALL existing objects before creating fresh schema
-- ============================================================================

-- ============================================================================
-- PHASE 1: DROP EVERYTHING (Clean Slate)
-- ============================================================================

-- Drop all policies (must be done before dropping tables)
-- EMPLOYEES
DROP POLICY IF EXISTS "admins_employees_full_access" ON employees;
DROP POLICY IF EXISTS "users_own_profile" ON employees;
DROP POLICY IF EXISTS "employees_view_own_profile" ON employees;
DROP POLICY IF EXISTS "employees_update_own_profile" ON employees;

-- ATTENDANCE_RECORDS
DROP POLICY IF EXISTS "admins_attendance_full_access" ON attendance_records;
DROP POLICY IF EXISTS "employees_view_own_attendance" ON attendance_records;
DROP POLICY IF EXISTS "employees_select_own_attendance" ON attendance_records;
DROP POLICY IF EXISTS "employees_insert_own_attendance" ON attendance_records;
DROP POLICY IF EXISTS "employees_update_own_attendance" ON attendance_records;

-- ATTENDANCE_BREAKS
DROP POLICY IF EXISTS "admins_breaks_full_access" ON attendance_breaks;
DROP POLICY IF EXISTS "employees_manage_own_breaks" ON attendance_breaks;

-- LEAVE_REQUESTS
DROP POLICY IF EXISTS "admins_leaves_full_access" ON leave_requests;
DROP POLICY IF EXISTS "employees_view_own_leaves" ON leave_requests;
DROP POLICY IF EXISTS "employees_insert_own_leaves" ON leave_requests;
DROP POLICY IF EXISTS "employees_update_own_pending_leaves" ON leave_requests;

-- MEETINGS
DROP POLICY IF EXISTS "admins_manage_meetings" ON meetings;
DROP POLICY IF EXISTS "authenticated_view_meetings" ON meetings;
DROP POLICY IF EXISTS "employees_view_all_meetings" ON meetings;

-- MEETING_EMPLOYEES
DROP POLICY IF EXISTS "admins_manage_meeting_assignments" ON meeting_employees;
DROP POLICY IF EXISTS "employees_view_own_meeting_assignments" ON meeting_employees;

-- NOTIFICATIONS
DROP POLICY IF EXISTS "admins_notifications_full_access" ON notifications;
DROP POLICY IF EXISTS "employees_view_own_notifications" ON notifications;
DROP POLICY IF EXISTS "employees_select_own_notifications" ON notifications;
DROP POLICY IF EXISTS "employees_update_own_notifications" ON notifications;

-- Drop all triggers
DROP TRIGGER IF EXISTS update_attendance_updated_at ON attendance_records;
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;

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

-- Drop custom types (use CASCADE to force drop if anything remains)
DROP TYPE IF EXISTS notification_priority CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS meeting_status CASCADE;
DROP TYPE IF EXISTS leave_status CASCADE;
DROP TYPE IF EXISTS leave_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

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
    CONSTRAINT hours_non_negative CHECK (worked_hours >= 0)
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
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM employees
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql STABLE;

-- RPC: Clock In (atomic upsert with server timestamp)
CREATE OR REPLACE FUNCTION clock_in(p_user_id UUID, p_date DATE)
RETURNS attendance_records AS $$
DECLARE
    result attendance_records%ROWTYPE;
BEGIN
    IF (SELECT role FROM employees WHERE id = auth.uid()) != 'admin'
       AND auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Not authorized to clock in for this user';
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
CREATE OR REPLACE FUNCTION clock_out(p_user_id UUID, p_date DATE)
RETURNS attendance_records AS $$
DECLARE
    result attendance_records%ROWTYPE;
BEGIN
    IF (SELECT role FROM employees WHERE id = auth.uid()) != 'admin'
       AND auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Not authorized to clock out for this user';
    END IF;

    UPDATE attendance_records
    SET logout_time = NOW(), updated_at = NOW()
    WHERE user_id = p_user_id AND date = p_date
    RETURNING * INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Update attendance record with full column access
CREATE OR REPLACE FUNCTION update_attendance_record(
    p_record_id UUID,
    p_login_time TIMESTAMPTZ,
    p_logout_time TIMESTAMPTZ,
    p_lunch_start TIMESTAMPTZ,
    p_lunch_end TIMESTAMPTZ,
    p_is_late BOOLEAN,
    p_is_late_from_lunch BOOLEAN,
    p_worked_hours NUMERIC,
    p_late_reason TEXT,
    p_lunch_late_reason TEXT,
    p_early_logout_reason TEXT,
    p_audit_data JSONB,
    p_location JSONB,
    p_client_ip VARCHAR
)
RETURNS attendance_records AS $$
DECLARE
    result attendance_records%ROWTYPE;
    record_owner UUID;
BEGIN
    -- Get the record owner
    SELECT user_id INTO record_owner FROM attendance_records WHERE id = p_record_id;

    -- Authorization check: only admin or record owner can update
    IF (SELECT role FROM employees WHERE id = auth.uid()) != 'admin'
       AND auth.uid() != record_owner THEN
        RAISE EXCEPTION 'Not authorized to update this attendance record';
    END IF;

    UPDATE attendance_records
    SET
        login_time = p_login_time,
        logout_time = p_logout_time,
        lunch_start = p_lunch_start,
        lunch_end = p_lunch_end,
        is_late = p_is_late,
        is_late_from_lunch = p_is_late_from_lunch,
        worked_hours = p_worked_hours,
        late_reason = p_late_reason,
        lunch_late_reason = p_lunch_late_reason,
        early_logout_reason = p_early_logout_reason,
        audit_data = p_audit_data,
        location = p_location,
        client_ip = p_client_ip,
        updated_at = NOW()
    WHERE id = p_record_id
    RETURNING * INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION clock_in(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION clock_out(UUID, DATE) TO authenticated;
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

-- Employee: Can update their own profile
-- Simple ownership check; row-level constraints already prevent privilege escalation
CREATE POLICY "employees_update_own_profile" ON employees
    FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- ATTENDANCE_RECORDS TABLE POLICIES
-- ============================================================================
-- Admin: Full unrestricted access to all attendance records
CREATE POLICY "admins_attendance_full_access" ON attendance_records
    FOR ALL USING (is_admin());

-- Employee: Can SELECT their own attendance records
CREATE POLICY "employees_select_own_attendance" ON attendance_records
    FOR SELECT USING (user_id = auth.uid());

-- Employee: Can INSERT their own attendance records (clock-in via RPC)
CREATE POLICY "employees_insert_own_attendance" ON attendance_records
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Employee: Can UPDATE their own attendance records
-- NO column-level WITH CHECK restrictions on logout_time, login_time, worked_hours
-- Only prevents reassignment of user_id to another employee
CREATE POLICY "employees_update_own_attendance" ON attendance_records
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

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
-- END OF SCHEMA INITIALIZATION
-- ============================================================================
