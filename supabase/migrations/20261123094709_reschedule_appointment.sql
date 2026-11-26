create function public.reschedule_appointment(
  p_tenant_id uuid, p_appointment_id uuid, p_date date, p_time time, p_expected_start timestamptz
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  booking public.appointments%rowtype;
  workspace_timezone text;
  new_start timestamptz;
  new_end timestamptz;
  shift_by interval;
  assigned_staff uuid[];
  assigned_resources uuid[];
  lock_id uuid;
begin
  if not exists (
    select 1 from public.tenant_memberships
    where tenant_id = p_tenant_id and profile_id = auth.uid()
      and role in ('owner', 'admin', 'receptionist')
  ) then raise exception 'You do not have permission to reschedule appointments.'; end if;

  select coalesce(timezone, 'Asia/Manila') into workspace_timezone from public.tenants
    where id = p_tenant_id and status = 'active';
  if not found then raise exception 'This workspace is unavailable.'; end if;

  select * into booking from public.appointments
    where tenant_id = p_tenant_id and id = p_appointment_id for update;
  if not found or booking.status not in ('pending_approval', 'confirmed')
    or booking.starts_at is distinct from p_expected_start then
    raise exception 'This appointment changed or can no longer be rescheduled. Reopen its details and try again.';
  end if;

  new_start := (p_date + p_time) at time zone workspace_timezone;
  if new_start <= now() then raise exception 'Choose a future appointment time.'; end if;
  shift_by := new_start - booking.starts_at;
  new_end := booking.ends_at + shift_by;

  assigned_staff := array(
    select booking.staff_id
    union
    select staff_id from public.appointment_services
      where tenant_id = p_tenant_id and appointment_id = booking.id and staff_id is not null
    order by 1
  );
  assigned_resources := array(
    select distinct resource_id from public.resource_allocations
      where tenant_id = p_tenant_id and appointment_id = booking.id order by resource_id
  );
  foreach lock_id in array assigned_staff loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_tenant_id::text || ':' || lock_id::text));
  end loop;
  foreach lock_id in array assigned_resources loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_tenant_id::text || ':resource:' || lock_id::text));
  end loop;

  if exists (
    select 1 from public.appointments as other
    where other.tenant_id = p_tenant_id and other.id <> booking.id
      and other.status in ('pending_approval', 'confirmed', 'checked_in', 'in_service')
      and other.starts_at < new_end and other.ends_at > new_start
      and (other.staff_id = any(assigned_staff) or exists (
        select 1 from public.appointment_services as line
        where line.tenant_id = p_tenant_id and line.appointment_id = other.id and line.staff_id = any(assigned_staff)
      ))
  ) or exists (
    select 1 from public.resource_allocations as allocation
    join public.resource_allocations as other on other.tenant_id = allocation.tenant_id and other.resource_id = allocation.resource_id
    where allocation.tenant_id = p_tenant_id and allocation.appointment_id = booking.id
      and other.appointment_id is distinct from booking.id
      and other.starts_at < allocation.ends_at + shift_by and other.ends_at > allocation.starts_at + shift_by
  ) then raise exception 'The assigned staff or resource is already booked at that time.'; end if;

  update public.appointments set starts_at = new_start, ends_at = new_end
    where tenant_id = p_tenant_id and id = booking.id;
  update public.resource_allocations set starts_at = starts_at + shift_by, ends_at = ends_at + shift_by
    where tenant_id = p_tenant_id and appointment_id = booking.id;
end;
$$;

revoke all on function public.reschedule_appointment(uuid, uuid, date, time, timestamptz) from public, anon;
grant execute on function public.reschedule_appointment(uuid, uuid, date, time, timestamptz) to authenticated;
