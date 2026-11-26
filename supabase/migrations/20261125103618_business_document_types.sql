begin;

-- Identity verification catalog and legacy missing-document lookup.
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

-- Register accepted business document keys so application document rows retain their catalog foreign key.
-- Applicability is evaluated from the applicant's selected business type.
insert into public.document_types (code, label, description, category, is_required, sort_order)
values
  ('community_tax', 'Community Tax Certificate', 'Upload your CTC or cedula.', 'business', false, 10),
  ('zoning_clearance', 'Locational / Zoning Clearance', 'Upload the clearance for your business activity and location.', 'business', false, 11),
  ('occupancy_inspection', 'Occupancy and Building / Electrical Inspection', 'Combine the applicable certificates in one PDF.', 'business', false, 12),
  ('fire_safety', 'Fire Safety Inspection Certificate', 'Upload the certificate from the Bureau of Fire Protection.', 'business', false, 13),
  ('authority_to_print', 'Authority to Print or Permit to Use', 'Upload ATP or PTU for your invoicing or accounting system.', 'business', false, 14),
  ('service_invoices', 'Service Invoices', 'Upload a sample service invoice or a converted official receipt stamped as a service invoice.', 'business', false, 15),
  ('books_of_accounts', 'Registered Books of Accounts', 'Upload proof of registration for your manual, loose-leaf, or computerized books.', 'business', false, 16),
  ('sss_employer', 'SSS Employer Registration', 'Combine Forms R-1 and R-1A in one PDF.', 'business', false, 17),
  ('philhealth_employer', 'PhilHealth Employer Registration', 'Combine Forms ER1 and ER2 in one PDF.', 'business', false, 18),
  ('pagibig_employer', 'Pag-IBIG Employer Registration', 'Upload the Employer Data Form (EDF).', 'business', false, 19),
  ('sanitary_permit', 'LGU Sanitary Permit', 'Upload the permit for your premises, including sterile procedures and sharps disposal for tattoo or piercing shops.', 'business', false, 20),
  ('health_cards', 'Individual LGU Health Cards', 'Combine health certificates for all applicable personnel in one PDF.', 'business', false, 21),
  ('massage_certificates', 'DOH Massage Therapist Certificates', 'Combine licensed massage therapist certificates in one PDF.', 'business', false, 22),
  ('pathogen_training', 'Pathogen and Sterilization Training Certificates', 'Combine the applicable staff training certificates in one PDF.', 'business', false, 23),
  ('hazardous_waste', 'Hazardous Waste Generator ID', 'Upload the applicable DENR-EMB registration.', 'business', false, 24),
  ('doh_clinic_license', 'DOH Clinic License to Operate', 'Upload the applicable specialized outpatient or medical clinic license.', 'business', false, 25),
  ('fda_registrations', 'FDA License and Product / Device Registrations', 'Combine your FDA license and registrations for regulated devices or products.', 'business', false, 26),
  ('professional_licenses', 'Professional Licenses', 'Combine PRC licenses or Supreme Court Roll of Attorneys certificates, as applicable.', 'business', false, 27),
  ('professional_tax', 'Professional Tax Receipts', 'Combine current receipts for applicable licensed professionals.', 'business', false, 28),
  ('waste_transport', 'Medical Waste Transport and Treatment', 'Combine the permit to transport and proof of an accredited waste treatment arrangement.', 'business', false, 29),
  ('gpp_registration', 'SEC General Professional Partnership Registration', 'Upload your GPP registration.', 'business', false, 30),
  ('professional_standing', 'Certificates of Good Standing', 'Combine certificates issued by the applicable accredited professional organizations.', 'business', false, 31),
  ('prc_firm_registration', 'PRC Firm / Partnership Registration', 'Upload the applicable firm registration.', 'business', false, 32),
  ('dole_contractor', 'DOLE DO-174 Contractor Registration', 'Upload your DOLE certificate of registration.', 'business', false, 33),
  ('capital_evidence', 'Proof of Capital', 'Upload audited financial statements, bank certification, or other applicable proof of capital.', 'business', false, 34),
  ('service_agreements', 'Service Agreements', 'Combine your applicable service agreements in one PDF.', 'business', false, 35),
  ('security_license', 'PNP-SOSIA License to Operate', 'Upload the agency license issued by PNP-SOSIA.', 'business', false, 36),
  ('security_guard_licenses', 'Security Guard Licenses', 'Combine individual LESP credentials in one PDF.', 'business', false, 37),
  ('juridical_firearms_license', 'Juridical Firearms License', 'Upload the agency’s license if applicable.', 'business', false, 38),
  ('security_insurance', 'Surety Bond and Liability Insurance', 'Combine the bond and liability insurance in one PDF.', 'business', false, 39),
  ('security_clearances', 'PNP and Personnel Clearances', 'Combine applicable PNP, neuro-psychiatric, and drug test clearances.', 'business', false, 40),
  ('tourism_accreditation', 'DOT Accreditation', 'Upload the Department of Tourism accreditation certificate.', 'business', false, 41),
  ('iata_accreditation', 'IATA Accreditation', 'Upload your accreditation for direct international ticketing.', 'business', false, 42),
  ('transport_franchise', 'LTFRB Certificate of Public Convenience', 'Upload the franchise for operating commercial vehicles for hire.', 'business', false, 43),
  ('dict_accreditation', 'DICT Delivery Services Accreditation', 'Upload the accreditation for private express or messengerial delivery services.', 'business', false, 44),
  ('sea_freight_accreditation', 'DTI-FTEB Sea Freight Accreditation', 'Upload the accreditation for sea freight forwarding.', 'business', false, 45),
  ('air_freight_accreditation', 'CAB Air Freight Accreditation', 'Upload the accreditation for air freight forwarding.', 'business', false, 46),
  ('domestic_shipping_accreditation', 'MARINA Domestic Shipping Accreditation', 'Upload the applicable domestic shipping accreditation.', 'business', false, 47),
  ('commercial_vehicle_records', 'LTO Registrations and Vehicle Insurance', 'Combine commercial vehicle OR/CR and comprehensive insurance in one PDF.', 'business', false, 48),
  ('privacy_registration', 'NPC Registration and DPO Designation', 'Combine your NPC registration and Data Protection Officer designation.', 'business', false, 49),
  ('peza_registration', 'PEZA Registration', 'Upload the certificate if your business claims PEZA incentives.', 'business', false, 50),
  ('ntc_registration', 'NTC Value-Added Service Registration', 'Upload your applicable VAS registration.', 'business', false, 51),
  ('water_potability', 'Certificate of Water Potability', 'Upload the certificate from your accredited water testing laboratory.', 'business', false, 52),
  ('repair_accreditation', 'DTI Repair and Service Enterprise Accreditation', 'Upload the accreditation for your repair business.', 'business', false, 53),
  ('technician_certificates', 'TESDA Technician Certificates', 'Combine applicable NC II / NC III certificates in one PDF.', 'business', false, 54),
  ('environmental_clearance', 'DENR Environmental Clearance', 'Upload the applicable ECC or Certificate of Non-Coverage.', 'business', false, 55),
  ('pcab_license', 'PCAB Contractor License', 'Upload the applicable construction contractor license.', 'business', false, 56),
  ('construction_safety', 'DOLE Construction Safety and Health Program', 'Combine the approvals for your applicable projects in one PDF.', 'business', false, 57)
on conflict (code) do nothing;

commit;
