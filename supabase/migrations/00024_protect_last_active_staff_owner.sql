create or replace function public.protect_last_active_staff_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.tenant_memberships
    where tenant_id = old.tenant_id and profile_id = old.profile_id and role = 'owner'
  ) then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(old.tenant_id::text, 0));

  if not exists (
    select 1
    from public.staff_members as staff
    join public.tenant_memberships as membership
      on membership.tenant_id = staff.tenant_id and membership.profile_id = staff.profile_id
    where staff.tenant_id = old.tenant_id and staff.id <> old.id
      and staff.active and membership.role = 'owner'
  ) then
    raise exception using errcode = 'P0001', message = 'LAST_ACTIVE_STAFF_OWNER';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_last_active_staff_owner() from public;

drop trigger if exists staff_protect_last_active_owner on public.staff_members;
create trigger staff_protect_last_active_owner
before update of active on public.staff_members
for each row
when (old.active and not new.active)
execute function public.protect_last_active_staff_owner();
