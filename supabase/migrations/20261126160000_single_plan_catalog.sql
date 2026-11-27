-- ============================================================
-- Fides: one plan catalog
--
-- Registration used subscription_plans (starter, professional, business) while
-- billing used subscription_tiers (basic, business, enterprise). subscription_tiers
-- is now the only catalog. subscription_plans is kept but unused; a later
-- migration can drop it once the hosted data has been checked.
-- ============================================================

begin;

-- 1. tiers carry what the registration and admin screens show
alter table public.subscription_tiers
  add column if not exists eyebrow text not null default '',
  add column if not exists description text not null default '',
  add column if not exists features text[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_updated_at on public.subscription_tiers;
create trigger set_updated_at
  before update on public.subscription_tiers
  for each row execute function public.set_updated_at();

-- admins can add tiers, so only the format is fixed
alter table public.subscription_tiers drop constraint if exists subscription_tiers_code_check;
alter table public.subscription_tiers drop constraint if exists subscription_tiers_code_format;
alter table public.subscription_tiers
  add constraint subscription_tiers_code_format check (code ~ '^[a-z0-9](?:[a-z0-9-]{0,40}[a-z0-9])?$');

update public.subscription_tiers set eyebrow = 'NEW PROVIDERS',
  description = 'Get started with essential tools to manage your services and bookings. Ideal for new providers building their business.',
  features = array[
  'Real-Time Booking Calendar', 'Custom Service & Pricing Menu', 'Staff & Resource Allocation',
  'Walk-in Registration & Booking', 'QR Code Check-in System', 'Instant Booking & Status Email Alerts',
  'Status Tracking & Audit Logs', 'Daily Operations Dashboard', 'Customer Profile & Visit History',
  'Basic Sales & Activity Reports', 'Annual BIR Tax-Ready Reports']
where code = 'basic';

update public.subscription_tiers set eyebrow = 'GROWING PROVIDERS',
  description = 'Unlock powerful tools to grow your bookings and streamline your daily operations. Ideal for growing providers ready to expand their reach.',
  features = array[
  'Everything in Basic', '24/7 AI Booking Assistant', 'Automated Email Reminders', 'Smart Waiting List Management',
  'Automated Commission Tracking', 'Detailed Sales & Operational Analytics', 'Quarterly BIR Tax-Ready Reports']
where code = 'business';

update public.subscription_tiers set eyebrow = 'ESTABLISHED PROVIDERS',
  description = 'Take your business further with advanced tools for teams, locations, and operations. Ideal for established providers ready to scale.',
  features = array[
  'Everything in Business', 'Multi-Branch Management', 'Centralized Executive Dashboard & Analytics',
  'Multi-Branch Inventory Tracking', 'Consolidated Multi-Branch BIR Reporting', 'Location-Based Role & Access Control']
where code = 'enterprise';

-- 2. plans an administrator added to the old catalog move across with their limits
insert into public.subscription_tiers (code, name, eyebrow, price_cents, billing_interval, active, sort_order, features)
select p.code, p.name, p.eyebrow, round(p.price_php * 100)::integer,
       case when p.billing_cycle = 'yearly' then 'year' else 'month' end,
       p.is_active, p.sort_order + 3, p.features
from public.subscription_plans p
where p.code not in ('starter', 'professional', 'business')
on conflict (code) do nothing;

insert into public.tier_features (tier_id, feature_key, enabled, limit_value)
select t.id, limits.feature_key, true, limits.limit_value
from public.subscription_plans p
join public.subscription_tiers t on t.code = p.code
cross join lateral (values ('staff_accounts', p.staff_limit), ('branches', p.location_limit)) as limits(feature_key, limit_value)
where p.code not in ('starter', 'professional', 'business')
on conflict (tier_id, feature_key) do nothing;

-- 3. applications point at tiers. one statement, because 'business' means a
--    different plan in each catalog and must not be mapped twice
alter table public.account_applications drop constraint if exists account_applications_plan_code_fkey;

update public.account_applications
set plan_code = case plan_code
  when 'starter' then 'basic'
  when 'professional' then 'business'
  when 'business' then 'enterprise'
  else plan_code
end
where plan_code in ('starter', 'professional', 'business');

update public.rejected_accounts
set plan_code = case plan_code
  when 'starter' then 'basic'
  when 'professional' then 'business'
  when 'business' then 'enterprise'
  else plan_code
end
where plan_code in ('starter', 'professional', 'business');

alter table public.account_applications
  add constraint account_applications_plan_code_fkey
  foreign key (plan_code) references public.subscription_tiers (code) on update cascade;

comment on table public.subscription_plans is 'Retired: use subscription_tiers. Kept until hosted data is verified.';

-- 4. seat limit: the live subscription decides, else the plan picked at sign-up.
--    null means unlimited
create or replace function public.tenant_staff_seat_limit(p_tenant_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select f.limit_value
  from public.tier_features f
  where f.feature_key = 'staff_accounts'
    and f.tier_id = coalesce(
      (select s.tier_id from public.subscriptions s
        where s.tenant_id = p_tenant_id and s.status in ('trialing', 'active', 'past_due')
        order by s.created_at desc limit 1),
      (select t.id from public.account_applications a
        join public.subscription_tiers t on t.code = a.plan_code
        where a.tenant_id = p_tenant_id and a.status = 'approved'
        order by a.approved_at desc nulls last limit 1)
    );
$$;

revoke all on function public.tenant_staff_seat_limit(uuid) from public, anon, authenticated;
grant execute on function public.tenant_staff_seat_limit(uuid) to service_role;

-- 5. staff invitations use the same limit (only the lookup changed)
create or replace function public.reserve_staff_invitation(
  p_actor_id uuid, p_tenant_id uuid, p_full_name text, p_email text,
  p_role public.app_role, p_title text, p_service_ids uuid[],
  p_commission_type public.commission_type, p_commission_value numeric, p_token_hash text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role public.app_role;
  seat_limit integer;
  seats_used bigint;
  invitation_id uuid;
begin
  perform 1 from public.tenants where id = p_tenant_id and status = 'active' for update;
  if not found then raise exception 'This workspace is unavailable.'; end if;

  select role into actor_role from public.tenant_memberships
  where tenant_id = p_tenant_id and profile_id = p_actor_id;
  if actor_role is null or actor_role not in ('owner', 'admin')
    or (p_role = 'admin' and actor_role <> 'owner') then
    raise exception 'You do not have permission to invite staff with this role.';
  end if;

  if exists (
    select 1 from public.staff_invitations
    where tenant_id = p_tenant_id and lower(email) = lower(p_email)
      and accepted_at is null and cancelled_at is null and expires_at > now()
  ) then raise exception 'This email already has a pending invitation.'; end if;

  if exists (
    select 1 from public.tenant_memberships as member
    join auth.users as account on account.id = member.profile_id
    where member.tenant_id = p_tenant_id and lower(account.email) = lower(p_email)
  ) then raise exception 'This email already belongs to the workspace.'; end if;

  seat_limit := public.tenant_staff_seat_limit(p_tenant_id);
  if seat_limit is not null then
    select (select count(*) from public.staff_members where tenant_id = p_tenant_id and active)
      + (select count(*) from public.staff_invitations where tenant_id = p_tenant_id
        and accepted_at is null and cancelled_at is null and expires_at > now()) into seats_used;
    if seats_used >= seat_limit then raise exception 'No staff seats are available.'; end if;
  end if;

  if exists (
    select 1 from unnest(p_service_ids) as choice(id)
    where not exists (
      select 1 from public.services where tenant_id = p_tenant_id and id = choice.id and active
    )
  ) then raise exception 'A selected service is no longer available.'; end if;

  insert into public.staff_invitations (
    tenant_id, full_name, email, role, title, service_ids, commission_type, commission_value, token_hash, expires_at
  ) values (
    p_tenant_id, p_full_name, lower(p_email), p_role, nullif(p_title, ''), p_service_ids,
    p_commission_type, p_commission_value, p_token_hash, now() + interval '7 days'
  ) returning id into invitation_id;
  return invitation_id;
end;
$$;

create or replace function public.renew_staff_invitation(
  p_tenant_id uuid, p_invitation_id uuid, p_expected_expiry timestamptz, p_token_hash text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.staff_invitations%rowtype;
  seat_limit integer;
  seats_used bigint;
  renewed_at timestamptz;
begin
  -- Serialize seat reservations with the new-invitation flow.
  perform 1 from public.tenants where id = p_tenant_id and status = 'active' for update;
  if not found then return false; end if;

  select * into invitation from public.staff_invitations
    where tenant_id = p_tenant_id and id = p_invitation_id
      and accepted_at is null and cancelled_at is null and expires_at = p_expected_expiry
    for update;
  if not found then return false; end if;

  renewed_at := clock_timestamp();
  if invitation.last_resent_at > renewed_at - interval '2 minutes' then return false; end if;

  if invitation.expires_at <= renewed_at then
    if exists (
      select 1 from public.staff_invitations
      where tenant_id = p_tenant_id and id <> p_invitation_id and lower(email) = lower(invitation.email)
        and accepted_at is null and cancelled_at is null and expires_at > renewed_at
    ) then raise exception 'This email already has a pending invitation.'; end if;

    if exists (
      select 1 from public.tenant_memberships as member
      join auth.users as account on account.id = member.profile_id
      where member.tenant_id = p_tenant_id and lower(account.email) = lower(invitation.email)
    ) then raise exception 'This email already belongs to the workspace.'; end if;

    seat_limit := public.tenant_staff_seat_limit(p_tenant_id);
    if seat_limit is not null then
      select (select count(*) from public.staff_members where tenant_id = p_tenant_id and active)
        + (select count(*) from public.staff_invitations where tenant_id = p_tenant_id
          and accepted_at is null and cancelled_at is null and expires_at > renewed_at) into seats_used;
      if seats_used >= seat_limit then raise exception 'No staff seats are available.'; end if;
    end if;
  end if;

  update public.staff_invitations
    set token_hash = p_token_hash, expires_at = renewed_at + interval '7 days', last_resent_at = renewed_at
    where id = p_invitation_id and tenant_id = p_tenant_id;
  return true;
end;
$$;

commit;
