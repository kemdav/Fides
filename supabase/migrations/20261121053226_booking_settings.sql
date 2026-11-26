-- ============================================================
-- Fides: Booking Settings Extensions (CPG-94)
-- Migration: 00021_booking_settings.sql
--
-- Purpose:
--   Extend public.tenant_settings with business default buffer,
--   staff assignment mode, cancellation policy rules, and
--   booking-settings audit metadata.
--
-- Notes:
--   - Reuses existing columns from 00009_settings.sql:
--       auto_confirm, booking_lead_time_minutes, max_advance_days,
--       cancellation_window_hours, reschedule_window_hours,
--       slot_interval_minutes.
--   - Preserves existing RLS policies (owner-only INSERT/UPDATE
--     enforced by 00013_website_settings.sql).
-- ============================================================

BEGIN;

ALTER TABLE public.tenant_settings
    ADD COLUMN IF NOT EXISTS default_buffer_minutes
        integer NOT NULL DEFAULT 0,

    ADD COLUMN IF NOT EXISTS staff_assignment_mode
        text NOT NULL DEFAULT 'any_available',

    ADD COLUMN IF NOT EXISTS cancellation_policy_notes
        text,

    ADD COLUMN IF NOT EXISTS booking_settings_updated_at
        timestamptz,

    ADD COLUMN IF NOT EXISTS booking_settings_updated_by
        uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.tenant_settings'::regclass
          AND conname = 'tenant_settings_default_buffer_check'
    ) THEN
        ALTER TABLE public.tenant_settings
            ADD CONSTRAINT tenant_settings_default_buffer_check
            CHECK (default_buffer_minutes >= 0 AND default_buffer_minutes <= 240);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.tenant_settings'::regclass
          AND conname = 'tenant_settings_staff_assignment_mode_check'
    ) THEN
        ALTER TABLE public.tenant_settings
            ADD CONSTRAINT tenant_settings_staff_assignment_mode_check
            CHECK (staff_assignment_mode IN ('specific_staff', 'any_available'));
    END IF;
END;
$$;

COMMIT;