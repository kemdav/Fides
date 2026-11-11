-- ============================================================================
-- Fides — Merchant Website Settings, Draft State, Storage & Domain Management
-- Migration: 00012_website_settings.sql
-- ============================================================================

BEGIN;

-- 1. Extend public.tenant_settings
ALTER TABLE public.tenant_settings
ADD COLUMN IF NOT EXISTS draft_settings JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS dominant_color TEXT DEFAULT '#FBF8F3',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#231F1A',
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#C96E4B',
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

$$
;

-- 2. Row Level Security on public.tenants and public.tenant_settings (QA #15)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_update_owner_or_admin ON public.tenants;
DROP POLICY IF EXISTS tenants_update_owner ON public.tenants;
CREATE POLICY tenants_update_owner
    ON public.tenants
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = tenants.id
              AND tm.profile_id = auth.uid()
              AND tm.role = 'owner'
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.tenant_id = tenants.id
              AND p.id = auth.uid()
              AND p.role = 'owner'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = tenants.id
              AND tm.profile_id = auth.uid()
              AND tm.role = 'owner'
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.tenant_id = tenants.id
              AND p.id = auth.uid()
              AND p.role = 'owner'
        )
    );

DROP POLICY IF EXISTS tenant_settings_update_owner_admin ON public.tenant_settings;
DROP POLICY IF EXISTS tenant_settings_update_owner ON public.tenant_settings;
CREATE POLICY tenant_settings_update_owner
    ON public.tenant_settings
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = tenant_settings.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role = 'owner'
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.tenant_id = tenant_settings.tenant_id
              AND p.id = auth.uid()
              AND p.role = 'owner'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = tenant_settings.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role = 'owner'
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.tenant_id = tenant_settings.tenant_id
              AND p.id = auth.uid()
              AND p.role = 'owner'
        )
    );

DROP POLICY IF EXISTS tenant_settings_insert_owner_admin ON public.tenant_settings;
DROP POLICY IF EXISTS tenant_settings_insert_owner ON public.tenant_settings;
CREATE POLICY tenant_settings_insert_owner
    ON public.tenant_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = tenant_settings.tenant_id
              AND tm.profile_id = auth.uid()
              AND tm.role = 'owner'
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.tenant_id = tenant_settings.tenant_id
              AND p.id = auth.uid()
              AND p.role = 'owner'
        )
    );

-- 3. Provision Supabase Storage Bucket ('tenant-assets')
DO
$$

BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
'tenant-assets',
'tenant-assets',
true,
5242880,
ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
public = true,
file_size_limit = 5242880,
allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
END IF;
END $$;

-- 4. Tenant-Isolated Storage Policies on storage.objects (QA #8 & #15)
DO $$
BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
BEGIN
DROP POLICY IF EXISTS "tenant_assets_public_read" ON storage.objects;
CREATE POLICY "tenant_assets_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tenant-assets');

            DROP POLICY IF EXISTS "tenant_assets_owner_insert" ON storage.objects;
            CREATE POLICY "tenant_assets_owner_insert"
                ON storage.objects FOR INSERT
                TO authenticated
                WITH CHECK (
                    bucket_id = 'tenant-assets'
                    AND (
                        EXISTS (
                            SELECT 1 FROM public.tenant_memberships tm
                            WHERE tm.tenant_id::text = (storage.foldername(name))[1]
                              AND tm.profile_id = auth.uid()
                              AND tm.role = 'owner'
                        )
                        OR EXISTS (
                            SELECT 1 FROM public.profiles p
                            WHERE p.tenant_id::text = (storage.foldername(name))[1]
                              AND p.id = auth.uid()
                              AND p.role = 'owner'
                        )
                    )
                );

            DROP POLICY IF EXISTS "tenant_assets_owner_update" ON storage.objects;
            CREATE POLICY "tenant_assets_owner_update"
                ON storage.objects FOR UPDATE
                TO authenticated
                USING (
                    bucket_id = 'tenant-assets'
                    AND (
                        EXISTS (
                            SELECT 1 FROM public.tenant_memberships tm
                            WHERE tm.tenant_id::text = (storage.foldername(name))[1]
                              AND tm.profile_id = auth.uid()
                              AND tm.role = 'owner'
                        )
                        OR EXISTS (
                            SELECT 1 FROM public.profiles p
                            WHERE p.tenant_id::text = (storage.foldername(name))[1]
                              AND p.id = auth.uid()
                              AND p.role = 'owner'
                        )
                    )
                );

            DROP POLICY IF EXISTS "tenant_assets_owner_delete" ON storage.objects;
            CREATE POLICY "tenant_assets_owner_delete"
                ON storage.objects FOR DELETE
                TO authenticated
                USING (
                    bucket_id = 'tenant-assets'
                    AND (
                        EXISTS (
                            SELECT 1 FROM public.tenant_memberships tm
                            WHERE tm.tenant_id::text = (storage.foldername(name))[1]
                              AND tm.profile_id = auth.uid()
                              AND tm.role = 'owner'
                        )
                        OR EXISTS (
                            SELECT 1 FROM public.profiles p
                            WHERE p.tenant_id::text = (storage.foldername(name))[1]
                              AND p.id = auth.uid()
                              AND p.role = 'owner'
                        )
                    )
                );
        EXCEPTION
            WHEN insufficient_privilege THEN
                RAISE NOTICE 'Skipping storage.objects policy creation due to table ownership privileges.';
        END;
    END IF;

END $$;

COMMIT;
