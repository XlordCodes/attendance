-- ============================================================================
-- Migration: Phase 2 Consolidated — Notifications, Realtime, pg_cron Absence Checker
-- Date: 2026-05-14
-- Description: Creates notifications table, RLS policies, Realtime publication,
--              and schedules the check-absences Edge Function via pg_cron.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create notifications table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  target_role VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. Indexes for performance
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_triggered_by ON notifications(triggered_by);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Admins: full access to all notifications
CREATE POLICY "admins_notifications_full_access" ON notifications
  FOR ALL USING (is_admin());

-- CORRECTED RLS POLICY (Phase 2 fix):
-- Employees can view notifications where:
--  - they triggered it (triggered_by = auth.uid()), OR
--  - the notification's target_role matches their own role
CREATE POLICY "employees_view_own_notifications" ON notifications
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      triggered_by = auth.uid() OR
      target_role = (SELECT role FROM employees WHERE id = auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- 4. Enable Supabase Realtime on notifications table
-- ----------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ----------------------------------------------------------------------------
-- 5. pg_cron setup: trigger function for check-absences Edge Function
-- ----------------------------------------------------------------------------
-- WARNING: This embeds actual project credentials. Ensure this file is not
-- committed to a public repository. The Anon Key is safe to expose client-side
-- but should still be treated as a credential in server-side SQL.
--
-- Extracted from .env:
--   SUPABASE_URL = https://tyozjwidyiblfqnvcxew.supabase.co
--   SUPABASE_ANON_KEY = sb_publishable_fhUIYc0R7jFnuR7tb__7kA_951QLk6l

create or replace function public.trigger_check_absences()
returns void as $$
  select net.http_post(
    'https://tyozjwidyiblfqnvcxew.supabase.co/functions/v1/check-absences',
    '{}',
    ARRAY[
      ('Authorization', 'Bearer sb_publishable_fhUIYc0R7jFnuR7tb__7kA_951QLk6l'),
      ('Content-Type', 'application/json')
    ]
  );
$$ language sql;

-- ----------------------------------------------------------------------------
-- 6. Schedule the cron job to run every 30 minutes
-- ----------------------------------------------------------------------------
-- Ensure pg_cron extension is enabled in the database:
--   create extension if not exists pg_cron;
--
-- This schedules the absence checker to run at minute 0 and 30 of every hour.
select cron.schedule(
  '30min-check-absences',
  '*/30 * * * *',
  'select public.trigger_check_absences();'
);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
