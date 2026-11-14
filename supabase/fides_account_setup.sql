begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role' and typnamespace = 'public'::regnamespace) then
    create type public.app_role as enum ('admin', 'owner', 'receptionist', 'staff');
  end if;

  if not exists (select 1 from pg_type where typname = 'tenant_status' and typnamespace = 'public'::regnamespace) then
    create type public.tenant_status as enum ('pending', 'active', 'suspended', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'application_status' and typnamespace = 'public'::regnamespace) then
    create type public.application_status as enum ('pending', 'approved', 'rejected', 'suspended');
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table if not exists public.tenants (
  id uuid not null default gen_random_uuid(),
  name text not null,
  slug text not null,
  status public.tenant_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  logo_url text null,
  brand_color text null,
  accent_color text null,
  secondary_color text null,
  address text null,
  phone text null,
  timezone text null,
  constraint tenants_pkey primary key (id),
  constraint tenants_slug_key unique (slug),
  constraint tenants_slug_format check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'),
  constraint tenants_brand_color_format check (brand_color is null or brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint tenants_accent_color_format check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint tenants_secondary_color_format check (secondary_color is null or secondary_color ~ '^#[0-9A-Fa-f]{6}$')
);

alter table public.tenants add column if not exists logo_url text;
alter table public.tenants add column if not exists brand_color text;
alter table public.tenants add column if not exists accent_color text;
alter table public.tenants add column if not exists secondary_color text;
alter table public.tenants add column if not exists address text;
alter table public.tenants add column if not exists phone text;
alter table public.tenants add column if not exists timezone text;

create table if not exists public.profiles (
  id uuid not null,
  email text null,
  full_name text null,
  role public.app_role not null default 'owner',
  tenant_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign key (id) references auth.users (id) on delete cascade,
  constraint profiles_tenant_id_fkey foreign key (tenant_id) references public.tenants (id) on delete set null
);

create index if not exists profiles_tenant_id_idx on public.profiles using btree (tenant_id);

create table if not exists public.tenant_memberships (
  tenant_id uuid not null,
  profile_id uuid not null,
  role public.app_role not null default 'staff',
  created_at timestamptz not null default now(),
  constraint tenant_memberships_pkey primary key (tenant_id, profile_id),
  constraint tenant_memberships_profile_id_fkey foreign key (profile_id) references public.profiles (id) on delete cascade,
  constraint tenant_memberships_tenant_id_fkey foreign key (tenant_id) references public.tenants (id) on delete cascade
);

create index if not exists tenant_memberships_profile_id_idx on public.tenant_memberships using btree (profile_id);

create table if not exists public.tenant_settings (
  tenant_id uuid not null,
  display_name text null,
  tagline text null,
  about text null,
  currency character(3) not null default 'PHP',
  locale text not null default 'en-PH',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_settings_pkey primary key (tenant_id),
  constraint tenant_settings_tenant_id_fkey foreign key (tenant_id) references public.tenants (id) on delete cascade
);

drop trigger if exists set_updated_at on public.tenants;
create trigger set_updated_at before update on public.tenants
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.tenant_settings;
create trigger set_updated_at before update on public.tenant_settings
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb;
  resolved_role public.app_role;
begin
  meta := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  resolved_role := coalesce((meta ->> 'role')::public.app_role, 'owner');

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    resolved_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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
  (
    'starter',
    'Starter',
    'NEW PROVIDERS',
    499,
    'monthly',
    array[
      'Real-Time Booking Calendar',
      'Custom Service & Pricing Menu',
      'Staff & Resource Allocation',
      'Walk-in Registration & Booking',
      'QR Code Check-in System',
      'Instant Booking & Status Email Alerts',
      'Status Tracking & Audit Logs',
      'Daily Operations Dashboard',
      'Customer Profile & Visit History',
      'Basic Sales & Activity Reports',
      'Annual BIR Tax-Ready Reports'
    ],
    1
  ),
  (
    'professional',
    'Professional',
    'GROWING PROVIDERS',
    1299,
    'monthly',
    array[
      'Everything in Starter',
      '24/7 AI Booking Assistant',
      'Automated Email Reminders',
      'Smart Waiting List Management',
      'Automated Commission Tracking',
      'Detailed Sales & Operational Analytics',
      'Quarterly BIR Tax-Ready Reports'
    ],
    2
  ),
  (
    'business',
    'Business',
    'ESTABLISHED PROVIDERS',
    3999,
    'monthly',
    array[
      'Everything in Professional',
      'Multi-Branch Management',
      'Centralized Executive Dashboard & Analytics',
      'Multi-Branch Inventory Tracking',
      'Consolidated Multi-Branch BIR Reporting',
      'Location-Based Role & Access Control'
    ],
    3
  )
on conflict (code) do nothing;

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

create table if not exists public.application_identities (
  application_id uuid primary key references public.account_applications (id) on delete cascade,
  owner_legal_name text not null,
  date_of_birth date not null,
  id_type text not null check (id_type in ('passport', 'drivers_license', 'national_id', 'sss_gsis', 'philhealth')),
  id_document_path text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.account_applications (id) on delete cascade,
  document_type text not null check (
    document_type in (
      'dti_sec_registration',
      'mayors_permit',
      'bir_registration',
      'barangay_clearance',
      'proof_of_address',
      'other_permit'
    )
  ),
  file_name text null,
  storage_path text null,
  mime_type text null,
  size_bytes bigint null check (size_bytes is null or size_bytes >= 0),
  created_at timestamptz not null default now(),
  constraint application_documents_unique_type unique (application_id, document_type)
);

create index if not exists application_documents_application_idx on public.application_documents (application_id);

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
create index if not exists admin_activity_log_application_idx on public.admin_activity_log (application_id);

drop trigger if exists set_updated_at on public.account_applications;
create trigger set_updated_at before update on public.account_applications
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.application_identities;
create trigger set_updated_at before update on public.application_identities
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.application_businesses;
create trigger set_updated_at before update on public.application_businesses
  for each row execute function public.set_updated_at();

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.tenant_settings enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.account_applications enable row level security;
alter table public.application_identities enable row level security;
alter table public.application_businesses enable row level security;
alter table public.application_documents enable row level security;
alter table public.admin_activity_log enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists tenants_select_member on public.tenants;
create policy tenants_select_member on public.tenants
  for select to authenticated
  using (id in (select p.tenant_id from public.profiles p where p.id = auth.uid()));

drop policy if exists tenant_memberships_select_own on public.tenant_memberships;
create policy tenant_memberships_select_own on public.tenant_memberships
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists tenant_settings_select_member on public.tenant_settings;
create policy tenant_settings_select_member on public.tenant_settings
  for select to authenticated
  using (tenant_id in (select p.tenant_id from public.profiles p where p.id = auth.uid()));

drop policy if exists subscription_plans_select_active on public.subscription_plans;
create policy subscription_plans_select_active on public.subscription_plans
  for select to anon, authenticated using (is_active);

drop policy if exists account_applications_select_own on public.account_applications;
create policy account_applications_select_own on public.account_applications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists application_identities_select_own on public.application_identities;
create policy application_identities_select_own on public.application_identities
  for select to authenticated
  using (exists (select 1 from public.account_applications a where a.id = application_id and a.user_id = auth.uid()));

drop policy if exists application_businesses_select_own on public.application_businesses;
create policy application_businesses_select_own on public.application_businesses
  for select to authenticated
  using (exists (select 1 from public.account_applications a where a.id = application_id and a.user_id = auth.uid()));

drop policy if exists application_documents_select_own on public.application_documents;
create policy application_documents_select_own on public.application_documents
  for select to authenticated
  using (exists (select 1 from public.account_applications a where a.id = application_id and a.user_id = auth.uid()));

revoke all on public.account_applications from anon, authenticated;
revoke all on public.application_identities from anon, authenticated;
revoke all on public.application_businesses from anon, authenticated;
revoke all on public.application_documents from anon, authenticated;
revoke all on public.admin_activity_log from anon, authenticated;
revoke all on public.subscription_plans from anon, authenticated;

grant select on public.account_applications to authenticated;
grant select on public.application_identities to authenticated;
grant select on public.application_businesses to authenticated;
grant select on public.application_documents to authenticated;
grant select on public.subscription_plans to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-logos',
  'business-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'application-documents',
  'application-documents',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists business_logos_public_read on storage.objects;
create policy business_logos_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'business-logos');

drop policy if exists application_documents_owner_read on storage.objects;
create policy application_documents_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] in (
      select a.id::text from public.account_applications a where a.user_id = auth.uid()
    )
  );

commit;
