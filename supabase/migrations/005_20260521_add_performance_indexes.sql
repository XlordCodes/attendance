-- ==============================================================================
-- MIGRATION: Critical Performance Indexes (Tier 3 Resolution)
-- Purpose: Eliminate sequential scans on core attendance and break queries.
-- ==============================================================================

-- 1. The Core Composite Index (Solves DBI-01 & DBI-03)
-- Because user_id is the leading column, this single index speeds up BOTH:
-- A) Queries filtering by user_id AND date (e.g., loadTodayAttendance)
-- B) Queries filtering ONLY by user_id (e.g., employee history)
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_date 
ON attendance_records(user_id, date);

-- 2. The Date-Only Index (Solves DBI-02)
-- Required for the check-absences Edge Function which queries ONLY by date.
-- Without this, the cron job does a full table scan every 30 minutes.
CREATE INDEX IF NOT EXISTS idx_attendance_records_date 
ON attendance_records(date);

-- 3. The Break Relation Index (Solves DBI-04)
-- Required to instantly resolve the `attendance_breaks (*)` join payload
-- and speed up the startBreak()/endBreak() lookups.
CREATE INDEX IF NOT EXISTS idx_attendance_breaks_record_id 
ON attendance_breaks(attendance_record_id);