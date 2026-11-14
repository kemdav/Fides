-- ============================================================================
-- Fides — Customer Inquiries Table & RLS Policies
-- Migration: 00014_inquiries.sql
-- Purpose: Store customer messages sent via the public provider contact form
--          and restrict dashboard visibility to tenant members and platform admins.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create public.inquiries table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    topic TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.inquiries IS
    'Customer inquiries and contact messages submitted through the provider website.';

-- Index for efficient querying within tenant dashboards
CREATE INDEX IF NOT EXISTS inquiries_tenant_id_created_at_idx
    ON public.inquiries (tenant_id, created_at DESC);

-- --------------------------------z--------------------------------------------
-- 2. Enable Row Level Security (RLS)
-- ----------------------------------------------------------------------------

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. RLS Policy: Public/Anonymous INSERT
-- Allows visitors (both anon and authenticated) to submit contact messages.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS inquiries_insert_public ON public.inquiries;
CREATE POLICY inquiries_insert_public
    ON public.inquiries
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 4. RLS Policy: Tenant Members & Platform Admin SELECT
-- Restricts viewing inquiries to members belonging to that tenant or platform admins.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS inquiries_select_tenant_member_or_admin ON public.inquiries;
CREATE POLICY inquiries_select_tenant_member_or_admin
    ON public.inquiries
    FOR SELECT
    TO authenticated
    USING (
        public.is_platform_admin()
        OR tenant_id = public.get_my_tenant_id()
    );

-- Optional: Allow tenant owners/admins to update or delete inquiries (e.g. mark as resolved/archive)
DROP POLICY IF EXISTS inquiries_modify_tenant_admin ON public.inquiries;
CREATE POLICY inquiries_modify_tenant_admin
    ON public.inquiries
    FOR ALL
    TO authenticated
    USING (
        public.is_platform_admin()
        OR (
            tenant_id = public.get_my_tenant_id()
            AND public.current_profile_role() IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        public.is_platform_admin()
        OR (
            tenant_id = public.get_my_tenant_id()
            AND public.current_profile_role() IN ('owner', 'admin')
        )
    );

-- ----------------------------------------------------------------------------
-- 5. Privileges
-- ----------------------------------------------------------------------------

GRANT SELECT, INSERT ON public.inquiries TO anon, authenticated;
GRANT UPDATE, DELETE ON public.inquiries TO authenticated;
