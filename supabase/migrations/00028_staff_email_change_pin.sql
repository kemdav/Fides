create table public.staff_email_change_requests (
  profile_id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  current_email text not null,
  new_email text not null,
  token_hash text not null unique,
  pin_hash text not null,
  expires_at timestamptz not null,
  attempts smallint not null default 0 check (attempts between 0 and 5),
  claimed_at timestamptz
);

alter table public.staff_email_change_requests enable row level security;
revoke all on public.staff_email_change_requests from public, anon, authenticated;
grant select, insert, update, delete on public.staff_email_change_requests to service_role;

-- The server verifies the existing account credentials before claiming a PIN.
-- A row lock makes counting attempts and claiming a valid PIN one operation.
create function public.claim_staff_email_change(
  p_profile_id uuid, p_token_hash text, p_pin_hash text
) returns text
language plpgsql
set search_path = ''
as $$
declare
  request public.staff_email_change_requests%rowtype;
begin
  select * into request from public.staff_email_change_requests
  where profile_id = p_profile_id and token_hash = p_token_hash for update;
  if not found or request.claimed_at is not null or request.expires_at <= now() or request.attempts >= 5 then
    return 'unavailable';
  end if;
  if request.pin_hash <> p_pin_hash then
    update public.staff_email_change_requests set attempts = attempts + 1
    where profile_id = p_profile_id;
    return 'invalid';
  end if;
  update public.staff_email_change_requests set claimed_at = now()
  where profile_id = p_profile_id;
  return 'claimed';
end;
$$;

revoke all on function public.claim_staff_email_change(uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_staff_email_change(uuid, text, text) to service_role;
