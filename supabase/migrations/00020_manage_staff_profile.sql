alter table public.staff_members add column if not exists phone text;

create or replace function public.manage_staff_profile(
  p_actor_id uuid, p_tenant_id uuid, p_staff_id uuid, p_full_name text, p_title text,
  p_phone text, p_bio text, p_role public.app_role, p_service_ids uuid[],
  p_commission_type public.commission_type, p_commission_value numeric, p_image_url text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_profile uuid;
  v_current_role public.app_role;
begin
  if not exists (
    select 1 from public.tenant_memberships
    where tenant_id = p_tenant_id and profile_id = p_actor_id and role in ('owner', 'admin')
  ) then
    raise exception 'You do not have permission to manage staff.';
  end if;

  select profile_id into target_profile from public.staff_members
  where tenant_id = p_tenant_id and id = p_staff_id for update;
  if not found then raise exception 'Staff member not found.'; end if;

  select role into v_current_role from public.tenant_memberships
  where tenant_id = p_tenant_id and profile_id = target_profile for update;
  if p_role is distinct from coalesce(v_current_role, 'staff'::public.app_role) then
    if v_current_role is null or v_current_role in ('owner', 'admin')
      or target_profile = p_actor_id or p_role not in ('staff', 'receptionist') then
      raise exception 'This dashboard role cannot be changed.';
    end if;
    update public.tenant_memberships set role = p_role
    where tenant_id = p_tenant_id and profile_id = target_profile;
  end if;

  if nullif(btrim(p_full_name), '') is null
    or (p_phone is not null and p_phone !~ '^[+0-9][0-9 ()-]{5,23}$') then
    raise exception 'Enter a full name and a valid phone number.';
  end if;

  if exists (
    select 1 from unnest(p_service_ids) as chosen(service_id)
    where not exists (
      select 1 from public.services as service
      where service.tenant_id = p_tenant_id and service.id = chosen.service_id
      and (service.active or exists (
        select 1 from public.staff_service_skills as skill
        where skill.tenant_id = p_tenant_id and skill.staff_id = p_staff_id
          and skill.service_id = service.id
      ))
    )
  ) then
    raise exception 'A selected service is no longer available.';
  end if;

  update public.staff_members set full_name = btrim(p_full_name), title = nullif(btrim(p_title), ''),
    phone = p_phone, bio = nullif(btrim(p_bio), ''), commission_type = p_commission_type,
    commission_value = p_commission_value, image_url = coalesce(p_image_url, image_url)
  where tenant_id = p_tenant_id and id = p_staff_id;

  delete from public.staff_service_skills
  where tenant_id = p_tenant_id and staff_id = p_staff_id and not (service_id = any(p_service_ids));
  insert into public.staff_service_skills (tenant_id, staff_id, service_id)
  select p_tenant_id, p_staff_id, service_id from unnest(p_service_ids) as chosen(service_id)
  on conflict (staff_id, service_id) do nothing;
end;
$$;

revoke all on function public.manage_staff_profile(uuid, uuid, uuid, text, text, text, text, public.app_role, uuid[], public.commission_type, numeric, text) from public;
grant execute on function public.manage_staff_profile(uuid, uuid, uuid, text, text, text, text, public.app_role, uuid[], public.commission_type, numeric, text) to service_role;
