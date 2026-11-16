-- =============================================================================
-- Migration: 00002_tenant_membership_policy.sql
-- Purpose  : Allow authenticated users to read tenants they belong to via
--            either profiles.tenant_id or tenant_memberships.
-- =============================================================================

create or replace function public.get_my_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select tenant_id from public.profiles where id = auth.uid()),
    (select tenant_id from public.tenant_memberships where profile_id = auth.uid() limit 1)
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() ->> 'role') in ('platform_admin', 'admin'),
    false
  )
  or exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

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
