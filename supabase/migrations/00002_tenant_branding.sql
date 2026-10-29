-- ============================================================================
-- Fides — Tenant branding and public-site settings
-- Migration: 00002_tenant_branding.sql
-- Purpose: Add public branding/contact fields and per-tenant site settings.
-- Depends on the baseline migration defining:
--   public.tenants, public.set_updated_at(), public.get_my_tenant_id(),
--   public.current_profile_role()
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Public tenant branding and contact fields
-- ----------------------------------------------------------------------------

ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS brand_color TEXT,
    ADD COLUMN IF NOT EXISTS accent_color TEXT,
    ADD COLUMN IF NOT EXISTS secondary_color TEXT,
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Add the color validation constraints idempotently.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tenants_brand_color_format'
          AND conrelid = 'public.tenants'::regclass
    ) THEN
        ALTER TABLE public.tenants
            ADD CONSTRAINT tenants_brand_color_format
            CHECK (brand_color IS NULL OR brand_color ~ '^#[0-9A-Fa-f]{6}$');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tenants_accent_color_format'
          AND conrelid = 'public.tenants'::regclass
    ) THEN
        ALTER TABLE public.tenants
            ADD CONSTRAINT tenants_accent_color_format
            CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9A-Fa-f]{6}$');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tenants_secondary_color_format'
          AND conrelid = 'public.tenants'::regclass
    ) THEN
        ALTER TABLE public.tenants
            ADD CONSTRAINT tenants_secondary_color_format
            CHECK (secondary_color IS NULL OR secondary_color ~ '^#[0-9A-Fa-f]{6}$');
    END IF;
END
$$;

COMMENT ON COLUMN public.tenants.logo_url IS
    'Public logo URL for the tenant website.';
COMMENT ON COLUMN public.tenants.brand_color IS
    'Primary tenant brand color in #RRGGBB format.';
COMMENT ON COLUMN public.tenants.accent_color IS
    'Accent tenant brand color in #RRGGBB format.';
COMMENT ON COLUMN public.tenants.secondary_color IS
    'Secondary tenant brand color in #RRGGBB format.';

-- ----------------------------------------------------------------------------
-- 2. One settings row per tenant
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_settings (
    tenant_id UUID PRIMARY KEY
        REFERENCES public.tenants(id) ON DELETE CASCADE,
    display_name TEXT,
    tagline TEXT,
    about TEXT,
    currency CHAR(3) NOT NULL DEFAULT 'PHP',
    locale TEXT NOT NULL DEFAULT 'en-PH',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tenant_settings IS
    'One row per tenant for public-site display and localization settings.';

-- ----------------------------------------------------------------------------
-- 3. updated_at trigger
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS set_updated_at ON public.tenant_settings;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.tenant_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Row Level Security
-- ----------------------------------------------------------------------------

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_settings_select_own_tenant
    ON public.tenant_settings;
CREATE POLICY tenant_settings_select_own_tenant
    ON public.tenant_settings
    FOR SELECT
    TO authenticated
    USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS tenant_settings_select_public_active
    ON public.tenant_settings;
CREATE POLICY tenant_settings_select_public_active
    ON public.tenant_settings
    FOR SELECT
    TO anon
    USING (
        EXISTS (
            SELECT 1
            FROM public.tenants AS t
            WHERE t.id = tenant_settings.tenant_id
              AND t.status = 'active'
        )
    );

DROP POLICY IF EXISTS tenant_settings_insert_owner_admin
    ON public.tenant_settings;
CREATE POLICY tenant_settings_insert_owner_admin
    ON public.tenant_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND public.current_profile_role() IN ('owner', 'admin')
    );

DROP POLICY IF EXISTS tenant_settings_update_owner_admin
    ON public.tenant_settings;
CREATE POLICY tenant_settings_update_owner_admin
    ON public.tenant_settings
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.current_profile_role() IN ('owner', 'admin')
    )
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND public.current_profile_role() IN ('owner', 'admin')
    );

DROP POLICY IF EXISTS tenant_settings_delete_owner_admin
    ON public.tenant_settings;
CREATE POLICY tenant_settings_delete_owner_admin
    ON public.tenant_settings
    FOR DELETE
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.current_profile_role() IN ('owner', 'admin')
    );

-- ----------------------------------------------------------------------------
-- 5. Grants
-- RLS controls which rows can be read or changed.
-- Service-role registration flows can create the tenant and its settings row.
-- ----------------------------------------------------------------------------

GRANT SELECT ON public.tenant_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tenant_settings TO authenticated;

-- No Realtime publication changes are made by this migration.
