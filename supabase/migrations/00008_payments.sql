-- ============================================================================
-- Fides — Payments and refunds
-- Migration: 00008_payments.sql
-- Purpose: Record appointment payments and preserve financial records for
--          dashboard revenue aggregation and future BIR reporting.
--
-- Depends on:
--   public.tenants
--   public.profiles
--   public.tenant_memberships
--   public.appointments
--   public.customers
--   public.app_role
--   public.is_platform_admin()
--   public.set_updated_at()
--
-- Design notes:
--   * Monetary amounts use integer minor units (centavos for PHP).
--   * Payment records cannot be deleted by authenticated users.
--   * Refunds and voids are represented by status changes on the original row.
--   * Tenant-aware foreign keys prevent cross-tenant appointment/customer links.
--   * No Realtime publication changes are made.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Enums
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'payment_method'
          AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public.payment_method AS ENUM (
            'cash',
            'gcash',
            'maya',
            'card',
            'bank_transfer',
            'other'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'payment_status'
          AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public.payment_status AS ENUM (
            'pending',
            'paid',
            'refunded',
            'voided',
            'failed'
        );
    END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 2. Payments
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id UUID NOT NULL
        REFERENCES public.tenants(id) ON DELETE CASCADE,

    appointment_id UUID,
    customer_id UUID,

    amount_cents INTEGER NOT NULL DEFAULT 0
        CHECK (amount_cents >= 0),

    currency CHAR(3) NOT NULL DEFAULT 'PHP',

    method public.payment_method NOT NULL DEFAULT 'cash',

    status public.payment_status NOT NULL DEFAULT 'pending',

    reference TEXT,

    paid_at TIMESTAMPTZ,

    created_by UUID
        REFERENCES public.profiles(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- A linked appointment must belong to the same tenant.
    CONSTRAINT payments_appointment_fkey
        FOREIGN KEY (tenant_id, appointment_id)
        REFERENCES public.appointments (tenant_id, id)
        ON DELETE SET NULL (appointment_id),

    -- A linked customer must belong to the same tenant.
    CONSTRAINT payments_customer_fkey
        FOREIGN KEY (tenant_id, customer_id)
        REFERENCES public.customers (tenant_id, id)
        ON DELETE SET NULL (customer_id)
);

COMMENT ON TABLE public.payments IS
    'Tenant-scoped payment records for appointments, revenue reporting, and financial exports.';

COMMENT ON COLUMN public.payments.amount_cents IS
    'Payment amount in integer minor units; for PHP, this represents centavos.';

COMMENT ON COLUMN public.payments.currency IS
    'Three-character ISO currency code; defaults to PHP.';

COMMENT ON COLUMN public.payments.status IS
    'Current payment status. Refund and void operations retain the original payment row.';

COMMENT ON COLUMN public.payments.reference IS
    'Optional payment provider reference, transaction identifier, or receipt reference.';

COMMENT ON COLUMN public.payments.paid_at IS
    'Timestamp when the payment was received. Revenue reports use this timestamp.';

-- ----------------------------------------------------------------------------
-- 3. Indexes
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS payments_tenant_paid_at_idx
    ON public.payments (tenant_id, paid_at);

CREATE INDEX IF NOT EXISTS payments_appointment_id_idx
    ON public.payments (appointment_id);

-- Supports customer self-service payment history.
CREATE INDEX IF NOT EXISTS payments_tenant_customer_id_idx
    ON public.payments (tenant_id, customer_id)
    WHERE customer_id IS NOT NULL;

-- Supports daily revenue queries for paid transactions.
CREATE INDEX IF NOT EXISTS payments_tenant_paid_revenue_idx
    ON public.payments (tenant_id, paid_at)
    WHERE status = 'paid';

-- ----------------------------------------------------------------------------
-- 4. updated_at trigger
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS payments_set_updated_at
    ON public.payments;

CREATE TRIGGER payments_set_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Row Level Security
-- ----------------------------------------------------------------------------

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Remove policies with these names if this migration is reapplied.
DROP POLICY IF EXISTS payments_operational_select
    ON public.payments;

DROP POLICY IF EXISTS payments_operational_insert
    ON public.payments;

DROP POLICY IF EXISTS payments_operational_update
    ON public.payments;

DROP POLICY IF EXISTS payments_customer_select
    ON public.payments;

-- Operational members may read payments in their tenant.
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
);

-- Operational members may create payments in their tenant.
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
);

-- Operational members may update payment records in their tenant.
-- Owners/admins may set any allowed payment status.
-- Receptionists/staff cannot set a payment to refunded or voided.
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
);

-- Customers may read only payments linked to their own customer record.
-- Customers receive no payment write policy.
CREATE POLICY payments_customer_select
ON public.payments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.customers c
        WHERE c.id = payments.customer_id
          AND c.tenant_id = payments.tenant_id
          AND c.profile_id = auth.uid()
    )
);

-- No DELETE policy is created. Payment rows must be retained.

-- ----------------------------------------------------------------------------
-- 6. Grants
-- ----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO authenticated;

REVOKE ALL ON public.payments FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE
ON public.payments
TO authenticated;

-- Deliberately do not grant DELETE.
-- RLS determines which payment rows each authenticated user may access.

COMMIT;

-- No Realtime publication changes are required for this migration.