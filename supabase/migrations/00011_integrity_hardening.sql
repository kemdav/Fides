-- ============================================================================
-- Fides - Integrity Hardening
-- Migration: 00011_integrity_hardening.sql
--
-- Purpose:
--   1. Enforce tenant-safe appointment/customer relationships.
--   2. Restrict public review visibility to published reviews of active tenants.
--   3. Validate tenant booking settings.
--   4. Validate tier-feature limits and subscription period ordering.
--
-- Dependencies:
--   public.appointments
--   public.customers
--   public.reviews
--   public.tenants
--   public.tenant_settings
--   public.tier_features
--   public.subscriptions
--
-- Notes:
--   - Existing invalid data aborts the migration.
--   - The transaction rolls back all changes on failure.
--   - The composite foreign key uses PostgreSQL 15+ column-list syntax
--     for ON DELETE SET NULL.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Enforce tenant-safe appointment/customer relationships.
-- ---------------------------------------------------------------------------

-- Abort if existing appointments reference a customer from another tenant.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.appointments AS a
        JOIN public.customers AS c
          ON c.id = a.customer_id
        WHERE a.customer_id IS NOT NULL
          AND a.tenant_id IS DISTINCT FROM c.tenant_id
    ) THEN
        RAISE EXCEPTION
            'Cannot enforce tenant-safe appointment/customer relationship: cross-tenant customer references exist';
    END IF;
END;
$$;

-- Replace the single-column foreign key with a tenant-aware composite FK.
-- When a customer is deleted, clear customer_id without clearing tenant_id.
ALTER TABLE public.appointments
    DROP CONSTRAINT IF EXISTS appointments_customer_id_fkey;

ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_customer_id_fkey
    FOREIGN KEY (tenant_id, customer_id)
    REFERENCES public.customers (tenant_id, id)
    ON DELETE SET NULL (customer_id);

-- ---------------------------------------------------------------------------
-- 2. Restrict public reviews to published reviews of active tenants.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS reviews_public_read_published
    ON public.reviews;

CREATE POLICY reviews_public_read_published
    ON public.reviews
    FOR SELECT
    TO anon, authenticated
    USING (
        status = 'published'
        AND EXISTS (
            SELECT 1
            FROM public.tenants AS t
            WHERE t.id = reviews.tenant_id
              AND t.status = 'active'
        )
    );

-- IMPORTANT:
-- PostgreSQL permissive policies are combined with OR.
-- Review the other SELECT policies on public.reviews to ensure that none
-- unintentionally allows public access to unpublished reviews or reviews
-- belonging to inactive tenants.

-- ---------------------------------------------------------------------------
-- 3. Validate booking settings.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.tenant_settings'::regclass
          AND conname = 'tenant_settings_booking_values_check'
    ) THEN
        ALTER TABLE public.tenant_settings
            ADD CONSTRAINT tenant_settings_booking_values_check
            CHECK (
                booking_lead_time_minutes >= 0
                AND cancellation_window_hours >= 0
                AND reschedule_window_hours >= 0
                AND max_advance_days >= 0
                AND slot_interval_minutes > 0
            );
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Validate tier-feature limits and subscription period ordering.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.tier_features'::regclass
          AND conname = 'tier_features_limit_value_nonnegative'
    ) THEN
        ALTER TABLE public.tier_features
            ADD CONSTRAINT tier_features_limit_value_nonnegative
            CHECK (
                limit_value IS NULL
                OR limit_value >= 0
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.subscriptions'::regclass
          AND conname = 'subscriptions_period_order_check'
    ) THEN
        ALTER TABLE public.subscriptions
            ADD CONSTRAINT subscriptions_period_order_check
            CHECK (
                current_period_start IS NULL
                OR current_period_end IS NULL
                OR current_period_end >= current_period_start
            );
    END IF;
END;
$$;

COMMIT;