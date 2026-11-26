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

-- Returns the tenant id carried in the request JWT, or falls back to
-- profiles/tenant_memberships when custom claims are absent.
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

grant execute on function public.get_my_tenant_id() to anon, authenticated;
grant execute on function public.is_platform_admin() to anon, authenticated;
grant execute on function public.current_profile_role() to authenticated;

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

-- Anonymous visitors must resolve a tenant by subdomain to render its public
-- site, so active tenants are readable to `anon` (public identity only).
drop policy if exists tenants_select_public_active on public.tenants;
create policy tenants_select_public_active
  on public.tenants for select
  to anon, authenticated
  using (status = 'active');

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

-- 1. The application_status enum
do $$
begin
    if not exists (select 1 from pg_type where typname = 'application_status' and typnamespace = 'public'::regnamespace) then
        create type public.application_status as enum ('pending', 'approved', 'rejected', 'suspended');
    end if;
end
$$;

-- 2. The subscription_plans table and its INSERT values
create table if not exists public.subscription_plans (
    code text primary key,
    name text not null,
    eyebrow text not null default '',
    price_php numeric(12, 2) not null check (price_php > 0),
    billing_cycle text not null default 'monthly',
    staff_limit integer null check (staff_limit is null or staff_limit >= 1),
    location_limit integer null check (location_limit is null or location_limit >= 1),
    features text[] not null default '{}',
    is_active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint subscription_plans_code_format check (code ~ '^[a-z0-9](?:[a-z0-9-]{0,40}[a-z0-9])?$')
);

drop trigger if exists set_updated_at on public.subscription_plans;
create trigger set_updated_at before update on public.subscription_plans
for each row execute function public.set_updated_at();

insert into public.subscription_plans (code, name, eyebrow, price_php, billing_cycle, features, sort_order)
values
    ('starter', 'Starter', 'NEW PROVIDERS', 499, 'monthly', array['Real-Time Booking Calendar', 'Custom Service & Pricing Menu', 'Staff & Resource Allocation', 'Walk-in Registration & Booking', 'QR Code Check-in System', 'Instant Booking & Status Email Alerts', 'Status Tracking & Audit Logs', 'Daily Operations Dashboard', 'Customer Profile & Visit History', 'Basic Sales & Activity Reports', 'Annual BIR Tax-Ready Reports'], 1),
    ('professional', 'Professional', 'GROWING PROVIDERS', 1299, 'monthly', array['Everything in Starter', '24/7 AI Booking Assistant', 'Automated Email Reminders', 'Smart Waiting List Management', 'Automated Commission Tracking', 'Detailed Sales & Operational Analytics', 'Quarterly BIR Tax-Ready Reports'], 2),
    ('business', 'Business', 'ESTABLISHED PROVIDERS', 3999, 'monthly', array['Everything in Professional', 'Multi-Branch Management', 'Centralized Executive Dashboard & Analytics', 'Multi-Branch Inventory Tracking', 'Consolidated Multi-Branch BIR Reporting', 'Location-Based Role & Access Control'], 3)
on conflict (code) do nothing;

-- 3. The application_reference_seq sequence and account_applications table
create sequence if not exists public.application_reference_seq start with 1001;

create table if not exists public.account_applications (
    id uuid primary key default gen_random_uuid(),
    reference_code text not null unique default ('FID-' || nextval('public.application_reference_seq')::text),
    user_id uuid not null unique references auth.users (id) on delete cascade,
    full_name text not null,
    email text not null,
    phone text not null,
    status public.application_status not null default 'pending',
    plan_code text not null references public.subscription_plans (code) on update cascade,
    terms_accepted_at timestamptz not null,
    consent_accepted_at timestamptz not null,
    submitted_at timestamptz not null default now(),
    reviewed_at timestamptz null,
    reviewed_by text null,
    review_notes text null,
    approved_at timestamptz null,
    tenant_id uuid null references public.tenants (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists account_applications_email_key on public.account_applications (lower(email));
create index if not exists account_applications_status_idx on public.account_applications (status, submitted_at);
create index if not exists account_applications_plan_idx on public.account_applications (plan_code);
create index if not exists account_applications_tenant_idx on public.account_applications (tenant_id);

drop trigger if exists set_updated_at on public.account_applications;
create trigger set_updated_at before update on public.account_applications
for each row execute function public.set_updated_at();

-- 4. The application_identities, application_businesses, and admin_activity_log tables
create table if not exists public.application_identities (
    application_id uuid primary key references public.account_applications (id) on delete cascade,
    owner_legal_name text not null,
    date_of_birth date not null,
    id_type text not null check (id_type in ('passport', 'drivers license', 'national id', 'sss gsis', 'philhealth')),
    id_document_path text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.application_identities;
create trigger set_updated_at before update on public.application_identities
for each row execute function public.set_updated_at();

create table if not exists public.application_businesses (
    application_id uuid primary key references public.account_applications (id) on delete cascade,
    business_name text not null,
    business_type text not null,
    established_year integer not null check (established_year between 1800 and 2100),
    street_address text not null,
    city text not null,
    province text not null,
    zip_code text not null,
    logo_path text null,
    logo_url text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.application_businesses;
create trigger set_updated_at before update on public.application_businesses
for each row execute function public.set_updated_at();

create table if not exists public.admin_activity_log (
    id uuid primary key default gen_random_uuid(),
    application_id uuid null references public.account_applications (id) on delete set null,
    business_name text not null,
    actor text not null default 'Platform administrator',
    action text not null,
    category text not null check (category in ('verification', 'account', 'pricing')),
    before_value text not null default '',
    after_value text not null default '',
    reason text not null default '',
    created_at timestamptz not null default now()
);

create index if not exists admin_activity_log_created_idx on public.admin_activity_log (created_at desc);
create index if not exists admin_activity_log_application_idx on public.admin_activity_log(application_id);

-- 5. The storage.buckets insert for business-logos and its RLS policy
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'business-logos',
    'business-logos',
    true,
    2097152,
    array['image/jpeg', 'image/png', 'image/webp']
) on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists business_logos_public_read on storage.objects;
create policy business_logos_public_read on storage.objects
for select to anon, authenticated
using (bucket_id = 'business-logos');