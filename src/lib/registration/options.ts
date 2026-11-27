import { BUSINESS_DOCUMENTS, businessDocumentsFor, type BusinessDocumentKey } from "./document-requirements";

export { type BusinessDocumentKey } from "./document-requirements";

export const TRIAL_DAYS = 30;
export const REGISTRATION_CODE_LENGTH = 6;
export const BUSINESS_LOGO_REQUIRED = "Upload a business logo to continue.";

export const ID_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "national_id", label: "Philippine National ID" },
  { value: "sss_gsis", label: "SSS / GSIS ID" },
  { value: "philhealth", label: "PhilHealth ID" },
] as const;

export type IdType = (typeof ID_TYPES)[number]["value"];

// The application_identities check constraint uses space-separated ID codes.
export const ID_TYPE_STORAGE_VALUES: Record<IdType, string> = {
  passport: "passport",
  drivers_license: "drivers license",
  national_id: "national id",
  sss_gsis: "sss gsis",
  philhealth: "philhealth",
};

export const OTHER_BUSINESS_TYPE = "Other Service Provider";
export const BUSINESS_TYPE_MAX_LENGTH = 80;

export const BUSINESS_TYPES = [
  "Salon & Spa",
  "Barbershop",
  "Beauty & Aesthetics",
  "Dental Clinic",
  "Medical & Diagnostic Clinic",
  "Physical Therapy & Wellness",
  "Fitness & Training Studio",
  "Specialist Consultation",
  "Massage & Day Spa",
  "Tattoo & Body Piercing",
  "Aesthetic, Dermatology & Laser Clinic",
  "Professional & Corporate Consulting",
  "Manpower, Staffing & Cleaning",
  "Private Security Agency",
  "Travel Agency & Tour Operator",
  "Transport, Logistics & Courier",
  "IT, BPO & Digital Services",
  "Catering Services",
  "Event Styling",
  "Repair, Maintenance & HVAC",
  "Construction & Engineering Contractor",
  OTHER_BUSINESS_TYPE,
] as const;

export function businessTypeLabel(businessType: string, customType?: string): string {
  return businessType === OTHER_BUSINESS_TYPE ? customType?.trim() || businessType : businessType;
}

export const GOVERNMENT_ID_SLOT = {
  key: "government_id",
  side: "Front",
  title: "Government-Issued ID (Front)",
  hint: "Passport, Driver's License, National ID, SSS / GSIS ID, or PhilHealth ID.",
  required: true,
} as const;

export const IDENTITY_DOCUMENT_SLOTS = [
  GOVERNMENT_ID_SLOT,
  { key: "government_id_back", side: "Back", title: "Government-Issued ID (Back)", hint: "Back of the same government-issued ID.", required: true },
] as const;

export type IdentityDocumentKey = (typeof IDENTITY_DOCUMENT_SLOTS)[number]["key"];
export type DocumentKey = BusinessDocumentKey | IdentityDocumentKey;

/** Catalog of recognized upload keys, including legacy documents. */
export const ALL_DOCUMENTS: ReadonlyArray<{ key: DocumentKey; title: string; hint: string; required: boolean }> = [
  ...IDENTITY_DOCUMENT_SLOTS,
  ...BUSINESS_DOCUMENTS,
];

export function applicationDocumentsFor(businessType: string) {
  return [...IDENTITY_DOCUMENT_SLOTS, ...businessDocumentsFor(businessType)];
}

export function documentTitle(key: string): string {
  return ALL_DOCUMENTS.find((doc) => doc.key === key)?.title ?? key;
}

/** Form-field name used when documents are posted to /api/applications. */
export const documentFieldName = (key: DocumentKey) => `doc_${key}`;

export const DOCUMENT_BUCKET = "application-documents";

export const FILE_LIMITS = {
  documentBytes: 50 * 1024 * 1024,
  identityDocumentBytes: 5 * 1024 * 1024,
  documentTypes: ["application/pdf", "image/jpeg", "image/png"],
  logoBytes: 2 * 1024 * 1024,
  logoTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

export function documentByteLimit(key: DocumentKey): number {
  return IDENTITY_DOCUMENT_SLOTS.some((slot) => slot.key === key)
    ? FILE_LIMITS.identityDocumentBytes
    : FILE_LIMITS.documentBytes;
}

export function formatPeso(value: number): string {
  return `₱${value.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}
