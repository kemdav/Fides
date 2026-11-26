alter table public.application_businesses
  add column if not exists requested_slug text
  check (requested_slug ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$');

create unique index if not exists application_businesses_requested_slug_key
  on public.application_businesses (requested_slug)
  where requested_slug is not null;

alter table public.account_applications
  alter column phone drop not null;
