-- ============================================================================
-- Fides — Customer Inquiries Table & RLS Policies
-- Purpose: Store customer messages sent via the public provider contact form
--          and restrict dashboard visibility to authorized tenant members.
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

-- ----------------------------------------------------------------------------
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
-- 4. RLS Policy: Tenant Members SELECT
-- Restricts viewing inquiries to members belonging to that specific tenant.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS inquiries_select_tenant_member ON public.inquiries;
CREATE POLICY inquiries_select_tenant_member
    ON public.inquiries
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.tenant_memberships 
            WHERE tenant_memberships.tenant_id = inquiries.tenant_id 
            AND tenant_memberships.profile_id = auth.uid()
        )
    );

-- ----------------------------------------------------------------------------
-- 5. RLS Policy: Tenant Members UPDATE/DELETE
-- Allows tenant members to update or delete inquiries (e.g. mark as resolved)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS inquiries_modify_tenant_member ON public.inquiries;
CREATE POLICY inquiries_modify_tenant_member
    ON public.inquiries
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.tenant_memberships 
            WHERE tenant_memberships.tenant_id = inquiries.tenant_id 
            AND tenant_memberships.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM public.tenant_memberships 
            WHERE tenant_memberships.tenant_id = inquiries.tenant_id 
            AND tenant_memberships.profile_id = auth.uid()
        )
    );

-- ----------------------------------------------------------------------------
-- 6. Privileges
-- ----------------------------------------------------------------------------

GRANT SELECT, INSERT ON public.inquiries TO anon, authenticated;
GRANT UPDATE, DELETE ON public.inquiries TO authenticated;