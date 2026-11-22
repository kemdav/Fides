-- ============================================================================
-- Fides — Customer Registry Archival & Conditional Registration Invites (CPG-99)
-- Migration: 00022_customer_registry_invites.sql
--
-- Depends on: 00001_baseline.sql, 00006_customers.sql
-- Notes:
--   - Numbered after PR #23 (00020) and PR #24 (00021) to avoid conflicts.
--   - Adds soft-archival support on public.customers.
--   - Adds public.customer_invitations for walk-in conditional registration.
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'app_role'
          AND n.nspname = 'public'
    ) THEN
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';
    END IF;
END
$$;

BEGIN;

-- 1. Soft-archive timestamp on public.customers
ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS customers_tenant_archived_idx
    ON public.customers (tenant_id, archived_at);

GRANT UPDATE (archived_at) ON public.customers TO authenticated;

-- 2. Invitation status enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'customer_invite_status'
          AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public.customer_invite_status AS ENUM (
            'pending',
            'accepted',
            'canceled',
            'superseded',
            'expired'
        );
    END IF;
END
$$;

GRANT USAGE ON TYPE public.customer_invite_status TO authenticated;

-- 3. Customer invitations table (hashed single-use setup tokens)
CREATE TABLE IF NOT EXISTS public.customer_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    status public.customer_invite_status NOT NULL DEFAULT 'pending',
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT customer_invitations_token_hash_key UNIQUE (token_hash),
    CONSTRAINT customer_invitations_email_nonblank CHECK (length(btrim(email)) > 0),
    CONSTRAINT customer_invitations_customer_fkey
        FOREIGN KEY (tenant_id, customer_id)
        REFERENCES public.customers (tenant_id, id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS customer_invitations_tenant_customer_idx
    ON public.customer_invitations (tenant_id, customer_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS customer_invitations_tenant_status_idx
    ON public.customer_invitations (tenant_id, status, expires_at DESC);

DROP TRIGGER IF EXISTS customer_invitations_set_updated_at ON public.customer_invitations;
CREATE TRIGGER customer_invitations_set_updated_at
    BEFORE UPDATE ON public.customer_invitations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Row Level Security for customer_invitations
ALTER TABLE public.customer_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_invitations_operational_manage ON public.customer_invitations;
CREATE POLICY customer_invitations_operational_manage
    ON public.customer_invitations
    FOR ALL
    TO authenticated
    USING (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = customer_invitations.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.tenant_id = customer_invitations.tenant_id
              AND p.id = auth.uid()
              AND p.role IN ('owner', 'admin', 'receptionist', 'staff')
        )
    )
    WITH CHECK (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = customer_invitations.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role IN ('owner', 'admin', 'receptionist', 'staff')
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.tenant_id = customer_invitations.tenant_id
              AND p.id = auth.uid()
              AND p.role IN ('owner', 'admin', 'receptionist', 'staff')
        )
    );

REVOKE ALL ON public.customer_invitations FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.customer_invitations TO authenticated;

COMMIT;