-- ============================================================================
-- Fides — Baseline migration
-- ============================================================================
-- Establishes the foundational multi-tenant platform schema:
--   * required PostgreSQL extensions (uuid, crypto, vector)
--   * core enums
--   * tenants / profiles / tenant_memberships tables
--   * Row Level Security (RLS) enforcing tenant isolation from JWT claims
--
-- Domain schemas (services, staff, appointments, resources, inventory, etc.)
-- are introduced by later migrations alongside their features.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------------------
create schema if not exists extensions;

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "vector" with schema extensions;

-- ----------------------------------------------------------------------------
-- 2. Enumerated types
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'owner', 'receptionist', 'staff');
  end if;

  if not exists (select 1 from pg_type where typname = 'tenant_status') then
    create type public.tenant_status as enum ('pending', 'active', 'suspended', 'archived');
  end if;
end
$$;

-- ----------------------------------------------------------------------------
-- 3. Core tables
-- ----------------------------------------------------------------------------

-- A tenant is an independent service business operating on the platform.
create table if not exists public.tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null,
  status      public.tenant_status not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint tenants_slug_key unique (slug),
  constraint tenants_slug_format
    check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$')
);

comment on table public.tenants is
  'A service business (tenant). Its slug maps to a wildcard subdomain.';

-- One profile per authenticated user, scoped to a tenant (platform admins have
-- a null tenant_id).
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        public.app_role not null default 'owner',
  tenant_id   uuid references public.tenants(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Application profile extending auth.users with role and tenant membership.';

-- Explicit membership join, allowing a profile to belong to more than one
-- tenant (e.g. an owner operating multiple branches) with a per-tenant role.
create table if not exists public.tenant_memberships (
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  role        public.app_role not null default 'staff',
  created_at  timestamptz not null default now(),
  primary key (tenant_id, profile_id)
);

comment on table public.tenant_memberships is
  'Per-tenant membership and role for a profile.';

create index if not exists tenant_memberships_profile_id_idx
  on public.tenant_memberships (profile_id);

create index if not exists profiles_tenant_id_idx
  on public.profiles (tenant_id);

-- ----------------------------------------------------------------------------
-- 4. Shared utilities
-- ----------------------------------------------------------------------------

-- Keeps `updated_at` current on every update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.tenants;
create trigger set_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. JWT claim helpers (used by RLS policies)
-- ----------------------------------------------------------------------------

-- Returns the tenant id carried in the request JWT, or null when absent.
-- Accepts the claim either at the top level or under `app_metadata`.
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
begin
  claims := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );

  raw := coalesce(claims ->> 'tenant_id', claims -> 'app_metadata' ->> 'tenant_id');

  if raw is null
     or raw !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;

  return raw::uuid;
end;
$$;

-- True when the current user is a Fides platform administrator.
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

  return coalesce(
    claims -> 'app_metadata' ->> 'role',
    claims ->> 'role'
  ) = 'admin';
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. Profile provisioning
-- ----------------------------------------------------------------------------

-- Creates a profile row for every new auth user, seeding role and tenant from
-- the user's app metadata. Runs as the table owner so it bypasses RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb;
  resolved_role public.app_role;
  resolved_tenant uuid;
  raw_tenant text;
begin
  meta := coalesce(new.raw_app_meta_data, '{}'::jsonb);

  resolved_role := coalesce((meta ->> 'role')::public.app_role, 'owner');

  raw_tenant := meta ->> 'tenant_id';
  if raw_tenant ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    resolved_tenant := raw_tenant::uuid;
  end if;

  insert into public.profiles (id, email, full_name, role, tenant_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    resolved_role,
    resolved_tenant
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 7. Role helper
-- ----------------------------------------------------------------------------

-- Returns the platform role of the current user's profile, or null.
create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- 8. Row Level Security — tenant isolation
-- ----------------------------------------------------------------------------
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_memberships enable row level security;

-- tenants ---------------------------------------------------------------------
drop policy if exists tenants_select_member_or_admin on public.tenants;
create policy tenants_select_member_or_admin
  on public.tenants for select
  to authenticated
  using (public.is_platform_admin() or id = public.get_my_tenant_id());

-- Anonymous visitors must resolve a tenant by subdomain to render its public
-- site, so active tenants are readable to `anon` (public identity only).
drop policy if exists tenants_select_public_active on public.tenants;
create policy tenants_select_public_active
  on public.tenants for select
  to anon, authenticated
  using (status = 'active');

drop policy if exists tenants_update_owner_or_admin on public.tenants;
create policy tenants_update_owner_or_admin
  on public.tenants for update
  to authenticated
  using (
    public.is_platform_admin()
    or (
      id = public.get_my_tenant_id()
      and public.current_profile_role() in ('owner', 'admin')
    )
  )
  with check (public.is_platform_admin() or id = public.get_my_tenant_id());

-- profiles --------------------------------------------------------------------
drop policy if exists profiles_select_self_tenant_or_admin on public.profiles;
create policy profiles_select_self_tenant_or_admin
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or public.is_platform_admin()
    or (tenant_id is not null and tenant_id = public.get_my_tenant_id())
  );

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_platform_admin())
  with check (id = auth.uid() or public.is_platform_admin());

-- tenant_memberships ----------------------------------------------------------
drop policy if exists memberships_select_tenant_or_admin on public.tenant_memberships;
create policy memberships_select_tenant_or_admin
  on public.tenant_memberships for select
  to authenticated
  using (
    public.is_platform_admin()
    or profile_id = auth.uid()
    or tenant_id = public.get_my_tenant_id()
  );

drop policy if exists memberships_manage_tenant_owner on public.tenant_memberships;
create policy memberships_manage_tenant_owner
  on public.tenant_memberships for all
  to authenticated
  using (
    public.is_platform_admin()
    or (
      tenant_id = public.get_my_tenant_id()
      and public.current_profile_role() in ('owner', 'admin')
    )
  )
  with check (
    public.is_platform_admin()
    or tenant_id = public.get_my_tenant_id()
  );

-- ----------------------------------------------------------------------------
-- 9. Privileges
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

-- Tenants: public read of active tenants; owners update their own tenant.
-- Creation/deletion is handled by server-side flows using the service role.
grant select on public.tenants to anon, authenticated;
grant update on public.tenants to authenticated;

-- Profiles: members read profiles within their tenant. Users may update only
-- safe columns so they cannot escalate their own role or tenant.
grant select on public.profiles to authenticated;
grant update (full_name, email) on public.profiles to authenticated;

-- Memberships: managed by tenant owners/admins (enforced by RLS policies).
grant select, insert, update, delete on public.tenant_memberships to authenticated;

grant execute on function public.get_my_tenant_id() to anon, authenticated;
grant execute on function public.is_platform_admin() to anon, authenticated;
grant execute on function public.current_profile_role() to authenticated;
