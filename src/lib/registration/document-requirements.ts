const labels = {
  dti_sec_registration: ["DTI or SEC Registration", "Upload your DTI certificate, or your SEC certificate with the articles of incorporation or partnership."],
  barangay_clearance: ["Barangay Business Clearance", "Upload the clearance for your business location."],
  proof_of_address: ["Proof of Business Address", "Upload a notarized lease, Transfer Certificate of Title, or Tax Declaration."],
  community_tax: ["Community Tax Certificate", "Upload your CTC or cedula."],
  zoning_clearance: ["Locational / Zoning Clearance", "Upload the clearance for your business activity and location."],
  occupancy_inspection: ["Occupancy and Building / Electrical Inspection", "Combine the applicable certificates in one PDF."],
  fire_safety: ["Fire Safety Inspection Certificate", "Upload the certificate from the Bureau of Fire Protection."],
  mayors_permit: ["Mayor’s / Business Permit", "Upload your current city or municipal business permit."],
  bir_registration: ["BIR Certificate of Registration (Form 2303)", "Upload BIR Form 2303."],
  authority_to_print: ["Authority to Print or Permit to Use", "Upload ATP or PTU for your invoicing or accounting system."],
  service_invoices: ["Service Invoices", "Upload a sample service invoice or a converted official receipt stamped as a service invoice."],
  books_of_accounts: ["Registered Books of Accounts", "Upload proof of registration for your manual, loose-leaf, or computerized books."],
  sss_employer: ["SSS Employer Registration", "Combine Forms R-1 and R-1A in one PDF."],
  philhealth_employer: ["PhilHealth Employer Registration", "Combine Forms ER1 and ER2 in one PDF."],
  pagibig_employer: ["Pag-IBIG Employer Registration", "Upload the Employer Data Form (EDF)."],
  sanitary_permit: ["LGU Sanitary Permit", "Upload the permit for your premises, including sterile procedures and sharps disposal for tattoo or piercing shops."],
  health_cards: ["Individual LGU Health Cards", "Combine health certificates for all applicable personnel in one PDF."],
  massage_certificates: ["DOH Massage Therapist Certificates", "Combine licensed massage therapist certificates in one PDF."],
  pathogen_training: ["Pathogen and Sterilization Training Certificates", "Combine the applicable staff training certificates in one PDF."],
  hazardous_waste: ["Hazardous Waste Generator ID", "Upload the applicable DENR-EMB registration."],
  doh_clinic_license: ["DOH Clinic License to Operate", "Upload the applicable specialized outpatient or medical clinic license."],
  fda_registrations: ["FDA License and Product / Device Registrations", "Combine your FDA license and registrations for regulated devices or products."],
  professional_licenses: ["Professional Licenses", "Combine PRC licenses or Supreme Court Roll of Attorneys certificates, as applicable."],
  professional_tax: ["Professional Tax Receipts", "Combine current receipts for applicable licensed professionals."],
  waste_transport: ["Medical Waste Transport and Treatment", "Combine the permit to transport and proof of an accredited waste treatment arrangement."],
  gpp_registration: ["SEC General Professional Partnership Registration", "Upload your GPP registration."],
  professional_standing: ["Certificates of Good Standing", "Combine certificates issued by the applicable accredited professional organizations."],
  prc_firm_registration: ["PRC Firm / Partnership Registration", "Upload the applicable firm registration."],
  dole_contractor: ["DOLE DO-174 Contractor Registration", "Upload your DOLE certificate of registration."],
  capital_evidence: ["Proof of Capital", "Upload audited financial statements, bank certification, or other applicable proof of capital."],
  service_agreements: ["Service Agreements", "Combine your applicable service agreements in one PDF."],
  security_license: ["PNP-SOSIA License to Operate", "Upload the agency license issued by PNP-SOSIA."],
  security_guard_licenses: ["Security Guard Licenses", "Combine individual LESP credentials in one PDF."],
  juridical_firearms_license: ["Juridical Firearms License", "Upload the agency’s license if applicable."],
  security_insurance: ["Surety Bond and Liability Insurance", "Combine the bond and liability insurance in one PDF."],
  security_clearances: ["PNP and Personnel Clearances", "Combine applicable PNP, neuro-psychiatric, and drug test clearances."],
  tourism_accreditation: ["DOT Accreditation", "Upload the Department of Tourism accreditation certificate."],
  iata_accreditation: ["IATA Accreditation", "Upload your accreditation for direct international ticketing."],
  transport_franchise: ["LTFRB Certificate of Public Convenience", "Upload the franchise for operating commercial vehicles for hire."],
  dict_accreditation: ["DICT Delivery Services Accreditation", "Upload the accreditation for private express or messengerial delivery services."],
  sea_freight_accreditation: ["DTI-FTEB Sea Freight Accreditation", "Upload the accreditation for sea freight forwarding."],
  air_freight_accreditation: ["CAB Air Freight Accreditation", "Upload the accreditation for air freight forwarding."],
  domestic_shipping_accreditation: ["MARINA Domestic Shipping Accreditation", "Upload the applicable domestic shipping accreditation."],
  commercial_vehicle_records: ["LTO Registrations and Vehicle Insurance", "Combine commercial vehicle OR/CR and comprehensive insurance in one PDF."],
  privacy_registration: ["NPC Registration and DPO Designation", "Combine your NPC registration and Data Protection Officer designation."],
  peza_registration: ["PEZA Registration", "Upload the certificate if your business claims PEZA incentives."],
  ntc_registration: ["NTC Value-Added Service Registration", "Upload your applicable VAS registration."],
  water_potability: ["Certificate of Water Potability", "Upload the certificate from your accredited water testing laboratory."],
  repair_accreditation: ["DTI Repair and Service Enterprise Accreditation", "Upload the accreditation for your repair business."],
  technician_certificates: ["TESDA Technician Certificates", "Combine applicable NC II / NC III certificates in one PDF."],
  environmental_clearance: ["DENR Environmental Clearance", "Upload the applicable ECC or Certificate of Non-Coverage."],
  pcab_license: ["PCAB Contractor License", "Upload the applicable construction contractor license."],
  construction_safety: ["DOLE Construction Safety and Health Program", "Combine the approvals for your applicable projects in one PDF."],
  other_permit: ["Other Permits or Licenses", "Sanitary, professional, or industry licenses submitted with older applications."],
} as const;

export type BusinessDocumentKey = keyof typeof labels;
export type BusinessDocument = { key: BusinessDocumentKey; title: string; hint: string; required: boolean };

const coreRegistrationKeys = ["dti_sec_registration", "mayors_permit", "bir_registration"] as const satisfies readonly BusinessDocumentKey[];

const industryKeys = new Map<string, readonly BusinessDocumentKey[]>(Object.entries({
  "Tattoo & Body Piercing": ["sanitary_permit"],
  "Aesthetic, Dermatology & Laser Clinic": ["doh_clinic_license", "professional_licenses"],
  "Medical & Diagnostic Clinic": ["doh_clinic_license", "professional_licenses"],
  "Dental Clinic": ["doh_clinic_license", "professional_licenses"],
  "Specialist Consultation": ["professional_licenses"],
  "Private Security Agency": ["security_license"],
  "Travel Agency & Tour Operator": ["tourism_accreditation"],
  "Repair, Maintenance & HVAC": ["repair_accreditation"],
  "Construction & Engineering Contractor": ["pcab_license"],
} satisfies Record<string, readonly BusinessDocumentKey[]>).map(([type, keys]) => [type.toLowerCase(), keys]));

export function hasIndustryDocumentRequirements(businessType: string): boolean {
  return industryKeys.has(businessType.trim().toLowerCase());
}

export const BUSINESS_DOCUMENTS: BusinessDocument[] = (Object.keys(labels) as BusinessDocumentKey[]).map((key) => {
  const [title, hint] = labels[key];
  return { key, title, hint, required: true };
});

export function businessDocumentsFor(businessType: string): BusinessDocument[] {
  const keys = new Set<BusinessDocumentKey>([
    ...coreRegistrationKeys,
    ...(industryKeys.get(businessType.trim().toLowerCase()) ?? []),
  ]);
  return BUSINESS_DOCUMENTS.filter(({ key }) => keys.has(key));
}
