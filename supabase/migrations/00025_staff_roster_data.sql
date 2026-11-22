create table public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null check (btrim(full_name) <> ''),
  email text not null check (btrim(email) <> ''),
  role public.app_role not null check (role in ('staff', 'receptionist', 'admin')),
  title text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  token_hash text unique,
  last_resent_at timestamptz,
  service_ids uuid[] not null default '{}',
  commission_type public.commission_type not null default 'fixed',
  commission_value numeric(12, 2) not null default 0
    check (commission_value >= 0 and (commission_type <> 'percentage' or commission_value <= 100)),
  check (expires_at > created_at),
  check (accepted_at is null or cancelled_at is null)
);

create index staff_invitations_tenant_created_idx
  on public.staff_invitations (tenant_id, created_at desc);
alter table public.staff_invitations enable row level security;
revoke all on public.staff_invitations from anon, authenticated;
grant select, insert, update, delete on public.staff_invitations to service_role;

create or replace function public.get_staff_commission_totals(
  p_tenant_id uuid, p_period_start timestamptz, p_period_end timestamptz,
  p_staff_id uuid default null
)
returns table (staff_id uuid, commission_cents bigint)
language sql
stable
set search_path = ''
as $$
  select staff.id, sum(
    case staff.commission_type
      when 'percentage' then round(line.price_cents * staff.commission_value / 100)
      else round(staff.commission_value * 100)
    end
  )::bigint
  from public.appointments as appointment
  join public.appointment_services as line
    on line.tenant_id = appointment.tenant_id and line.appointment_id = appointment.id
  join public.staff_members as staff
    on staff.tenant_id = appointment.tenant_id and staff.id = coalesce(line.staff_id, appointment.staff_id)
  where appointment.tenant_id = p_tenant_id
    and appointment.status = 'completed'
    and appointment.starts_at >= p_period_start and appointment.starts_at < p_period_end
    and staff.commission_value > 0
    and (p_staff_id is null or staff.id = p_staff_id)
  group by staff.id;
$$;

revoke all on function public.get_staff_commission_totals(uuid, timestamptz, timestamptz, uuid) from public;
grant execute on function public.get_staff_commission_totals(uuid, timestamptz, timestamptz, uuid) to service_role;

-- Staff invitation delivery and acceptance.
create function public.reserve_staff_invitation(
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

  select plan.staff_limit into seat_limit
  from public.account_applications as application
  join public.subscription_plans as plan on plan.code = application.plan_code
  where application.tenant_id = p_tenant_id and application.status = 'approved'
  order by application.approved_at desc nulls last
  limit 1;
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

create function public.accept_staff_invitation(p_token_hash text, p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.staff_invitations%rowtype;
  workspace_id uuid;
  new_staff_id uuid;
begin
  select tenant_id into workspace_id from public.staff_invitations where token_hash = p_token_hash;
  perform 1 from public.tenants where id = workspace_id and status = 'active' for update;
  if not found then raise exception 'This workspace is unavailable.'; end if;
  select * into invitation from public.staff_invitations where token_hash = p_token_hash for update;
  if not found or invitation.cancelled_at is not null or invitation.accepted_at is not null or invitation.expires_at <= now() then
    raise exception 'This invitation is no longer available.';
  end if;

  if not exists (
    select 1 from auth.users
    where id = p_profile_id and lower(email) = lower(invitation.email) and email_confirmed_at is not null
  ) then raise exception 'Sign in with the invited email address.'; end if;
  if exists (
    select 1 from public.tenant_memberships
    where tenant_id = workspace_id and profile_id = p_profile_id
  ) then raise exception 'This account already belongs to the workspace.'; end if;

  insert into public.tenant_memberships (tenant_id, profile_id, role)
  values (workspace_id, p_profile_id, invitation.role);

  update public.profiles set tenant_id = workspace_id
  where id = p_profile_id and tenant_id is null and role <> 'admin';

  insert into public.staff_members (tenant_id, profile_id, full_name, title, commission_type, commission_value, sort_order)
  values (workspace_id, p_profile_id, invitation.full_name, invitation.title,
    invitation.commission_type, invitation.commission_value,
    (select coalesce(max(sort_order), -1) + 1 from public.staff_members where tenant_id = workspace_id))
  returning id into new_staff_id;

  insert into public.staff_service_skills (tenant_id, staff_id, service_id)
  select workspace_id, new_staff_id, service.id from public.services as service
  where service.tenant_id = workspace_id and service.active and service.id = any(invitation.service_ids);

  update public.staff_invitations set accepted_at = now(), token_hash = null where id = invitation.id;
end;
$$;

revoke all on function public.reserve_staff_invitation(uuid, uuid, text, text, public.app_role, text, uuid[], public.commission_type, numeric, text) from public, anon, authenticated;
revoke all on function public.accept_staff_invitation(text, uuid) from public, anon, authenticated;
grant execute on function public.reserve_staff_invitation(uuid, uuid, text, text, public.app_role, text, uuid[], public.commission_type, numeric, text) to service_role;
grant execute on function public.accept_staff_invitation(text, uuid) to service_role;

-- Renew pending or expired invitations while preserving seat limits.
create function public.renew_staff_invitation(
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

    select plan.staff_limit into seat_limit
      from public.account_applications as application
      join public.subscription_plans as plan on plan.code = application.plan_code
      where application.tenant_id = p_tenant_id and application.status = 'approved'
      order by application.approved_at desc nulls last limit 1;
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

revoke all on function public.renew_staff_invitation(uuid, uuid, timestamptz, text) from public, anon, authenticated;
grant execute on function public.renew_staff_invitation(uuid, uuid, timestamptz, text) to service_role;
