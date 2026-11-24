begin;

insert into public.document_types (code, label, description, category, is_required, sort_order)
values ('government_id_back', 'Government-Issued ID (Back)', 'Back of the business owner''s government-issued ID.', 'identity', true, 1)
on conflict (code) do nothing;

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
    and (t.code <> 'government_id_back' or exists (
      select 1 from public.account_applications a
      where a.id = _application_id and a.submitted_at >= t.created_at
    ))
    and not exists (
      select 1 from public.application_documents d
      where d.application_id = _application_id
        and d.document_type = t.code
        and d.storage_path is not null
    )
  order by t.sort_order, t.code;
$$;

revoke all on function public.missing_required_documents(uuid) from public, anon, authenticated;
grant execute on function public.missing_required_documents(uuid) to service_role;

commit;
