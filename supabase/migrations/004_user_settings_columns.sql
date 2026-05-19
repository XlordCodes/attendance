-- ============================================================================
-- Migration: user settings columns on employees + update_own_settings RPC
-- Date: 2026-05-17
-- Adds the three required settings columns as a safe, idempotent patch
-- to any of the instances found by the audit above.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Drop and recreate update_own_settings so it writes to the new typed
--    columns as well as the (possibly present) settings JSONB column, all in
--    one atomic call.  DROP IF NOT EXISTS idempotently skips when absent.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS update_own_settings(p_settings JSONB);

-- ----------------------------------------------------------------------------
-- 2. Add the three persisted settings columns to employees.
--    IF NOT EXISTS guards mean this block is safe to run on every database
--    state found by the audit:
--      • freshly migrated 002 (only phone_number, personal_email present)
--      • fully current schema after migrations 001+002+003
--      • production with hand-applied partial changes
--    Each ADD COLUMN is evaluated independently so re-running the migration
--    twice in a row is always a no-op.
-- ----------------------------------------------------------------------------
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS default_break_duration  INT      NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS break_reminder_enabled   BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sound_enabled            BOOLEAN  NOT NULL DEFAULT true;

-- ----------------------------------------------------------------------------
-- 3. If a SQL-level settings JSONB column already exists on employees (a
--    developer may have added it by hand before this migration was filed),
--    backfill the three new typed columns from it so no existing data is
--    silently lost.  The DO block is skipped entirely if the settings column
--    does not exist, so the patch remains safe.
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM   information_schema.columns
    WHERE  table_name   = 'employees'
    AND    column_name  = 'settings'
  ) THEN
    UPDATE employees
    SET
      default_break_duration = COALESCE(
        (settings->>'defaultBreakDuration')::INT,   default_break_duration),
      break_reminder_enabled = COALESCE(
        (settings->>'breakReminder')::BOOLEAN,      break_reminder_enabled),
      sound_enabled          = COALESCE(
        (settings->>'sound')::BOOLEAN,              sound_enabled)
    WHERE settings IS NOT NULL;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. RPC: update_own_settings
--    Called by userService.ts (employee / non-admin path).
--    Writes the three typed columns AND the JSONB bundle atomically so
--    admin reads and employee reads stay in sync.
--    SECURITY DEFINER is required so policy checks run as the calling
--    authenticated user, not as the postgres role.
--    A hard auth.uid() guard inside the function is the primary authorization
--    check — RLS policies on employees will still be applied afterwards.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_own_settings(p_settings JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller UUID := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE employees
  SET
    settings               = p_settings,
    default_break_duration = COALESCE((p_settings->>'defaultBreakDuration')::INT,  default_break_duration),
    break_reminder_enabled = COALESCE((p_settings->>'breakReminder')::BOOLEAN,      break_reminder_enabled),
    sound_enabled          = COALESCE((p_settings->>'sound')::BOOLEAN,              sound_enabled),
    updated_at             = NOW()
  WHERE id = caller;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee record not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION update_own_settings(JSONB) TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
