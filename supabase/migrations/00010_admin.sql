-- ============================================================
-- Fides: Platform Administration and Subscription Schema
-- Migration: 00010_admin.sql
--
-- Purpose:
--   Verification documents, subscription tiers, tier features,
--   and tenant subscriptions.
--
-- Dependencies:
--   public.tenants
--   public.profiles
--   public.tenant_memberships
--   public.is_platform_admin()
--   public.set_updated_at()
--
-- Security:
--   - Platform admins manage verification and subscriptions.
--   - Tenant owners can read their own verification status
--     and subscription.
--   - Anonymous users can read active pricing tiers/features.
--   - Customers and tenant owners cannot modify subscription
--     or verification records through ordinary client access.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Enums
-- ------------------------------------------------------------

DO $$
BEGIN
    CREATE TYPE public.verification_status AS ENUM (
        'pending',
        'approved',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
    CREATE TYPE public.subscription_status AS ENUM (
        'trialing',
        'active',
        'past_due',
        'cancelled',
        'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END;
$$;

-- ------------------------------------------------------------
-- 2. Verification documents
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.verification_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id uuid NOT NULL
        REFERENCES public.tenants(id)
        ON DELETE CASCADE,

    doc_type text NOT NULL,
    storage_path text NOT NULL,

    status public.verification_status NOT NULL DEFAULT 'pending',

    reviewed_by uuid
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    reviewed_at timestamptz,
    rejection_reason text,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verification_documents_tenant_status_idx
    ON public.verification_documents (tenant_id, status);

-- ------------------------------------------------------------
-- 3. Subscription tiers
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subscription_tiers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    code text NOT NULL UNIQUE
        CHECK (code IN ('basic', 'business', 'enterprise')),

    name text NOT NULL,

    price_cents integer NOT NULL DEFAULT 0
        CHECK (price_cents >= 0),

    billing_interval text NOT NULL DEFAULT 'month'
        CHECK (billing_interval IN ('month', 'year')),

    active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,

    created_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 4. Tier features
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tier_features (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    tier_id uuid NOT NULL
        REFERENCES public.subscription_tiers(id)
        ON DELETE CASCADE,

    feature_key text NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    limit_value integer,

    CONSTRAINT tier_features_tier_feature_unique
        UNIQUE (tier_id, feature_key)
);

CREATE INDEX IF NOT EXISTS tier_features_tier_id_idx
    ON public.tier_features (tier_id);

-- ------------------------------------------------------------
-- 5. Tenant subscriptions
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id uuid NOT NULL
        REFERENCES public.tenants(id)
        ON DELETE CASCADE,

    tier_id uuid NOT NULL
        REFERENCES public.subscription_tiers(id),

    status public.subscription_status NOT NULL DEFAULT 'trialing',

    trial_ends_at timestamptz,
    current_period_start timestamptz,
    current_period_end timestamptz,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Required tenant lookup index.
CREATE INDEX IF NOT EXISTS subscriptions_tenant_id_idx
    ON public.subscriptions (tenant_id);

-- At most one live subscription per tenant.
-- Cancelled and expired subscriptions remain in history.
CREATE UNIQUE INDEX IF NOT EXISTS
    subscriptions_one_active_per_tenant
    ON public.subscriptions (tenant_id)
    WHERE status IN ('trialing', 'active', 'past_due');

-- ------------------------------------------------------------
-- 6. Updated-at triggers
-- ------------------------------------------------------------

DROP TRIGGER IF EXISTS
    set_verification_documents_updated_at
    ON public.verification_documents;

CREATE TRIGGER set_verification_documents_updated_at
    BEFORE UPDATE ON public.verification_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS
    set_subscriptions_updated_at
    ON public.subscriptions;

CREATE TRIGGER set_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 7. Enable Row-Level Security
-- ------------------------------------------------------------

ALTER TABLE public.verification_documents
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.subscription_tiers
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tier_features
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.subscriptions
    ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 8. Verification document policies
-- ------------------------------------------------------------

-- Platform admins have full access.
DROP POLICY IF EXISTS verification_documents_platform_admin_all
    ON public.verification_documents;

CREATE POLICY verification_documents_platform_admin_all
    ON public.verification_documents
    FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- Owners can read verification documents belonging to their tenant.
-- This policy grants no write access.
DROP POLICY IF EXISTS verification_documents_owner_read
    ON public.verification_documents;

CREATE POLICY verification_documents_owner_read
    ON public.verification_documents
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.tenant_memberships AS tm
            WHERE tm.tenant_id = verification_documents.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role = 'owner'
        )
    );

-- ------------------------------------------------------------
-- 9. Public pricing policies
-- ------------------------------------------------------------

-- Anyone, including anon, can read active tiers.
DROP POLICY IF EXISTS subscription_tiers_public_read
    ON public.subscription_tiers;

CREATE POLICY subscription_tiers_public_read
    ON public.subscription_tiers
    FOR SELECT
    TO anon, authenticated
    USING (
        active = true
        OR (
            (SELECT auth.uid()) IS NOT NULL
            AND public.is_platform_admin()
        )
    );

-- Platform admins can manage all tiers, including inactive ones.
DROP POLICY IF EXISTS subscription_tiers_platform_admin_all
    ON public.subscription_tiers;

CREATE POLICY subscription_tiers_platform_admin_all
    ON public.subscription_tiers
    FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- Features are public only when their associated tier is active.
DROP POLICY IF EXISTS tier_features_public_read
    ON public.tier_features;

CREATE POLICY tier_features_public_read
    ON public.tier_features
    FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.subscription_tiers AS st
            WHERE st.id = tier_features.tier_id
              AND st.active = true
        )
        OR (
            (SELECT auth.uid()) IS NOT NULL
            AND public.is_platform_admin()
        )
    );

-- Platform admins can manage features for any tier.
DROP POLICY IF EXISTS tier_features_platform_admin_all
    ON public.tier_features;

CREATE POLICY tier_features_platform_admin_all
    ON public.tier_features
    FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- ------------------------------------------------------------
-- 10. Subscription policies
-- ------------------------------------------------------------

-- Platform admins have full access.
DROP POLICY IF EXISTS subscriptions_platform_admin_all
    ON public.subscriptions;

CREATE POLICY subscriptions_platform_admin_all
    ON public.subscriptions
    FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- Tenant owners can read subscriptions belonging to their tenant.
-- Subscription creation and changes are not permitted through
-- this owner policy; registration should use trusted server logic.
DROP POLICY IF EXISTS subscriptions_owner_read
    ON public.subscriptions;

CREATE POLICY subscriptions_owner_read
    ON public.subscriptions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.tenant_memberships AS tm
            WHERE tm.tenant_id = subscriptions.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role = 'owner'
        )
    );

-- ------------------------------------------------------------
-- 11. Table privileges
-- ------------------------------------------------------------

-- Verification documents: authenticated access is further
-- restricted by RLS. No anon grants.
REVOKE ALL ON TABLE public.verification_documents
    FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE public.verification_documents
    TO authenticated;

-- Pricing: anon and authenticated users can read tiers/features.
REVOKE ALL ON TABLE public.subscription_tiers
    FROM PUBLIC, anon;

GRANT SELECT ON TABLE public.subscription_tiers
    TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE
    ON TABLE public.subscription_tiers
    TO authenticated;

REVOKE ALL ON TABLE public.tier_features
    FROM PUBLIC, anon;

GRANT SELECT ON TABLE public.tier_features
    TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE
    ON TABLE public.tier_features
    TO authenticated;

-- Subscriptions: no anon access; authenticated access is governed
-- by platform-admin and tenant-owner RLS policies.
REVOKE ALL ON TABLE public.subscriptions
    FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE public.subscriptions
    TO authenticated;

-- No Realtime publication changes are made by this migration.

COMMIT;