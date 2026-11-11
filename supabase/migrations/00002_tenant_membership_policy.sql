-- ============================================================================
-- Fix tenant select RLS: allow authenticated users to view tenants where they
-- have an explicit membership in tenant_memberships or profile.tenant_id,
-- even if the tenant is suspended.
-- ============================================================================

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
