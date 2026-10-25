-- Fides module: tenant public branding and public-site settings
-- Suggested filename: supabase/migrations/20261024000000_tenant_public_settings.sql
-- Assumptions:
--   * public.tenants and public.set_updated_at() already exist in the baseline.
--   * The baseline uses public.tenant_memberships (role owner/manager/...) and
--     public.platform_admins for platform administrators.
--   * This migration intentionally does not alter existing tenants RLS policies.
--
-- IMPORTANT: The ticket's requested current_profile_role() helper is not present
-- in the baseline described above. This migration uses explicit membership/admin
-- checks instead of inventing a dependency on an undefined helper.

begin;

alter table public.tenants
  add column if not exists logo_url text,
  add column if not exists brand_color text,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists timezone text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tenants'::regclass
      and conname = 'tenants_brand_color_hex_check'
  ) then
    alter table public.tenants
      add constraint tenants_brand_color_hex_check
      check (brand_color is null or brand_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end
$$;

create table if not exists public.tenant_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  display_name text,
  tagline text,
  about text,
  currency char(3) not null default 'PHP',
  locale text not null default 'en-PH',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tenant_settings_set_updated_at on public.tenant_settings;
create trigger tenant_settings_set_updated_at
  before update on public.tenant_settings
  for each row execute function public.set_updated_at();

alter table public.tenant_settings enable row level security;

-- Preserve the existing public.tenants policies unchanged.
drop policy if exists tenant_settings_authenticated_read on public.tenant_settings;
create policy tenant_settings_authenticated_read
  on public.tenant_settings for select to authenticated
  using (private.is_tenant_member(tenant_id) or private.is_platform_admin());

drop policy if exists tenant_settings_owner_admin_insert on public.tenant_settings;
create policy tenant_settings_owner_admin_insert
  on public.tenant_settings for insert to authenticated
  with check (
    private.has_tenant_role(tenant_id, array['owner'])
    or private.is_platform_admin()
  );

drop policy if exists tenant_settings_owner_admin_update on public.tenant_settings;
create policy tenant_settings_owner_admin_update
  on public.tenant_settings for update to authenticated
  using (
    private.has_tenant_role(tenant_id, array['owner'])
    or private.is_platform_admin()
  )
  with check (
    private.has_tenant_role(tenant_id, array['owner'])
    or private.is_platform_admin()
  );

drop policy if exists tenant_settings_anon_active_read on public.tenant_settings;
create policy tenant_settings_anon_active_read
  on public.tenant_settings for select to anon
  using (
    exists (
      select 1 from public.tenants t
      where t.id = tenant_settings.tenant_id
        and t.status = 'active'
    )
  );

revoke all on public.tenant_settings from anon, authenticated;
grant select on public.tenant_settings to anon, authenticated;
grant insert, update on public.tenant_settings to authenticated;

commit;

-- Registration must create the settings row after the tenant row, ideally in
-- the same server-side transaction/RPC:
-- insert into public.tenant_settings (tenant_id, display_name)
-- values (new_tenant_id, new_business_name);
-- Never expose the Supabase service-role key in the browser.
