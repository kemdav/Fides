-- ============================================================================
-- FIDES · Forgot-password codes (4-character email code)
-- Paste into the Supabase SQL Editor and run once. Idempotent.
--
-- Codes are stored HASHED (HMAC) and expire after 10 minutes. The table is
-- reachable only with the server's service-role/secret key: RLS is on and no
-- policy exists, so browsers can never read or write it.
-- ============================================================================
begin;

create table if not exists public.password_reset_codes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  email            text not null,
  code_hash        text not null,
  attempts         integer not null default 0,
  expires_at       timestamptz not null,
  verified_at      timestamptz,
  reset_token_hash text,
  consumed_at      timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists password_reset_codes_email_idx on public.password_reset_codes (lower(email), created_at desc);
create index if not exists password_reset_codes_user_idx  on public.password_reset_codes (user_id);

alter table public.password_reset_codes enable row level security;
revoke all on public.password_reset_codes from anon, authenticated;

commit;

-- Make the new table visible to the API immediately (otherwise PostgREST may say it does not exist).
notify pgrst, 'reload schema';
