create or replace function public.sync_verified_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

revoke all on function public.sync_verified_profile_email() from public;

drop trigger if exists on_auth_email_updated on auth.users;
create trigger on_auth_email_updated
after update of email on auth.users
for each row
when (old.email is distinct from new.email and new.email_confirmed_at is not null)
execute function public.sync_verified_profile_email();

create table if not exists public.staff_email_change_cooldowns (
  profile_id uuid primary key references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);

alter table public.staff_email_change_cooldowns enable row level security;

create or replace function public.reserve_staff_email_change(p_profile_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with reservation as (
    insert into public.staff_email_change_cooldowns as cooldown (profile_id, expires_at)
    values (p_profile_id, now() + interval '2 minutes')
    on conflict (profile_id) do update set expires_at = excluded.expires_at
    where cooldown.expires_at <= now()
    returning profile_id
  )
  select exists (select 1 from reservation);
$$;

revoke all on function public.reserve_staff_email_change(uuid) from public;
grant execute on function public.reserve_staff_email_change(uuid) to service_role;

-- Store verification requests for password-confirmed email changes.
create table public.staff_email_change_requests (
  profile_id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  current_email text not null,
  new_email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  claimed_at timestamptz
);

alter table public.staff_email_change_requests enable row level security;
revoke all on public.staff_email_change_requests from public, anon, authenticated;
grant select, insert, update, delete on public.staff_email_change_requests to service_role;
