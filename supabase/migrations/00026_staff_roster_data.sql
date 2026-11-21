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
