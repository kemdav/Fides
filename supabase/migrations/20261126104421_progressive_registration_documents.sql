begin;

-- keep catalog entries and uploads available for later compliance review
update public.document_types
set is_required = code in ('dti_sec_registration', 'mayors_permit', 'bir_registration')
where category = 'business';

update public.document_types
set label = 'BIR Certificate of Registration (Form 2303)'
where code = 'bir_registration';

create or replace function public.missing_required_documents(_application_id uuid)
returns table (code text, label text)
language sql
stable
security invoker
set search_path = public
as $$
  with industry_requirements(business_type, document_code) as (
    values
      ('Tattoo & Body Piercing', 'sanitary_permit'),
      ('Aesthetic, Dermatology & Laser Clinic', 'doh_clinic_license'),
      ('Aesthetic, Dermatology & Laser Clinic', 'professional_licenses'),
      ('Medical & Diagnostic Clinic', 'doh_clinic_license'),
      ('Medical & Diagnostic Clinic', 'professional_licenses'),
      ('Dental Clinic', 'doh_clinic_license'),
      ('Dental Clinic', 'professional_licenses'),
      ('Specialist Consultation', 'professional_licenses'),
      ('Private Security Agency', 'security_license'),
      ('Travel Agency & Tour Operator', 'tourism_accreditation'),
      ('Repair, Maintenance & HVAC', 'repair_accreditation'),
      ('Construction & Engineering Contractor', 'pcab_license')
  )
  select t.code, t.label
  from public.account_applications a
  left join public.application_businesses b on b.application_id = a.id
  cross join public.document_types t
  left join industry_requirements r
    on lower(r.business_type) = lower(btrim(b.business_type)) and r.document_code = t.code
  where a.id = _application_id
    and (t.is_required or r.document_code is not null)
    and (t.code <> 'government_id_back' or a.submitted_at >= t.created_at)
    and not exists (
      select 1 from public.application_documents d
      where d.application_id = a.id
        and d.document_type = t.code
        and d.storage_path is not null
    )
  order by t.sort_order, t.code;
$$;

revoke all on function public.missing_required_documents(uuid) from public, anon, authenticated;
grant execute on function public.missing_required_documents(uuid) to service_role;

commit;
