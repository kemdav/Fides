-- ============================================================================
-- Fides — Complete Database Setup for Account Registration & Admin Portal
-- ============================================================================
-- This migration combines all required tables, relationships, and storage setup
-- for the Fides platform including:
--   * Core multi-tenant schema (tenants, profiles, tenant_memberships)
--   * Account registration requests (account_requests)
--   * Verification documents
--   * Subscription tiers and features
--   * Tenant subscriptions
--   * Storage buckets for document/logo uploads
--   * Row Level Security (RLS) policies
-- ============================================================================

BEGIN;

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

  if not exists (select 1 from pg_type where typname = 'verification_status') then
    create type public.verification_status as enum ('pending', 'approved', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'cancelled', 'expired');
  end if;

  if not exists (select 1 from pg_type where typname = 'account_request_status') then
    create type public.account_request_status as enum ('pending', 'approved', 'suspended', 'archived');
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
  logo_url    text null,
  brand_color text null,
  accent_color text null,
  secondary_color text null,
  address     text null,
  phone       text null,
  timezone    text null,
  constraint tenants_slug_key unique (slug),
  constraint tenants_slug_format
    check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'),
  constraint tenants_brand_color_format
    check (brand_color is null or brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint tenants_accent_color_format
    check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint tenants_secondary_color_format
    check (secondary_color is null or secondary_color ~ '^#[0-9A-Fa-f]{6}$')
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
-- 4. Account Registration Requests (for pending business onboarding)
-- ----------------------------------------------------------------------------

create table if not exists public.account_requests (
  id                  uuid primary key default gen_random_uuid(),
  reference_code      text not null unique,
  business_name       text not null,
  category            text not null,
  slug                text not null unique,
  status              public.account_request_status not null default 'pending',
  owner_name          text not null,
  owner_email         text not null,
  phone               text not null,
  address             text not null,
  estimated_staff     text not null,
  license_or_tax_id   text,
  notes               text,
  reviewer_notes      text,
  reviewed_by         text,
  reset_token         text,
  reset_requested_at  timestamptz,
  revision_count      integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint account_requests_slug_format
    check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$')
);

comment on table public.account_requests is
  'Pending account registration requests awaiting admin verification.';

create index if not exists account_requests_status_idx
  on public.account_requests (status);

create index if not exists account_requests_owner_email_idx
  on public.account_requests (owner_email);

create index if not exists account_requests_slug_idx
  on public.account_requests (slug);

-- ----------------------------------------------------------------------------
-- 5. Verification documents
-- ----------------------------------------------------------------------------

create table if not exists public.verification_documents (
    id uuid primary key default gen_random_uuid(),

    tenant_id uuid not null
        references public.tenants(id)
        on delete cascade,

    doc_type text not null,
    storage_path text not null,

    status public.verification_status not null default 'pending',

    reviewed_by uuid
        references public.profiles(id)
        on delete set null,

    reviewed_at timestamptz,
    rejection_reason text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists verification_documents_tenant_status_idx
    on public.verification_documents (tenant_id, status);

-- ----------------------------------------------------------------------------
-- 6. Subscription tiers
-- ----------------------------------------------------------------------------

create table if not exists public.subscription_tiers (
    id uuid primary key default gen_random_uuid(),

    code text not null unique
        check (code in ('basic', 'business', 'enterprise')),

    name text not null,

    price_cents integer not null default 0
        check (price_cents >= 0),

    billing_interval text not null default 'month'
        check (billing_interval in ('month', 'year')),

    active boolean not null default true,
    sort_order integer not null default 0,

    created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 7. Tier features
-- ----------------------------------------------------------------------------

create table if not exists public.tier_features (
    id uuid primary key default gen_random_uuid(),

    tier_id uuid not null
        references public.subscription_tiers(id)
        on delete cascade,

    feature_key text not null,
    enabled boolean not null default true,
    limit_value integer,

    constraint tier_features_tier_feature_unique
        unique (tier_id, feature_key)
);

create index if not exists tier_features_tier_id_idx
    on public.tier_features (tier_id);

-- ----------------------------------------------------------------------------
-- 8. Tenant subscriptions
-- ----------------------------------------------------------------------------

create table if not exists public.subscriptions (
    id uuid primary key default gen_random_uuid(),

    tenant_id uuid not null
        references public.tenants(id)
        on delete cascade,

    tier_id uuid not null
        references public.subscription_tiers(id),

    status public.subscription_status not null default 'trialing',

    trial_ends_at timestamptz,
    current_period_start timestamptz,
    current_period_end timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists subscriptions_tenant_id_idx
    on public.subscriptions (tenant_id);

create unique index if not exists
    subscriptions_one_active_per_tenant
    on public.subscriptions (tenant_id)
    where status in ('trialing', 'active', 'past_due');

-- ----------------------------------------------------------------------------
-- 9. Shared utilities
-- ----------------------------------------------------------------------------

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

drop trigger if exists set_updated_at on public.account_requests;
create trigger set_updated_at
  before update on public.account_requests
  for each row execute function public.set_updated_at();

drop trigger if exists set_verification_documents_updated_at
    on public.verification_documents;
create trigger set_verification_documents_updated_at
    before update on public.verification_documents
    for each row execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at
    on public.subscriptions;
create trigger set_subscriptions_updated_at
    before update on public.subscriptions
    for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 10. JWT claim helpers (used by RLS policies)
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
-- 11. Profile provisioning
-- ----------------------------------------------------------------------------

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
-- 12. Role helper
-- ----------------------------------------------------------------------------

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
-- 13. Row Level Security — tenant isolation
-- ----------------------------------------------------------------------------
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.account_requests enable row level security;
alter table public.verification_documents enable row level security;
alter table public.subscription_tiers enable row level security;
alter table public.tier_features enable row level security;
alter table public.subscriptions enable row level security;

-- tenants ---------------------------------------------------------------------
drop policy if exists tenants_select_member_or_admin on public.tenants;
create policy tenants_select_member_or_admin
  on public.tenants for select
  to authenticated
  using (public.is_platform_admin() or id = public.get_my_tenant_id());

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

-- account_requests ------------------------------------------------------------
-- Platform admins have full access
drop policy if exists account_requests_admin_all on public.account_requests;
create policy account_requests_admin_all
  on public.account_requests for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Owners can read their own account request (if linked)
drop policy if exists account_requests_owner_read on public.account_requests;
create policy account_requests_owner_read
  on public.account_requests for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.email = account_requests.owner_email
    )
  );

-- Anon users can create account requests (for registration)
drop policy if exists account_requests_anon_insert on public.account_requests;
create policy account_requests_anon_insert
  on public.account_requests for insert
  to anon
  with check (true);

-- verification_documents ------------------------------------------------------
drop policy if exists verification_documents_platform_admin_all
    on public.verification_documents;
create policy verification_documents_platform_admin_all
    on public.verification_documents
    for all
    to authenticated
    using (public.is_platform_admin())
    with check (public.is_platform_admin());

drop policy if exists verification_documents_owner_read
    on public.verification_documents;
create policy verification_documents_owner_read
    on public.verification_documents
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.tenant_memberships as tm
            where tm.tenant_id = verification_documents.tenant_id
              and tm.profile_id = auth.uid()
              and tm.role = 'owner'
        )
    );

-- subscription_tiers ----------------------------------------------------------
drop policy if exists subscription_tiers_public_read
    on public.subscription_tiers;
create policy subscription_tiers_public_read
    on public.subscription_tiers
    for select
    to anon, authenticated
    using (
        active = true
        or (
            (select auth.uid()) is not null
            and public.is_platform_admin()
        )
    );

drop policy if exists subscription_tiers_platform_admin_all
    on public.subscription_tiers;
create policy subscription_tiers_platform_admin_all
    on public.subscription_tiers
    for all
    to authenticated
    using (public.is_platform_admin())
    with check (public.is_platform_admin());

-- tier_features ---------------------------------------------------------------
drop policy if exists tier_features_public_read
    on public.tier_features;
create policy tier_features_public_read
    on public.tier_features
    for select
    to anon, authenticated
    using (
        exists (
            select 1
            from public.subscription_tiers as st
            where st.id = tier_features.tier_id
              and st.active = true
        )
        or (
            (select auth.uid()) is not null
            and public.is_platform_admin()
        )
    );

drop policy if exists tier_features_platform_admin_all
    on public.tier_features;
create policy tier_features_platform_admin_all
    on public.tier_features
    for all
    to authenticated
    using (public.is_platform_admin())
    with check (public.is_platform_admin());

-- subscriptions ---------------------------------------------------------------
drop policy if exists subscriptions_platform_admin_all
    on public.subscriptions;
create policy subscriptions_platform_admin_all
    on public.subscriptions
    for all
    to authenticated
    using (public.is_platform_admin())
    with check (public.is_platform_admin());

drop policy if exists subscriptions_owner_read
    on public.subscriptions;
create policy subscriptions_owner_read
    on public.subscriptions
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.tenant_memberships as tm
            where tm.tenant_id = subscriptions.tenant_id
              and tm.profile_id = auth.uid()
              and tm.role = 'owner'
        )
    );

-- ----------------------------------------------------------------------------
-- 14. Table privileges
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.tenants to anon, authenticated;
grant update on public.tenants to authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, email) on public.profiles to authenticated;

grant select, insert, update, delete on public.tenant_memberships to authenticated;

grant select on public.account_requests to anon, authenticated;
grant insert on public.account_requests to anon;
grant update on public.account_requests to authenticated;

grant select, insert, update, delete on public.verification_documents to authenticated;

grant select on public.subscription_tiers to anon, authenticated;
grant insert, update, delete on public.subscription_tiers to authenticated;

grant select on public.tier_features to anon, authenticated;
grant insert, update, delete on public.tier_features to authenticated;

grant select, insert, update, delete on public.subscriptions to authenticated;

grant execute on function public.get_my_tenant_id() to anon, authenticated;
grant execute on function public.is_platform_admin() to anon, authenticated;
grant execute on function public.current_profile_role() to authenticated;

-- ----------------------------------------------------------------------------
-- 15. Storage buckets for document uploads
-- ----------------------------------------------------------------------------

-- Create storage buckets (these need to be run in Supabase dashboard or via CLI)
-- The following are reference SQL for bucket creation:
--
-- insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- values
--   ('tenant-logos', 'tenant-logos', true, 5242880, array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']),
--   ('verification-documents', 'verification-documents', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg']),
--   ('account-request-docs', 'account-request-docs', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg'])
-- on conflict (id) do nothing;

-- Storage policies for tenant-logos (public read, authenticated write for owners)
-- create policy "Public read tenant logos" on storage.objects for select using (bucket_id = 'tenant-logos');
-- create policy "Owners upload logos" on storage.objects for insert to authenticated with check (
--   bucket_id = 'tenant-logos'
--   and exists (select 1 from public.tenant_memberships tm where tm.tenant_id::text = (storage.foldername(name))[1] and tm.profile_id = auth.uid() and tm.role = 'owner')
-- );
-- create policy "Owners update logos" on storage.objects for update to authenticated using (
--   bucket_id = 'tenant-logos'
--   and exists (select 1 from public.tenant_memberships tm where tm.tenant_id::text = (storage.foldername(name))[1] and tm.profile_id = auth.uid() and tm.role = 'owner')
-- );

-- Storage policies for verification-documents (admin only)
-- create policy "Admin manage verification docs" on storage.objects for all to authenticated using (
--   bucket_id = 'verification-documents' and public.is_platform_admin()
-- ) with check (bucket_id = 'verification-documents' and public.is_platform_admin());

-- Storage policies for account-request-docs (anon upload during registration, admin read)
-- create policy "Anon upload account request docs" on storage.objects for insert to anon with check (bucket_id = 'account-request-docs');
-- create policy "Admin read account request docs" on storage.objects for select to authenticated using (bucket_id = 'account-request-docs' and public.is_platform_admin());

-- ----------------------------------------------------------------------------
-- 16. Seed default subscription tiers
-- ----------------------------------------------------------------------------

insert into public.subscription_tiers (code, name, price_cents, billing_interval, active, sort_order)
values
  ('basic', 'Starter', 0, 'month', true, 1),
  ('business', 'Business', 290000, 'month', true, 2),
  ('enterprise', 'Enterprise', 990000, 'month', true, 3)
on conflict (code) do nothing;

insert into public.tier_features (tier_id, feature_key, enabled, limit_value)
select id, 'appointments', true, null from public.subscription_tiers where code = 'basic'
union all select id, 'staff', true, 5 from public.subscription_tiers where code = 'basic'
union all select id, 'locations', true, 1 from public.subscription_tiers where code = 'basic'
union all select id, 'custom_domain', false, null from public.subscription_tiers where code = 'basic'
union all select id, 'api_access', false, null from public.subscription_tiers where code = 'basic'
on conflict (tier_id, feature_key) do nothing;

insert into public.tier_features (tier_id, feature_key, enabled, limit_value)
select id, 'appointments', true, null from public.subscription_tiers where code = 'business'
union all select id, 'staff', true, 25 from public.subscription_tiers where code = 'business'
union all select id, 'locations', true, 3 from public.subscription_tiers where code = 'business'
union all select id, 'custom_domain', true, null from public.subscription_tiers where code = 'business'
union all select id, 'api_access', true, null from public.subscription_tiers where code = 'business'
union all select id, 'analytics', true, null from public.subscription_tiers where code = 'business'
on conflict (tier_id, feature_key) do nothing;

insert into public.tier_features (tier_id, feature_key, enabled, limit_value)
select id, 'appointments', true, null from public.subscription_tiers where code = 'enterprise'
union all select id, 'staff', true, null from public.subscription_tiers where code = 'enterprise'
union all select id, 'locations', true, null from public.subscription_tiers where code = 'enterprise'
union all select id, 'custom_domain', true, null from public.subscription_tiers where code = 'enterprise'
union all select id, 'api_access', true, null from public.subscription_tiers where code = 'enterprise'
union all select id, 'analytics', true, null from public.subscription_tiers where code = 'enterprise'
union all select id, 'white_label', true, null from public.subscription_tiers where code = 'enterprise'
union all select id, 'dedicated_support', true, null from public.subscription_tiers where code = 'enterprise'
on conflict (tier_id, feature_key) do nothing;

COMMIT;