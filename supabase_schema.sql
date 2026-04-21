-- AINTRIX Attendance System - Supabase PostgreSQL Schema
-- Generated from Firebase → Supabase Migration Mapping Artifact

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUM TYPES
-- =============================================

CREATE TYPE user_role AS ENUM ('employee', 'admin');
CREATE TYPE leave_type AS ENUM ('sick', 'vacation', 'personal', 'emergency', 'other');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE meeting_status AS ENUM ('scheduled', 'completed', 'cancelled');
CREATE TYPE notification_type AS ENUM ('early_logout', 'overtime', 'system');
CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'partial', 'half-day');

-- =============================================
-- TABLES
-- =============================================

-- Employees Table (replaces Firestore 'users' collection)
CREATE TABLE employees (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  uid UUID UNIQUE,
  employee_id VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  department VARCHAR(100) NOT NULL,
  position VARCHAR(100) NOT NULL,
  designation VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  join_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  settings JSONB DEFAULT '{"theme": "system", "notifications": {"clockInReminder": true, "clockOutReminder": true, "breakReminder": true, "weeklyReport": true, "sound": true}, "workPreferences": {"defaultBreakDuration": 30, "timezone": "Asia/Kolkata", "dateFormat": "DD/MM/YYYY", "timeFormat": "12h"}, "privacy": {"shareLocation": true, "trackProductivity": true}, "language": "en"}'::jsonb
);

-- Attendance Records Table (replaces Firestore users/{uid}/attendance subcollection)
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  login_time TIMESTAMPTZ,
  logout_time TIMESTAMPTZ,
  is_late BOOLEAN NOT NULL DEFAULT false,
  late_reason TEXT DEFAULT '',
  worked_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
  location JSONB,
  client_ip VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Attendance Breaks Table (normalized from nested breaks array)
CREATE TABLE attendance_breaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "end" TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leave Requests Table
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name VARCHAR(255) NOT NULL,
  employee_email VARCHAR(255) NOT NULL,
  leave_type leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status leave_status NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES employees(id),
  admin_comments TEXT
);

-- Meetings Table
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time VARCHAR(20) NOT NULL,
  created_by UUID NOT NULL REFERENCES employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status meeting_status NOT NULL DEFAULT 'scheduled'
);

-- Meeting Employees Join Table (many-to-many)
CREATE TABLE meeting_employees (
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, employee_id)
);

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  employee_name VARCHAR(255),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  priority notification_priority NOT NULL DEFAULT 'medium'
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_attendance_records_user_date ON attendance_records(user_id, date DESC);
CREATE INDEX idx_attendance_breaks_record ON attendance_breaks(attendance_record_id);
CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_meetings_date ON meetings(date DESC);
CREATE INDEX idx_notifications_employee ON notifications(employee_id, created_at DESC);

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attendance_records_modtime
BEFORE UPDATE ON attendance_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- CLOCK IN/OUT RPC FUNCTIONS (SERVER-SIDE TIMESTAMPS)
-- =============================================

-- Clock in with server timestamp
CREATE OR REPLACE FUNCTION clock_in(p_user_id UUID, p_date DATE)
RETURNS TABLE (id UUID, login_time TIMESTAMPTZ) AS $$
BEGIN
  INSERT INTO attendance_records (user_id, date, login_time)
  VALUES (p_user_id, p_date, NOW())
  ON CONFLICT (user_id, date) DO UPDATE
  SET login_time = NOW()
  RETURNING attendance_records.id, attendance_records.login_time INTO id, login_time;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clock out with server timestamp
CREATE OR REPLACE FUNCTION clock_out(p_user_id UUID, p_date DATE)
RETURNS TABLE (id UUID, logout_time TIMESTAMPTZ) AS $$
BEGIN
  UPDATE attendance_records
  SET logout_time = NOW()
  WHERE user_id = p_user_id AND date = p_date
  RETURNING attendance_records.id, attendance_records.logout_time INTO id, logout_time;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Start break with server timestamp
CREATE OR REPLACE FUNCTION start_break(p_attendance_record_id UUID)
RETURNS TABLE (id UUID, start TIMESTAMPTZ) AS $$
BEGIN
  INSERT INTO attendance_breaks (attendance_record_id, start)
  VALUES (p_attendance_record_id, NOW())
  RETURNING attendance_breaks.id, attendance_breaks.start INTO id, start;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- End break with server timestamp
CREATE OR REPLACE FUNCTION end_break(p_break_id UUID)
RETURNS TABLE (id UUID, "end" TIMESTAMPTZ) AS $$
BEGIN
  UPDATE attendance_breaks
  SET "end" = NOW()
  WHERE id = p_break_id
  RETURNING attendance_breaks.id, attendance_breaks."end" INTO id, "end";
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (SELECT role FROM employees WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role = 'admin' FROM employees WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Employees policies
CREATE POLICY "Users can view their own profile" ON employees
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all employees" ON employees
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can update their own profile" ON employees
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all employees" ON employees
  FOR ALL USING (is_admin());

-- Attendance records policies
CREATE POLICY "Users can view their own attendance" ON attendance_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all attendance" ON attendance_records
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can create their own attendance" ON attendance_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendance" ON attendance_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all attendance" ON attendance_records
  FOR ALL USING (is_admin());

-- Attendance breaks policies
CREATE POLICY "Users can view their own breaks" ON attendance_breaks
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM attendance_records 
    WHERE attendance_records.id = attendance_record_id 
    AND attendance_records.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all breaks" ON attendance_breaks
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can create their own breaks" ON attendance_breaks
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM attendance_records 
    WHERE attendance_records.id = attendance_record_id 
    AND attendance_records.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own breaks" ON attendance_breaks
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM attendance_records 
    WHERE attendance_records.id = attendance_record_id 
    AND attendance_records.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all breaks" ON attendance_breaks
  FOR ALL USING (is_admin());

-- Leave requests policies
CREATE POLICY "Users can view their own leave requests" ON leave_requests
  FOR SELECT USING (auth.uid() = employee_id);

CREATE POLICY "Admins can view all leave requests" ON leave_requests
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can create leave requests" ON leave_requests
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Admins can manage all leave requests" ON leave_requests
  FOR ALL USING (is_admin());

-- Meetings policies
CREATE POLICY "All authenticated users can view meetings" ON meetings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage meetings" ON meetings
  FOR ALL USING (is_admin());

-- Meeting employees policies
CREATE POLICY "Users can view their assigned meetings" ON meeting_employees
  FOR SELECT USING (auth.uid() = employee_id OR is_admin());

CREATE POLICY "Admins can manage meeting assignments" ON meeting_employees
  FOR ALL USING (is_admin());

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = employee_id);

CREATE POLICY "Users can mark their notifications read" ON notifications
  FOR UPDATE USING (auth.uid() = employee_id);

CREATE POLICY "Admins can manage all notifications" ON notifications
  FOR ALL USING (is_admin());
