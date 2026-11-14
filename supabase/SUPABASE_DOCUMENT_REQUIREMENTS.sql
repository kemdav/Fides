-- ============================================================================
-- FIDES · Document Requirements
-- Paste this whole file into the Supabase SQL Editor and run it once.
-- It is idempotent: running it again is safe and will not duplicate anything.
--
-- Creates:
--   1. public.document_types           catalog of the 7 required documents
--   2. public.application_documents    one row per (application, document type),
--                                      linked to the applicant (user_id) and to
--                                      the file in Storage (storage_path)
--   3. storage bucket "application-documents"  (PRIVATE, 5 MB, PDF/JPG/PNG)
--   4. Row Level Security + storage policies
--   5. public.missing_required_documents(application_id)  helper
--
-- Requires: public.account_applications (already in your project).
-- Uploads and admin viewing go through the server using the service-role key,
-- which bypasses RLS. Applicants can only READ their own files; nobody can
-- read another applicant's files from the browser.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Helper: keep updated_at fresh (safe if it already exists)
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. Catalog of document types (labels + Required/Optional status)
-- ----------------------------------------------------------------------------
create table if not exists public.document_types (
  code        text primary key,
  label       text not null,
  description text not null default '',
  category    text not null default 'business' check (category in ('identity', 'business')),
  is_required boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint document_types_code_format check (code ~ '^[a-z][a-z0-9_]{1,59}$')
);

insert into public.document_types (code, label, description, category, is_required, sort_order)
values
  ('government_id',       'Government-Issued ID (Front)',   'Valid government ID of the business owner.',                 'identity', true, 1),
  ('dti_sec_registration','DTI or SEC Registration',        'Sole proprietor or Corporation registration.',               'business', true, 2),
  ('mayors_permit',       'Mayor''s / Business Permit',     'Current permit issued by your local government.',            'business', true, 3),
  ('bir_registration',    'BIR Certificate of Registration','BIR Form 2303 for your business.',                           'business', true, 4),
  ('barangay_clearance',  'Barangay Clearance',             'Issued by the barangay where you operate.',                  'business', true, 5),
  ('proof_of_address',    'Proof of Business Address',      'Lease contract or recent utility bill.',                     'business', true, 6),
  ('other_permit',        'Other Permits or Licenses',      'Sanitary, professional, or industry licenses.',              'business', true, 7)
on conflict (code) do update
set label       = excluded.label,
    description = excluded.description,
    category    = excluded.category,
    is_required = excluded.is_required,
    sort_order  = excluded.sort_order;

-- ----------------------------------------------------------------------------
-- 2. One row per uploaded document, linked to the applicant
-- ----------------------------------------------------------------------------
create table if not exists public.application_documents (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.account_applications (id) on delete cascade,
  user_id        uuid references auth.users (id) on delete cascade,
  document_type  text not null references public.document_types (code) on update cascade,
  file_name      text,
  storage_path   text,
  mime_type      text,
  size_bytes     bigint,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Bring a pre-existing table (from an earlier setup script) up to the same shape.
alter table public.application_documents add column if not exists user_id    uuid references auth.users (id) on delete cascade;
alter table public.application_documents add column if not exists updated_at timestamptz not null default now();

-- Older setups restricted document_type with a CHECK that does not know about
-- "government_id". The catalog table + foreign key replace it.
alter table public.application_documents drop constraint if exists application_documents_document_type_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.application_documents'::regclass
      and conname = 'application_documents_document_type_fkey'
  ) then
    alter table public.application_documents
      add constraint application_documents_document_type_fkey
      foreign key (document_type) references public.document_types (code) on update cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.application_documents'::regclass
      and conname = 'application_documents_unique_type'
  ) then
    alter table public.application_documents
      add constraint application_documents_unique_type unique (application_id, document_type);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.application_documents'::regclass
      and conname = 'application_documents_size_check'
  ) then
    alter table public.application_documents
      add constraint application_documents_size_check
      check (size_bytes is null or (size_bytes >= 0 and size_bytes <= 5242880)) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.application_documents'::regclass
      and conname = 'application_documents_mime_check'
  ) then
    alter table public.application_documents
      add constraint application_documents_mime_check
      check (mime_type is null or mime_type in ('application/pdf', 'image/jpeg', 'image/png')) not valid;
  end if;
end
$$;

-- Link rows created before user_id existed to their applicant.
update public.application_documents d
set user_id = a.user_id
from public.account_applications a
where d.application_id = a.id
  and d.user_id is null;

create index if not exists application_documents_application_idx on public.application_documents (application_id);
create index if not exists application_documents_user_idx        on public.application_documents (user_id);
create index if not exists application_documents_type_idx        on public.application_documents (document_type);
create unique index if not exists application_documents_storage_path_key
  on public.application_documents (storage_path) where storage_path is not null;

drop trigger if exists set_updated_at on public.application_documents;
create trigger set_updated_at before update on public.application_documents
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Helper: which required documents is an application still missing?
--    Handy for audits and admin queries, e.g.
--      select * from public.missing_required_documents('<application uuid>');
-- ----------------------------------------------------------------------------
create or replace function public.missing_required_documents(_application_id uuid)
returns table (code text, label text)
language sql
stable
security definer
set search_path = public
as $$
  select t.code, t.label
  from public.document_types t
  where t.is_required
    and not exists (
      select 1
      from public.application_documents d
      where d.application_id = _application_id
        and d.document_type = t.code
        and d.storage_path is not null
    )
  order by t.sort_order;
$$;

revoke all on function public.missing_required_documents(uuid) from public, anon, authenticated;
grant execute on function public.missing_required_documents(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 4. Row Level Security (tables)
--    Applicants can read their own rows. All writes happen server-side with
--    the service-role key, so no insert/update/delete policies are granted.
-- ----------------------------------------------------------------------------
alter table public.document_types        enable row level security;
alter table public.application_documents enable row level security;

drop policy if exists document_types_select_all on public.document_types;
create policy document_types_select_all on public.document_types
  for select to anon, authenticated using (true);

drop policy if exists application_documents_select_own on public.application_documents;
create policy application_documents_select_own on public.application_documents
  for select to authenticated
  using (user_id = auth.uid());

revoke all on public.document_types        from anon, authenticated;
revoke all on public.application_documents from anon, authenticated;
grant select on public.document_types        to anon, authenticated;
grant select on public.application_documents to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Storage bucket (PRIVATE) + policies
--    Object path convention:  <application_id>/<document_type>.<ext>
--    -> every applicant has their own folder, every document type its own file.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'application-documents',
  'application-documents',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set public             = excluded.public,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Applicants may read only the files inside their own application folder.
drop policy if exists application_documents_owner_read on storage.objects;
create policy application_documents_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] in (
      select a.id::text from public.account_applications a where a.user_id = auth.uid()
    )
  );

-- No insert/update/delete policy on purpose: uploads, replacements and admin
-- viewing (signed URLs) are performed by the server with the service-role key.

commit;
