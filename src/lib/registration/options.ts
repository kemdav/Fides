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

export const DOCUMENT_SLOTS = [
  { key: "dti_sec_registration", title: "DTI or SEC Registration", hint: "Sole proprietor or Corporation registration." },
  { key: "mayors_permit", title: "Mayor's / Business Permit", hint: "Current permit issued by your local government." },
  { key: "bir_registration", title: "BIR Certificate of Registration", hint: "BIR Form 2303 for your business." },
  { key: "barangay_clearance", title: "Barangay Clearance", hint: "Issued by the barangay where you operate." },
  { key: "proof_of_address", title: "Proof of Business Address", hint: "Lease contract or recent utility bill." },
  { key: "other_permit", title: "Other Permits or Licenses", hint: "Sanitary, professional, or industry licenses." },
] as const;

export type DocumentKey = (typeof DOCUMENT_SLOTS)[number]["key"];

export const FILE_LIMITS = {
  documentBytes: 5 * 1024 * 1024,
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
