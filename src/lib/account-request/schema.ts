import { z } from "zod";
import { RESERVED_SUBDOMAINS } from "@/lib/tenant/constants";
import type { Enums } from "@/types/database.types";

export type AppRole = Enums<"app_role">;
export type TenantStatus = Enums<"tenant_status">;

/**
 * Matches the PostgreSQL constraint `tenants_slug_format` in `00001_baseline.sql`:
 * `slug ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'`
 */
export const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export const BUSINESS_CATEGORIES = [
  { value: "dental", label: "Dental Clinic & Orthodontics" },
  { value: "medical", label: "Medical & Diagnostic Practice" },
  { value: "wellness", label: "Physical Therapy & Wellness" },
  { value: "salon", label: "Aesthetics & Personal Care" },
  { value: "consulting", label: "Specialist Consultation" },
  { value: "other", label: "General Service Provider" },
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number]["value"];

export function getCategoryLabel(category: BusinessCategory): string {
  return (
    BUSINESS_CATEGORIES.find((item) => item.value === category)?.label ??
    "Service Business"
  );
}

export interface SlugValidationResult {
  slug: string;
  normalizedSlug: string;
  available: boolean;
  reason: string;
  previewHost: string;
  suggestions: string[];
}

export const STAFF_SIZE_TIERS = ["1-5", "6-15", "16-50", "50+"] as const;
export type StaffSizeTier = (typeof STAFF_SIZE_TIERS)[number];

/**
 * Three account scopes supported by Request Account (CPG-61) & Reset Account Request (CPG-62):
 * 1. `client_owner` — Client Businesses (e.g., Dental Clinics)
 * 2. `client_user`  — Users under that Client (dentists, receptionists, patients)
 * 3. `fides_admin`  — Fides Platform Administrators
 */
export const AUTH_SCOPES = [
  "client_owner",
  "client_user",
  "fides_admin",
] as const;
export type AuthScope = (typeof AUTH_SCOPES)[number];

export const CLIENT_USER_SUBROLES = [
  { value: "staff", label: "Clinic Practitioner / Dentist (Staff)" },
  { value: "receptionist", label: "Front Desk & Scheduling (Receptionist)" },
  { value: "patient", label: "Patient / Client Customer" },
] as const;
export type ClientUserSubrole = (typeof CLIENT_USER_SUBROLES)[number]["value"];

export function normalizeSlugInput(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
}

export const slugSchema = z
  .string()
  .trim()
  .min(3, "Subdomain slug must be at least 3 characters.")
  .max(63, "Subdomain slug cannot exceed 63 characters.")
  .regex(
    SLUG_REGEX,
    "Use only lowercase letters, numbers, and interior hyphens (e.g., apexdental)."
  )
  .refine((val) => !RESERVED_SUBDOMAINS.has(val), {
    message: "This subdomain is reserved by the Fides platform.",
  });

/** CPG-61: Request Account validation schema. */
export const accountRequestSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "Business or clinic name must be at least 2 characters.")
    .max(120, "Business name cannot exceed 120 characters."),
  category: z.enum([
    "dental",
    "medical",
    "wellness",
    "salon",
    "consulting",
    "other",
  ]),
  slug: slugSchema,
  ownerName: z
    .string()
    .trim()
    .min(2, "Primary owner or contact name is required.")
    .max(100, "Contact name cannot exceed 100 characters."),
  ownerEmail: z
    .string()
    .trim()
    .email("Enter a valid work email address."),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid contact phone number.")
    .max(30, "Phone number is too long."),
  address: z
    .string()
    .trim()
    .min(4, "Clinic or business location is required.")
    .max(200, "Address cannot exceed 200 characters."),
  estimatedStaff: z.enum(["1-5", "6-15", "16-50", "50+"]).default("1-5"),
  licenseOrTaxId: z
    .string()
    .trim()
    .max(64, "License or registration ID cannot exceed 64 characters.")
    .optional()
    .default(""),
  notes: z
    .string()
    .trim()
    .max(500, "Additional notes cannot exceed 500 characters.")
    .optional()
    .default(""),
});

export type AccountRequestInput = z.infer<typeof accountRequestSchema>;

export interface AccountRequestRecord {
  id: string;
  referenceCode: string;
  businessName: string;
  category: BusinessCategory;
  slug: string;
  status: TenantStatus;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  address: string;
  estimatedStaff: StaffSizeTier;
  licenseOrTaxId: string;
  notes: string;
  reviewerNotes: string | null;
  reviewedBy: string | null;
  resetToken: string | null;
  resetRequestedAt: string | null;
  revisionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAccount {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: AppRole;
  scope: AuthScope;
  clientSubrole?: ClientUserSubrole;
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string | null;
  status: "active" | "pending_reset";
  resetToken: string | null;
  createdAt: string;
}

export interface DispatchedEmailRecord {
  id: string;
  to: string;
  subject: string;
  summary: string;
  actionUrl?: string;
  referenceCode?: string;
  token?: string;
  sentAt: string;
}

export const statusTransitionSchema = z.object({
  status: z.enum(["active", "suspended", "archived", "pending"]),
  reviewerNotes: z.string().trim().max(500).optional().default(""),
  reviewedBy: z.string().trim().optional().default("admin@fides.app"),
});

/** CPG-62: Reset Account Request discriminated union schema. */
export const resetRequestActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("request_password_reset"),
    email: z.string().trim().email("Enter a valid account email address."),
    scope: z.enum(["client_owner", "client_user", "fides_admin"]),
    tenantSlug: z.string().trim().optional(),
  }),
  z.object({
    action: z.literal("complete_password_reset"),
    email: z.string().trim().email("Enter a valid account email address."),
    resetToken: z.string().trim().min(4, "Enter the recovery token."),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters."),
  }),
  z.object({
    action: z.literal("lookup_application"),
    identifier: z
      .string()
      .trim()
      .min(3, "Enter a work email address or reference code (e.g., REQ-2026-4821)."),
  }),
  z.object({
    action: z.literal("resend_activation"),
    requestId: z.string().trim().min(1, "Request ID is required."),
  }),
  z.object({
    action: z.literal("reset_and_revise_application"),
    requestId: z.string().trim().min(1, "Request ID is required."),
    businessName: z.string().trim().min(2, "Business name is required."),
    category: z.enum([
      "dental",
      "medical",
      "wellness",
      "salon",
      "consulting",
      "other",
    ]),
    slug: slugSchema,
    ownerName: z.string().trim().min(2, "Primary contact name is required."),
    ownerEmail: z.string().trim().email("Valid work email is required."),
    phone: z.string().trim().min(7, "Valid phone number is required."),
    address: z.string().trim().min(4, "Clinic address is required."),
    estimatedStaff: z.enum(["1-5", "6-15", "16-50", "50+"]),
    notes: z.string().trim().max(500).optional().default(""),
  }),
]);
