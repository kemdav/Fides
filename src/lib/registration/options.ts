export const TRIAL_DAYS = 14;

export const ID_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "national_id", label: "National ID" },
  { value: "sss_gsis", label: "SSS / GSIS ID" },
  { value: "philhealth", label: "PhilHealth ID" },
] as const;

export type IdType = (typeof ID_TYPES)[number]["value"];

export const BUSINESS_TYPES = [
  "Salon & Spa",
  "Barbershop",
  "Beauty & Aesthetics",
  "Dental Clinic",
  "Medical & Diagnostic Clinic",
  "Physical Therapy & Wellness",
  "Fitness & Training Studio",
  "Specialist Consultation",
  "Other Service Provider",
] as const;

export const GOVERNMENT_ID_SLOT = {
  key: "government_id",
  title: "Government-Issued ID (Front)",
  hint: "Passport, Driver's License, National ID, SSS / GSIS ID, or PhilHealth ID.",
  required: true,
} as const;

/** Business documents shown on the "Document Requirements" step. All are required. */
export const DOCUMENT_SLOTS = [
  { key: "dti_sec_registration", title: "DTI or SEC Registration", hint: "Sole proprietor or Corporation registration.", required: true },
  { key: "mayors_permit", title: "Mayor's / Business Permit", hint: "Current permit issued by your local government.", required: true },
  { key: "bir_registration", title: "BIR Certificate of Registration", hint: "BIR Form 2303 for your business.", required: true },
  { key: "barangay_clearance", title: "Barangay Clearance", hint: "Issued by the barangay where you operate.", required: true },
  { key: "proof_of_address", title: "Proof of Business Address", hint: "Lease contract or recent utility bill.", required: true },
  { key: "other_permit", title: "Other Permits or Licenses", hint: "Sanitary, professional, or industry licenses.", required: true },
] as const;

export type BusinessDocumentKey = (typeof DOCUMENT_SLOTS)[number]["key"];
export type DocumentKey = BusinessDocumentKey | typeof GOVERNMENT_ID_SLOT.key;

/** Every document an application must contain, in display order. */
export const ALL_DOCUMENTS: ReadonlyArray<{ key: DocumentKey; title: string; hint: string; required: boolean }> = [
  GOVERNMENT_ID_SLOT,
  ...DOCUMENT_SLOTS,
];

export const REQUIRED_DOCUMENT_KEYS: readonly DocumentKey[] = ALL_DOCUMENTS.filter((doc) => doc.required).map((doc) => doc.key);

export function documentTitle(key: string): string {
  return ALL_DOCUMENTS.find((doc) => doc.key === key)?.title ?? key;
}

/** Form-field name used when documents are posted to /api/applications. */
export const documentFieldName = (key: DocumentKey) => `doc_${key}`;

export const DOCUMENT_BUCKET = "application-documents";

export const FILE_LIMITS = {
  documentBytes: 50 * 1024 * 1024,
  documentTypes: ["application/pdf", "image/jpeg", "image/png"],
  logoBytes: 2 * 1024 * 1024,
  logoTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

export const PLAN_OPTIONS = [
  {
    code: "starter",
    name: "Starter",
    price: 499,
    description:
      "Get started with essential tools to manage your services and bookings. Ideal for new providers building their business.",
    includes: null,
    features: [
      "Real-Time Booking Calendar",
      "Custom Service & Pricing Menu",
      "Staff & Resource Allocation",
      "Walk-in Registration & Booking",
      "QR Code Check-in System",
      "Instant Booking & Status Email Alerts",
      "Status Tracking & Audit Logs",
      "Daily Operations Dashboard",
      "Customer Profile & Visit History",
      "Basic Sales & Activity Reports",
      "Annual BIR Tax-Ready Reports",
    ],
  },
  {
    code: "professional",
    name: "Professional",
    price: 1299,
    description:
      "Unlock powerful tools to grow your bookings and streamline your daily operations. Ideal for growing providers ready to expand their reach.",
    includes: "(Includes all Starter features, plus:)",
    features: [
      "24/7 AI Booking Assistant",
      "Automated Email Reminders",
      "Smart Waiting List Management",
      "Automated Commission Tracking",
      "Detailed Sales & Operational Analytics",
      "Quarterly BIR Tax-Ready Reports",
    ],
  },
  {
    code: "business",
    name: "Business",
    price: 3999,
    description:
      "Take your business further with advanced tools for teams, locations, and operations. Ideal for established providers ready to scale.",
    includes: "(Includes all Professional Tier features, plus:)",
    features: [
      "Multi-Branch Management",
      "Centralized Executive Dashboard & Analytics",
      "Multi-Branch Inventory Tracking",
      "Consolidated Multi-Branch BIR Reporting",
      "Location-Based Role & Access Control",
    ],
  },
] as const;

export type PlanOptionCode = (typeof PLAN_OPTIONS)[number]["code"];

export function formatPeso(value: number): string {
  return `₱${value.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}
