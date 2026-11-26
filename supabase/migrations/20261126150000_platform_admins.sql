-- ============================================================
-- Fides: platform administrators on Supabase Auth
--
-- Until now a platform admin was any profile with role 'admin', and the same
-- word also means a shop-level admin in tenant_memberships. Platform admins now
-- have their own table that only the server (service role) can write.
-- ============================================================

begin;

create table if not exists public.platform_admins (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.platform_admins is
  'Fides platform administrators. Written only by the server; a signed-in user can read their own row.';

drop trigger if exists set_updated_at on public.platform_admins;
create trigger set_updated_at
  before update on public.platform_admins
  for each row execute function public.set_updated_at();

alter table public.platform_admins enable row level security;

revoke all on public.platform_admins from public, anon, authenticated;
grant select on public.platform_admins to authenticated;

drop policy if exists platform_admins_select_self on public.platform_admins;
create policy platform_admins_select_self
  on public.platform_admins for select
  to authenticated
  using (user_id = (select auth.uid()));

-- keep whoever was already a platform admin
insert into public.platform_admins (user_id, display_name)
select p.id, left(coalesce(nullif(btrim(p.full_name), ''), p.email, 'Administrator'), 120)
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'admin'
on conflict (user_id) do nothing;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins a
    where a.user_id = auth.uid() and a.active
  );
$$;

grant execute on function public.is_platform_admin() to anon, authenticated;

-- who did it, in addition to the display name kept for history
alter table public.admin_activity_log
  add column if not exists actor_id uuid references auth.users (id) on delete set null;

commit;
