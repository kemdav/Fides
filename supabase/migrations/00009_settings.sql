-- ============================================================
-- Fides: Booking Rules and AI Concierge Settings
-- Migration: 00009_settings.sql
--
-- Purpose:
--   Extend the existing public.tenant_settings table with
--   booking configuration and AI concierge settings.
--
-- Important:
--   - Does NOT recreate tenant_settings.
--   - Preserves existing RLS policies and triggers.
--   - Uses ADD COLUMN IF NOT EXISTS for every new column.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Booking configuration
-- ------------------------------------------------------------

ALTER TABLE public.tenant_settings
    ADD COLUMN IF NOT EXISTS booking_lead_time_minutes
        integer NOT NULL DEFAULT 0,

    ADD COLUMN IF NOT EXISTS cancellation_window_hours
        integer NOT NULL DEFAULT 24,

    ADD COLUMN IF NOT EXISTS reschedule_window_hours
        integer NOT NULL DEFAULT 24,

    ADD COLUMN IF NOT EXISTS max_advance_days
        integer NOT NULL DEFAULT 60,

    ADD COLUMN IF NOT EXISTS slot_interval_minutes
        integer NOT NULL DEFAULT 30,

    ADD COLUMN IF NOT EXISTS auto_confirm
        boolean NOT NULL DEFAULT false,

    ADD COLUMN IF NOT EXISTS require_deposit
        boolean NOT NULL DEFAULT false,

    ADD COLUMN IF NOT EXISTS deposit_percent
        numeric(5,2) NOT NULL DEFAULT 0,

    ADD COLUMN IF NOT EXISTS ai_concierge_enabled
        boolean NOT NULL DEFAULT true;

-- ------------------------------------------------------------
-- 2. Deposit percentage validation
-- ------------------------------------------------------------
-- ADD COLUMN IF NOT EXISTS does not add a constraint when the
-- column already exists. Add the constraint separately and
-- conditionally to make the migration safe to rerun.
-- ------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.tenant_settings'::regclass
          AND conname = 'tenant_settings_deposit_percent_check'
    ) THEN
        ALTER TABLE public.tenant_settings
            ADD CONSTRAINT tenant_settings_deposit_percent_check
            CHECK (deposit_percent BETWEEN 0 AND 100);
    END IF;
END;
$$;

COMMIT;
```