-- ============================================================
-- Fides: Merchant Subscription Settings & Billing Portal (CPG-95)
-- Migration: 20261124000000_subscription_settings.sql
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Seed canonical subscription_tiers & tier_features
--    Matches Figma: Basic (₱499), Business (₱1,499), Enterprise (₱2,999)
-- ------------------------------------------------------------

INSERT INTO public.subscription_tiers (code, name, price_cents, billing_interval, active, sort_order)
VALUES
    ('basic', 'Basic', 49900, 'month', true, 1),
    ('business', 'Business', 149900, 'month', true, 2),
    ('enterprise', 'Enterprise', 299900, 'month', true, 3)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    price_cents = EXCLUDED.price_cents,
    billing_interval = EXCLUDED.billing_interval,
    active = EXCLUDED.active,
    sort_order = EXCLUDED.sort_order;

WITH tier_ids AS (
    SELECT id, code FROM public.subscription_tiers WHERE code IN ('basic', 'business', 'enterprise')
),
feature_matrix(tier_code, feature_key, enabled, limit_value) AS (
    VALUES
        -- Basic
        ('basic', 'staff_accounts', true, 3),
        ('basic', 'branches', true, 1),
        ('basic', 'appointments_per_month', true, 100),
        ('basic', 'booking_website', true, NULL),
        ('basic', 'appointment_management', true, NULL),
        ('basic', 'customer_registry', true, NULL),
        ('basic', 'custom_domain_qr', false, NULL),
        ('basic', 'reports_commissions', false, NULL),
        ('basic', 'multiple_branches', false, NULL),
        -- Business
        ('business', 'staff_accounts', true, 15),
        ('business', 'branches', true, 1),
        ('business', 'appointments_per_month', true, 1000),
        ('business', 'booking_website', true, NULL),
        ('business', 'appointment_management', true, NULL),
        ('business', 'customer_registry', true, NULL),
        ('business', 'custom_domain_qr', true, NULL),
        ('business', 'reports_commissions', true, NULL),
        ('business', 'multiple_branches', false, NULL),
        -- Enterprise
        ('enterprise', 'staff_accounts', true, 50),
        ('enterprise', 'branches', true, 3),
        ('enterprise', 'appointments_per_month', true, 5000),
        ('enterprise', 'booking_website', true, NULL),
        ('enterprise', 'appointment_management', true, NULL),
        ('enterprise', 'customer_registry', true, NULL),
        ('enterprise', 'custom_domain_qr', true, NULL),
        ('enterprise', 'reports_commissions', true, NULL),
        ('enterprise', 'multiple_branches', true, NULL)
)
INSERT INTO public.tier_features (tier_id, feature_key, enabled, limit_value)
SELECT t.id, m.feature_key, m.enabled, m.limit_value
FROM feature_matrix m
JOIN tier_ids t ON t.code = m.tier_code
ON CONFLICT (tier_id, feature_key) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    limit_value = EXCLUDED.limit_value;

-- ------------------------------------------------------------
-- 2. Extend public.subscriptions for self-service lifecycle
-- ------------------------------------------------------------

ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS scheduled_tier_id uuid REFERENCES public.subscription_tiers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS scheduled_change_effective_at timestamptz,
    ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS cancellation_reason text,
    ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
    ADD COLUMN IF NOT EXISTS trial_conversion_scheduled boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS reactivation_requested_at timestamptz,
    ADD COLUMN IF NOT EXISTS add_on_branches integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS renewal_reminders_enabled boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS renewal_reminder_days integer[] NOT NULL DEFAULT ARRAY[7, 3, 1];

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.subscriptions'::regclass
          AND conname = 'subscriptions_add_on_branches_check'
    ) THEN
        ALTER TABLE public.subscriptions
            ADD CONSTRAINT subscriptions_add_on_branches_check
            CHECK (add_on_branches >= 0);
    END IF;
END;
$$;

-- Allow all authenticated tenant members (owner + staff) to read their tenant subscription (read-only for staff)
DROP POLICY IF EXISTS subscriptions_tenant_member_read ON public.subscriptions;
CREATE POLICY subscriptions_tenant_member_read
    ON public.subscriptions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.tenant_memberships AS tm
            WHERE tm.tenant_id = subscriptions.tenant_id
              AND tm.profile_id = auth.uid()
        )
    );

-- Allow tenant owners to update lifecycle preferences on their tenant subscription
DROP POLICY IF EXISTS subscriptions_owner_update ON public.subscriptions;
CREATE POLICY subscriptions_owner_update
    ON public.subscriptions
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.tenant_memberships AS tm
            WHERE tm.tenant_id = subscriptions.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role = 'owner'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.tenant_memberships AS tm
            WHERE tm.tenant_id = subscriptions.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role = 'owner'
        )
    );

-- ------------------------------------------------------------
-- 3. Tenant billing profiles (contact, address, TIN, CC email)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_billing_profiles (
    tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    billing_name text NOT NULL,
    billing_email text NOT NULL,
    cc_email text,
    same_as_business_email boolean NOT NULL DEFAULT true,
    street_barangay text NOT NULL DEFAULT '',
    city text NOT NULL DEFAULT '',
    province text NOT NULL DEFAULT '',
    postal_code text NOT NULL DEFAULT '',
    tin text,
    branch_code text DEFAULT '000',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_tenant_billing_profiles_updated_at ON public.tenant_billing_profiles;
CREATE TRIGGER set_tenant_billing_profiles_updated_at
    BEFORE UPDATE ON public.tenant_billing_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tenant_billing_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_billing_profiles_platform_admin_all ON public.tenant_billing_profiles;
CREATE POLICY tenant_billing_profiles_platform_admin_all
    ON public.tenant_billing_profiles
    FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS tenant_billing_profiles_member_read ON public.tenant_billing_profiles;
CREATE POLICY tenant_billing_profiles_member_read
    ON public.tenant_billing_profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.tenant_memberships AS tm
            WHERE tm.tenant_id = tenant_billing_profiles.tenant_id
              AND tm.profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS tenant_billing_profiles_owner_write ON public.tenant_billing_profiles;
CREATE POLICY tenant_billing_profiles_owner_write
    ON public.tenant_billing_profiles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.tenant_memberships AS tm
            WHERE tm.tenant_id = tenant_billing_profiles.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role = 'owner'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.tenant_memberships AS tm
            WHERE tm.tenant_id = tenant_billing_profiles.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role = 'owner'
        )
    );

REVOKE ALL ON TABLE public.tenant_billing_profiles FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenant_billing_profiles TO authenticated;

-- ------------------------------------------------------------
-- 4. Subscription invoices (billing history & VAT breakdown)
-- ------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS public.subscription_invoice_seq START WITH 100;

CREATE TABLE IF NOT EXISTS public.subscription_invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    tier_id uuid REFERENCES public.subscription_tiers(id) ON DELETE SET NULL,
    invoice_number text NOT NULL UNIQUE,
    invoice_kind text NOT NULL DEFAULT 'renewal'
        CHECK (invoice_kind IN ('renewal', 'activation', 'reactivation', 'plan_change')),
    tier_name text NOT NULL,
    billing_period_start timestamptz NOT NULL,
    billing_period_end timestamptz NOT NULL,
    issued_at timestamptz NOT NULL DEFAULT now(),
    due_at timestamptz NOT NULL,
    paid_at timestamptz,
    subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
    vat_cents integer NOT NULL CHECK (vat_cents >= 0),
    total_cents integer NOT NULL CHECK (total_cents >= 0),
    amount_paid_cents integer NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0),
    status text NOT NULL DEFAULT 'unpaid'
        CHECK (status IN ('paid', 'unpaid', 'overdue', 'void')),
    billed_to_name text NOT NULL,
    billed_to_address text NOT NULL DEFAULT '',
    billed_to_tin text,
    billed_to_branch text,
    billed_to_email text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT subscription_invoices_period_check CHECK (billing_period_end > billing_period_start)
);

CREATE INDEX IF NOT EXISTS subscription_invoices_tenant_issued_idx
    ON public.subscription_invoices (tenant_id, issued_at DESC);

DROP TRIGGER IF EXISTS set_subscription_invoices_updated_at ON public.subscription_invoices;
CREATE TRIGGER set_subscription_invoices_updated_at
    BEFORE UPDATE ON public.subscription_invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_invoices_platform_admin_all ON public.subscription_invoices;
CREATE POLICY subscription_invoices_platform_admin_all
    ON public.subscription_invoices
    FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS subscription_invoices_member_read ON public.subscription_invoices;
CREATE POLICY subscription_invoices_member_read
    ON public.subscription_invoices
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.tenant_memberships AS tm
            WHERE tm.tenant_id = subscription_invoices.tenant_id
              AND tm.profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS subscription_invoices_owner_insert ON public.subscription_invoices;
CREATE POLICY subscription_invoices_owner_insert
    ON public.subscription_invoices
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.tenant_memberships AS tm
            WHERE tm.tenant_id = subscription_invoices.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role = 'owner'
        )
    );

REVOKE ALL ON TABLE public.subscription_invoices FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subscription_invoices TO authenticated;

-- ------------------------------------------------------------
-- 5. Bank transfer payment submissions (manual verification)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subscription_payment_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    invoice_id uuid NOT NULL REFERENCES public.subscription_invoices(id) ON DELETE CASCADE,
    submitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    bank_transfer_reference text NOT NULL,
    transfer_date date NOT NULL,
    amount_cents integer NOT NULL CHECK (amount_cents > 0),
    receipt_storage_path text,
    receipt_file_name text,
    status text NOT NULL DEFAULT 'pending_verification'
        CHECK (status IN ('pending_verification', 'verified', 'rejected')),
    reviewer_notes text,
    submitted_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_payment_submissions_invoice_idx
    ON public.subscription_payment_submissions (invoice_id, submitted_at DESC);

DROP TRIGGER IF EXISTS set_subscription_payment_submissions_updated_at ON public.subscription_payment_submissions;
CREATE TRIGGER set_subscription_payment_submissions_updated_at
    BEFORE UPDATE ON public.subscription_payment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.subscription_payment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_payment_submissions_platform_admin_all ON public.subscription_payment_submissions;
CREATE POLICY subscription_payment_submissions_platform_admin_all
    ON public.subscription_payment_submissions
    FOR ALL
    TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS subscription_payment_submissions_member_read ON public.subscription_payment_submissions;
CREATE POLICY subscription_payment_submissions_member_read
    ON public.subscription_payment_submissions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.tenant_memberships AS tm
            WHERE tm.tenant_id = subscription_payment_submissions.tenant_id
              AND tm.profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS subscription_payment_submissions_owner_insert ON public.subscription_payment_submissions;
CREATE POLICY subscription_payment_submissions_owner_insert
    ON public.subscription_payment_submissions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.tenant_memberships AS tm
            WHERE tm.tenant_id = subscription_payment_submissions.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role = 'owner'
        )
    );

REVOKE ALL ON TABLE public.subscription_payment_submissions FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subscription_payment_submissions TO authenticated;

-- ------------------------------------------------------------
-- 6. Private Storage bucket for bank transfer receipts (<= 10MB)
-- ------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'subscription-receipts',
    'subscription-receipts',
    false,
    10485760,
    ARRAY['image/png', 'image/jpeg', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS subscription_receipts_owner_upload ON storage.objects;
CREATE POLICY subscription_receipts_owner_upload
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'subscription-receipts'
        AND EXISTS (
            SELECT 1
            FROM public.tenant_memberships AS tm
            WHERE tm.tenant_id::text = (storage.foldername(name))[1]
              AND tm.profile_id = auth.uid()
              AND tm.role = 'owner'
        )
    );

DROP POLICY IF EXISTS subscription_receipts_member_read ON storage.objects;
CREATE POLICY subscription_receipts_member_read
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'subscription-receipts'
        AND EXISTS (
            SELECT 1
            FROM public.tenant_memberships AS tm
            WHERE tm.tenant_id::text = (storage.foldername(name))[1]
              AND tm.profile_id = auth.uid()
        )
    );

-- ------------------------------------------------------------
-- 7. Idempotent first-load bootstrapper RPC for any tenant
--    Ensures Bella Vita & newly approved tenants have a valid
--    subscription + billing profile without modifying seed.sql
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_tenant_subscription_workspace(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_member boolean;
    v_tenant_name text;
    v_tenant_slug text;
    v_owner_email text;
    v_business_tier_id uuid;
    v_sub_id uuid;
    v_period_start timestamptz;
    v_period_end timestamptz;
    v_prev_start timestamptz;
    v_prev_end timestamptz;
    v_inv_prefix text;
    v_billing_name text;
    v_billing_email text;
    v_street text;
    v_city text;
    v_province text;
    v_postal text;
    v_tin text;
    v_branch text;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.tenant_memberships
        WHERE tenant_id = p_tenant_id AND profile_id = auth.uid()
    ) OR public.is_platform_admin()
    INTO v_is_member;

    IF NOT v_is_member THEN
        RAISE EXCEPTION 'Unauthorized tenant subscription bootstrap';
    END IF;

    SELECT name, slug INTO v_tenant_name, v_tenant_slug
    FROM public.tenants
    WHERE id = p_tenant_id;

    IF v_tenant_name IS NULL THEN
        RETURN;
    END IF;

    SELECT p.email INTO v_owner_email
    FROM public.tenant_memberships tm
    JOIN public.profiles p ON p.id = tm.profile_id
    WHERE tm.tenant_id = p_tenant_id AND tm.role = 'owner'
    LIMIT 1;

    -- Defaults (matching Bella Vita Figma demo cleanly)
    IF v_tenant_slug = 'bella-vita' THEN
        v_billing_name := 'Bella Vita Salon & Spa';
        v_billing_email := 'billing@bellavita.example';
        v_street := '24 Acacia Street, Lahug';
        v_city := 'Cebu City';
        v_province := 'Cebu';
        v_postal := '6000';
        v_tin := '123-456-789';
        v_branch := '000';
    ELSE
        v_billing_name := v_tenant_name;
        v_billing_email := COALESCE(v_owner_email, 'billing@' || v_tenant_slug || '.example');
        v_street := '';
        v_city := '';
        v_province := '';
        v_postal := '';
        v_tin := NULL;
        v_branch := '000';
    END IF;

    INSERT INTO public.tenant_billing_profiles (
        tenant_id, billing_name, billing_email, cc_email, same_as_business_email,
        street_barangay, city, province, postal_code, tin, branch_code
    )
    VALUES (
        p_tenant_id, v_billing_name, v_billing_email,
        CASE WHEN v_tenant_slug = 'bella-vita' THEN 'accounts@bellavita.example' ELSE NULL END,
        true, v_street, v_city, v_province, v_postal, v_tin, v_branch
    )
    ON CONFLICT (tenant_id) DO NOTHING;

    SELECT id INTO v_sub_id
    FROM public.subscriptions
    WHERE tenant_id = p_tenant_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_sub_id IS NULL THEN
        SELECT id INTO v_business_tier_id
        FROM public.subscription_tiers
        WHERE code = 'business'
        LIMIT 1;

        v_period_start := date_trunc('month', now() AT TIME ZONE 'Asia/Manila') AT TIME ZONE 'Asia/Manila';
        v_period_end := ((date_trunc('month', now() AT TIME ZONE 'Asia/Manila') + interval '1 month') - interval '1 second') AT TIME ZONE 'Asia/Manila';
        v_prev_start := (date_trunc('month', now() AT TIME ZONE 'Asia/Manila') - interval '1 month') AT TIME ZONE 'Asia/Manila';
        v_prev_end := (date_trunc('month', now() AT TIME ZONE 'Asia/Manila') - interval '1 second') AT TIME ZONE 'Asia/Manila';

        INSERT INTO public.subscriptions (
            tenant_id, tier_id, status,
            current_period_start, current_period_end,
            renewal_reminders_enabled, renewal_reminder_days
        )
        VALUES (
            p_tenant_id, v_business_tier_id, 'active',
            v_period_start, v_period_end,
            true, ARRAY[7, 3, 1]
        )
        RETURNING id INTO v_sub_id;

        -- Seed sample paid invoices for Bella Vita demo workspace
        IF v_tenant_slug = 'bella-vita' AND NOT EXISTS (
            SELECT 1 FROM public.subscription_invoices WHERE tenant_id = p_tenant_id
        ) THEN
            v_inv_prefix := 'INV-' || to_char(now() AT TIME ZONE 'Asia/Manila', 'YYYY');

            INSERT INTO public.subscription_invoices (
                tenant_id, subscription_id, tier_id, invoice_number, invoice_kind, tier_name,
                billing_period_start, billing_period_end, issued_at, due_at, paid_at,
                subtotal_cents, vat_cents, total_cents, amount_paid_cents, status,
                billed_to_name, billed_to_address, billed_to_tin, billed_to_branch, billed_to_email
            )
            VALUES
            (
                p_tenant_id, v_sub_id, v_business_tier_id, v_inv_prefix || '-011', 'renewal', 'Business',
                v_period_start, v_period_end, v_period_start, v_period_start + interval '7 days', v_period_start + interval '2 days',
                133839, 16061, 149900, 149900, 'paid',
                v_billing_name, '24 Acacia Street, Lahug, Cebu City, Cebu 6000', v_tin, v_branch, v_billing_email
            ),
            (
                p_tenant_id, v_sub_id, v_business_tier_id, v_inv_prefix || '-010', 'renewal', 'Business',
                v_prev_start, v_prev_end, v_prev_start, v_prev_start + interval '7 days', v_prev_start + interval '1 day',
                133839, 16061, 149900, 149900, 'paid',
                v_billing_name, '24 Acacia Street, Lahug, Cebu City, Cebu 6000', v_tin, v_branch, v_billing_email
            )
            ON CONFLICT (invoice_number) DO NOTHING;
        END IF;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_tenant_subscription_workspace(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_tenant_subscription_workspace(uuid) TO authenticated;

COMMIT;