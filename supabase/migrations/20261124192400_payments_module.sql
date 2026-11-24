-- ============================================================================
-- Fides — Merchant Payments Module Migration
-- Migration: 20261124192400_payments_module.sql
-- Purpose: Additive schema updates for end-to-end Merchant Payments:
--          * Add 'ewallet' to payment_method enum if missing.
--          * Add 'partial' and 'unpaid' to payment_status enum if missing.
--          * Add VAT breakdown (net_cents, vat_cents), notes, reference_number,
--            recorded_by, void_reason, voided_at, refund_reason, refunded_at to public.payments.
--          * Add payment_status and paid_cents to public.appointments for balance tracking.
--          * Add vat_rate_percent to public.tenant_settings.
--          * Create composite indexes for high-performance tenant payment queries.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Extend Enums safely
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'payment_method'
          AND n.nspname = 'public'
          AND e.enumlabel = 'ewallet'
    ) THEN
        ALTER TYPE public.payment_method ADD VALUE 'ewallet';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'payment_status'
          AND n.nspname = 'public'
          AND e.enumlabel = 'partial'
    ) THEN
        ALTER TYPE public.payment_status ADD VALUE 'partial';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'payment_status'
          AND n.nspname = 'public'
          AND e.enumlabel = 'unpaid'
    ) THEN
        ALTER TYPE public.payment_status ADD VALUE 'unpaid';
    END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 2. Extend public.payments table
-- ----------------------------------------------------------------------------

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS reference_number TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS void_reason TEXT,
    ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS refund_reason TEXT,
    ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS refunded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS net_cents INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS vat_cents INTEGER NOT NULL DEFAULT 0;

-- Backfill reference_number from reference if null
UPDATE public.payments
SET reference_number = reference
WHERE reference_number IS NULL AND reference IS NOT NULL;

-- Backfill recorded_by from created_by if null
UPDATE public.payments
SET recorded_by = created_by
WHERE recorded_by IS NULL AND created_by IS NOT NULL;

-- Backfill net_cents and vat_cents if 0 and amount_cents > 0
UPDATE public.payments
SET
    net_cents = ROUND(amount_cents / 1.12),
    vat_cents = amount_cents - ROUND(amount_cents / 1.12)
WHERE (net_cents = 0 AND vat_cents = 0) AND amount_cents > 0;

-- ----------------------------------------------------------------------------
-- 3. Extend public.appointments table for balance & settlement tracking
-- ----------------------------------------------------------------------------

ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid',
    ADD COLUMN IF NOT EXISTS paid_cents INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.appointments'::regclass
          AND conname = 'appointments_payment_status_check'
    ) THEN
        ALTER TABLE public.appointments
            ADD CONSTRAINT appointments_payment_status_check
            CHECK (payment_status IN ('unpaid', 'partial', 'paid'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.appointments'::regclass
          AND conname = 'appointments_paid_cents_check'
    ) THEN
        ALTER TABLE public.appointments
            ADD CONSTRAINT appointments_paid_cents_check
            CHECK (paid_cents >= 0);
    END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 4. Extend public.tenant_settings table for configurable VAT
-- ----------------------------------------------------------------------------

ALTER TABLE public.tenant_settings
    ADD COLUMN IF NOT EXISTS vat_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 12.00;

-- ----------------------------------------------------------------------------
-- 5. Indexes for fast tenant reporting and ledger lookups
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS payments_tenant_paid_at_desc_idx
    ON public.payments (tenant_id, paid_at DESC);

CREATE INDEX IF NOT EXISTS payments_tenant_appointment_id_idx
    ON public.payments (tenant_id, appointment_id);

CREATE INDEX IF NOT EXISTS appointments_tenant_payment_status_idx
    ON public.appointments (tenant_id, payment_status);

-- ----------------------------------------------------------------------------
-- 6. Hardened RLS Policies for public.payments
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS payments_operational_select ON public.payments;
CREATE POLICY payments_operational_select
ON public.payments
FOR SELECT
TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1
        FROM public.tenant_memberships tm
        WHERE tm.tenant_id = payments.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
    )
    OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.tenant_id = payments.tenant_id
          AND p.role IN ('owner', 'admin', 'receptionist', 'staff')
    )
);

DROP POLICY IF EXISTS payments_operational_insert ON public.payments;
CREATE POLICY payments_operational_insert
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1
        FROM public.tenant_memberships tm
        WHERE tm.tenant_id = payments.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
    )
    OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.tenant_id = payments.tenant_id
          AND p.role IN ('owner', 'admin', 'receptionist', 'staff')
    )
);

DROP POLICY IF EXISTS payments_operational_update ON public.payments;
CREATE POLICY payments_operational_update
ON public.payments
FOR UPDATE
TO authenticated
USING (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1
        FROM public.tenant_memberships tm
        WHERE tm.tenant_id = payments.tenant_id
          AND tm.profile_id = auth.uid()
          AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
    )
    OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.tenant_id = payments.tenant_id
          AND p.role IN ('owner', 'admin', 'receptionist', 'staff')
    )
)
WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
        SELECT 1
        FROM public.tenant_memberships tm
        WHERE tm.tenant_id = payments.tenant_id
          AND tm.profile_id = auth.uid()
          AND (
              tm.role IN ('owner', 'admin')
              OR (
                  tm.role IN ('receptionist', 'staff')
                  AND payments.status NOT IN ('refunded', 'voided')
              )
          )
    )
    OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.tenant_id = payments.tenant_id
          AND (
              p.role IN ('owner', 'admin')
              OR (
                  p.role IN ('receptionist', 'staff')
                  AND payments.status NOT IN ('refunded', 'voided')
              )
          )
    )
);

COMMIT;
