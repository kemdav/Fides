-- 1. Ensure public active tenant read policy is enabled
DROP POLICY IF EXISTS tenants_select_public_active ON public.tenants;
CREATE POLICY tenants_select_public_active
  ON public.tenants FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- 2. Seed a valid test tenant (slug: "aura-wellness")
INSERT INTO public.tenants (name, slug, brand_color, status)
VALUES ('Aura Studio & Spa', 'aura-wellness', '#c35000', 'active')
ON CONFLICT (slug) DO UPDATE
SET name = 'Aura Studio & Spa', status = 'active';

-- 3. Seed optional tenant_settings if table exists
INSERT INTO public.tenant_settings (tenant_id, display_name, about)
SELECT id, 'Aura Studio & Spa', 'A tranquil sanctuary for mindful wellness.'
FROM public.tenants
WHERE slug = 'aura-wellness'
ON CONFLICT (tenant_id) DO UPDATE
SET display_name = EXCLUDED.display_name;

-- 4. Create the inquiries table for contact form submissions
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

-- 5. Enable Row Level Security and allow public submissions
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inquiries_insert_public ON public.inquiries;
CREATE POLICY inquiries_insert_public
    ON public.inquiries FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS inquiries_select_admin ON public.inquiries;
CREATE POLICY inquiries_select_admin
    ON public.inquiries FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        OR public.is_platform_admin()
    );
