-- ============================================================================
-- Fides — Merchant Website Settings, Draft State, Storage & Domain Management
-- Migration: 00012_website_settings.sql
-- Purpose:
--   1. Extend tenant_settings with live configuration, working draft JSONB,
--      custom domain verification state, and SEO metadata.
--   2. Enforce Role-Based Access Control: mutations strictly restricted to
--      authenticated users with the 'owner' or 'admin' role.
--   3. Provision tenant-isolated Supabase Storage bucket ('tenant-assets')
--      with strict folder-level RLS policies.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Extend public.tenant_settings
-- ----------------------------------------------------------------------------

ALTER TABLE public.tenant_settings
    ADD COLUMN IF NOT EXISTS draft_settings JSONB DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS typography TEXT NOT NULL DEFAULT 'Ovo + Mulish',
    ADD COLUMN IF NOT EXISTS headline TEXT NOT NULL DEFAULT 'A little time for yourself.',
    ADD COLUMN IF NOT EXISTS supporting_message TEXT,
    ADD COLUMN IF NOT EXISTS cover_photo_name TEXT DEFAULT 'bella-vita-studio.jpg',
    ADD COLUMN IF NOT EXISTS cover_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS show_featured_services BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS show_contact_details BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS business_category TEXT NOT NULL DEFAULT 'Beauty & wellness',
    ADD COLUMN IF NOT EXISTS business_email TEXT,
    ADD COLUMN IF NOT EXISTS phone_number TEXT,
    ADD COLUMN IF NOT EXISTS instagram TEXT,
    ADD COLUMN IF NOT EXISTS street_address TEXT,
    ADD COLUMN IF NOT EXISTS city_province TEXT,
    ADD COLUMN IF NOT EXISTS postal_code TEXT,
    ADD COLUMN IF NOT EXISTS hours_mon_fri TEXT NOT NULL DEFAULT '9:00 AM – 6:00 PM',
    ADD COLUMN IF NOT EXISTS hours_sat TEXT NOT NULL DEFAULT '10:00 AM – 5:00 PM',
    ADD COLUMN IF NOT EXISTS hours_sun TEXT NOT NULL DEFAULT 'Closed',
    ADD COLUMN IF NOT EXISTS time_zone TEXT NOT NULL DEFAULT 'Asia/Manila (UTC+08:00)',
    ADD COLUMN IF NOT EXISTS show_opening_hours BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS custom_domain TEXT,
    ADD COLUMN IF NOT EXISTS custom_domain_status TEXT NOT NULL DEFAULT 'pending_verification',
    ADD COLUMN IF NOT EXISTS custom_domain_token TEXT,
    ADD COLUMN IF NOT EXISTS custom_domain_last_checked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS page_title TEXT,
    ADD COLUMN IF NOT EXISTS meta_description TEXT,
    ADD COLUMN IF NOT EXISTS allow_indexing BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS social_title TEXT,
    ADD COLUMN IF NOT EXISTS social_description TEXT,
    ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Conditional domain format constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tenant_settings_custom_domain_format'
          AND conrelid = 'public.tenant_settings'::regclass
    ) THEN
        ALTER TABLE public.tenant_settings
            ADD CONSTRAINT tenant_settings_custom_domain_format
            CHECK (custom_domain IS NULL OR custom_domain ~ '^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
    END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 2. Row Level Security on public.tenant_settings
-- ----------------------------------------------------------------------------

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- Owner / Admin strictly restricted update policy
DROP POLICY IF EXISTS tenant_settings_update_owner_admin ON public.tenant_settings;
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

-- Owner / Admin strictly restricted insert policy
DROP POLICY IF EXISTS tenant_settings_insert_owner_admin ON public.tenant_settings;
CREATE POLICY tenant_settings_insert_owner_admin
    ON public.tenant_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND public.current_profile_role() IN ('owner', 'admin')
    );

-- ----------------------------------------------------------------------------
-- 3. Provision Supabase Storage Bucket ('tenant-assets')
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'tenant-assets',
            'tenant-assets',
            true,
            5242880, -- 5 MB limit
            ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
        )
        ON CONFLICT (id) DO UPDATE SET
            public = true,
            file_size_limit = 5242880,
            allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Tenant-Isolated Storage Policies on storage.objects
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

        -- Public Read for all tenant assets (so client websites and previews render images)
        DROP POLICY IF EXISTS "tenant_assets_public_read" ON storage.objects;
        CREATE POLICY "tenant_assets_public_read"
            ON storage.objects FOR SELECT
            TO public
            USING (bucket_id = 'tenant-assets');

        -- Tenant Owner/Admin Insert: folder must match caller's tenant_id
        DROP POLICY IF EXISTS "tenant_assets_owner_insert" ON storage.objects;
        CREATE POLICY "tenant_assets_owner_insert"
            ON storage.objects FOR INSERT
            TO authenticated
            WITH CHECK (
                bucket_id = 'tenant-assets'
                AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text
                AND public.current_profile_role() IN ('owner', 'admin')
            );

        -- Tenant Owner/Admin Update
        DROP POLICY IF EXISTS "tenant_assets_owner_update" ON storage.objects;
        CREATE POLICY "tenant_assets_owner_update"
            ON storage.objects FOR UPDATE
            TO authenticated
            USING (
                bucket_id = 'tenant-assets'
                AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text
                AND public.current_profile_role() IN ('owner', 'admin')
            );

        -- Tenant Owner/Admin Delete
        DROP POLICY IF EXISTS "tenant_assets_owner_delete" ON storage.objects;
        CREATE POLICY "tenant_assets_owner_delete"
            ON storage.objects FOR DELETE
            TO authenticated
            USING (
                bucket_id = 'tenant-assets'
                AND (storage.foldername(name))[1] = public.get_my_tenant_id()::text
                AND public.current_profile_role() IN ('owner', 'admin')
            );
    END IF;
END $$;

COMMIT;
