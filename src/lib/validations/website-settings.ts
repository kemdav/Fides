import { z } from "zod";
import { RESERVED_SUBDOMAINS } from "@/lib/tenant/constants";

export const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
export const SUBDOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;
export const CUSTOM_DOMAIN_REGEX = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const subdomainSchema = z
  .string()
  .min(3, "Subdomain must be at least 3 characters")
  .max(40, "Subdomain cannot exceed 40 characters")
  .toLowerCase()
  .regex(
    SUBDOMAIN_REGEX,
    "Subdomain can only contain lowercase letters, numbers, and hyphens (cannot start or end with a hyphen)"
  )
  .refine((slug) => !RESERVED_SUBDOMAINS.has(slug), {
    message: "This website address is reserved for system use.",
  });

export const customDomainSchema = z
  .string()
  .max(100, "Domain name is too long")
  .regex(CUSTOM_DOMAIN_REGEX, "Please enter a valid domain name (e.g. www.yourbusiness.com)");

export const websiteSettingsSchema = z.object({
  // Brand identity
  businessName: z.string().min(1, "Business name is required").max(100),
  logoInitials: z.string().min(1).max(4),
  logoUrl: z.string().optional().or(z.literal("")),
  typography: z.string().min(1).default("Ovo + Mulish"),
  mainColor: z.string().regex(HEX_COLOR_REGEX, "Main color must be a 6-character hex code"),
  secondaryColor: z.string().regex(HEX_COLOR_REGEX, "Secondary color must be a 6-character hex code"),
  accentColor: z.string().regex(HEX_COLOR_REGEX, "Accent color must be a 6-character hex code"),

  // Homepage content
  headline: z.string().min(1, "Headline is required").max(200),
  supportingMessage: z.string().max(500).default(""),
  coverPhotoName: z.string().max(100).default("bella-vita-studio.jpg"),
  coverPhotoUrl: z.string().optional().or(z.literal("")),
  showFeaturedServices: z.boolean().default(true),
  showContactDetails: z.boolean().default(true),

  // Business info & contact
  businessCategory: z.string().min(1).max(50).default("Beauty & wellness"),
  about: z.string().max(1000).default(""),
  businessEmail: z.string().email("Please enter a valid business email"),
  phoneNumber: z.string().max(30).default(""),
  instagram: z.string().max(100).default(""),

  // Location & opening hours
  streetAddress: z.string().max(200).default(""),
  cityProvince: z.string().max(100).default(""),
  postalCode: z.string().max(20).default(""),
  hoursMonFri: z.string().max(50).default("9:00 AM – 6:00 PM"),
  hoursSat: z.string().max(50).default("10:00 AM – 5:00 PM"),
  hoursSun: z.string().max(50).default("Closed"),
  timeZone: z.string().max(50).default("Asia/Manila (UTC+08:00)"),
  showOpeningHours: z.boolean().default(true),

  // Website address & custom domain
  subdomain: subdomainSchema,
  customDomain: z.string().max(100).default(""),
  isDomainVerified: z.boolean().default(false),

  // Search & sharing
  pageTitle: z.string().max(100).default(""),
  metaDescription: z.string().max(300).default(""),
  allowIndexing: z.boolean().default(true),
  socialTitle: z.string().max(100).default(""),
  socialDescription: z.string().max(300).default(""),
});

export const assetTypeSchema = z.enum(["logo", "cover", "social"]);

export const ALLOWED_LOGO_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

export const ALLOWED_COVER_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

export const MAX_FILE_SIZES: Record<z.infer<typeof assetTypeSchema>, number> = {
  logo: 2 * 1024 * 1024, // 2MB
  cover: 5 * 1024 * 1024, // 5MB
  social: 4 * 1024 * 1024, // 4MB
};
