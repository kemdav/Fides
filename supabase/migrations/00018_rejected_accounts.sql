-- ============================================================================
-- FIDES · Rejected-account history + decision date
-- Paste into the Supabase SQL Editor and run once. Idempotent (safe to re-run).
--
-- 1) public.rejected_accounts  - permanent, minimal record of every rejected
--    application. It is written BEFORE the application, documents and images
--    are deleted, so the email/details can be re-submitted while the admin
--    still sees who was rejected, why and when. It deliberately has NO foreign
--    key to account_applications / auth.users, so deleting those never touches it.
-- 2) account_applications.decided_at - the date an account was Approved (or
--    Rejected, for legacy rows that were kept). Shown on the Review Queue.
--
-- RLS is on with no policies: only the server (service-role/secret key) can read
-- or write these tables; browsers never can.
-- ============================================================================
begin;

create table if not exists public.rejected_accounts (
  id                uuid primary key default gen_random_uuid(),
  application_id    uuid unique,                 -- id the application had before deletion (no FK on purpose)
  reference_code    text,
  email             text not null,
  full_name         text not null,
  owner_legal_name  text,
  phone             text,
  business_name     text,
  business_type     text,                         -- account / business type
  location          text,                         -- "City, Province"
  plan_code         text,
  rejection_reason  text not null,
  submitted_at      timestamptz,
  rejected_at       timestamptz not null default now(),
  rejected_by       text not null default 'Platform administrator',
  email_sent        boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists rejected_accounts_email_idx       on public.rejected_accounts (lower(email));
create index if not exists rejected_accounts_rejected_at_idx on public.rejected_accounts (rejected_at desc);

alter table public.rejected_accounts enable row level security;
revoke all on public.rejected_accounts from anon, authenticated;

-- Date an application was approved / rejected.
alter table public.account_applications add column if not exists decided_at timestamptz;

update public.account_applications
   set decided_at = coalesce(approved_at, reviewed_at)
 where decided_at is null
   and status in ('approved', 'suspended', 'rejected');

commit;

-- Make the new table/column visible to the API immediately.
notify pgrst, 'reload schema';
