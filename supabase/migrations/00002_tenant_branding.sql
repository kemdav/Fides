-- ============================================================================
-- Fides — Tenant branding and public-site settings
-- Migration: 00002_tenant_branding.sql (Combined with membership policy update)
-- Purpose: Add public branding/contact fields, per-tenant site settings, and 
--          update tenant selection RLS.
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
-- 4. Tenant & Settings Helpers & Row Level Security
-- ----------------------------------------------------------------------------

create or replace function public.get_my_tenant_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims jsonb;
  raw text;
  fallback_tenant uuid;
begin
  claims := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );

  raw := coalesce(claims ->> 'tenant_id', claims -> 'app_metadata' ->> 'tenant_id');

  if raw is not null
     and raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return raw::uuid;
  end if;

  select p.tenant_id into fallback_tenant
  from public.profiles p
  where p.id = auth.uid();

  if fallback_tenant is not null then
    return fallback_tenant;
  end if;

  select tm.tenant_id into fallback_tenant
  from public.tenant_memberships tm
  where tm.profile_id = auth.uid()
  order by tm.created_at asc
  limit 1;

  return fallback_tenant;
end;
$$;

create or replace function public.is_platform_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims jsonb;
begin
  claims := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );

  if coalesce(
    claims -> 'app_metadata' ->> 'role',
    claims ->> 'role'
  ) = 'admin' then
    return true;
  end if;

  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$;

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

grant execute on function public.get_my_tenant_id() to anon, authenticated;
grant execute on function public.is_platform_admin() to anon, authenticated;
grant execute on function public.current_profile_role() to authenticated;

-- tenants RLS updates
drop policy if exists tenants_select_member_or_admin on public.tenants;
create policy tenants_select_member_or_admin
  on public.tenants for select
  to authenticated
  using (
    public.is_platform_admin()
    or id = public.get_my_tenant_id()
    or exists (
      select 1 from public.tenant_memberships tm
      where tm.tenant_id = tenants.id
        and tm.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.tenant_id = tenants.id
        and p.id = auth.uid()
    )
  );

drop policy if exists tenants_update_owner_or_admin on public.tenants;
drop policy if exists tenants_update_owner on public.tenants;
create policy tenants_update_owner
  on public.tenants for update
  to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.tenant_memberships tm
      where tm.tenant_id = tenants.id
        and tm.profile_id = auth.uid()
        and tm.role = 'owner'
    )
    or exists (
      select 1 from public.profiles p
      where p.tenant_id = tenants.id
        and p.id = auth.uid()
        and p.role = 'owner'
    )
  )
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.tenant_memberships tm
      where tm.tenant_id = tenants.id
        and tm.profile_id = auth.uid()
        and tm.role = 'owner'
    )
    or exists (
      select 1 from public.profiles p
      where p.tenant_id = tenants.id
        and p.id = auth.uid()
        and p.role = 'owner'
    )
  );

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_settings_select_own_tenant
    ON public.tenant_settings;
CREATE POLICY tenant_settings_select_own_tenant
    ON public.tenant_settings
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        OR EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = tenant_settings.tenant_id
              AND tm.profile_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.tenant_id = tenant_settings.tenant_id
              AND p.id = auth.uid()
        )
    );

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
DROP POLICY IF EXISTS tenant_settings_insert_owner
    ON public.tenant_settings;
CREATE POLICY tenant_settings_insert_owner
    ON public.tenant_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_platform_admin()
        OR EXISTS (
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

DROP POLICY IF EXISTS tenant_settings_update_owner_admin
    ON public.tenant_settings;
DROP POLICY IF EXISTS tenant_settings_update_owner
    ON public.tenant_settings;
CREATE POLICY tenant_settings_update_owner
    ON public.tenant_settings
    FOR UPDATE
    TO authenticated
    USING (
        public.is_platform_admin()
        OR EXISTS (
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
        public.is_platform_admin()
        OR EXISTS (
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

DROP POLICY IF EXISTS tenant_settings_delete_owner_admin
    ON public.tenant_settings;
DROP POLICY IF EXISTS tenant_settings_delete_owner
    ON public.tenant_settings;
CREATE POLICY tenant_settings_delete_owner
    ON public.tenant_settings
    FOR DELETE
    TO authenticated
    USING (
        public.is_platform_admin()
        OR EXISTS (
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

-- ----------------------------------------------------------------------------
-- 5. Update tenant select RLS (Membership Policy)
-- ----------------------------------------------------------------------------

drop policy if exists tenants_select_member_or_admin on public.tenants;

create policy tenants_select_member_or_admin
  on public.tenants for select
  to authenticated
  using (
    public.is_platform_admin()
    or id = public.get_my_tenant_id()
    or exists (
      select 1 from public.tenant_memberships
      where tenant_memberships.tenant_id = tenants.id
        and tenant_memberships.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles
      where profiles.tenant_id = tenants.id
        and profiles.id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 6. Grants
-- ----------------------------------------------------------------------------

GRANT SELECT ON public.tenant_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tenant_settings TO authenticated;