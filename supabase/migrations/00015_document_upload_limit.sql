-- Raise the registration document upload limit from 5 MB to 50 MB.
-- (Supabase's global storage limit is 50 MiB; on the free plan this is the maximum.)

update storage.buckets
set file_size_limit = 52428800
where id = 'application-documents';

do $$
declare c record;
begin
  for c in
    select conrelid::regclass as tbl, conname
    from pg_constraint
    where contype = 'c' and pg_get_constraintdef(oid) ilike '%size_bytes%5242880%'
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
    execute format('alter table %s add constraint %I check (size_bytes is null or (size_bytes >= 0 and size_bytes <= 52428800)) not valid', c.tbl, c.conname);
  end loop;
end $$;
