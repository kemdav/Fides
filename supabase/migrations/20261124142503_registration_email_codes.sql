begin;

create table public.registration_email_codes (
  email text primary key,
  id uuid not null unique,
  code_hash text not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  sent_at timestamptz not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  window_started_at timestamptz not null,
  send_count integer not null check (send_count between 1 and 5)
);

alter table public.registration_email_codes enable row level security;
revoke all on public.registration_email_codes from public, anon, authenticated;
grant select, insert, update on public.registration_email_codes to service_role;

commit;

notify pgrst, 'reload schema';
