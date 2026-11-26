import { z } from "zod";
import { RESERVED_SUBDOMAINS } from "@/lib/tenant/constants";

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

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

export interface SlugValidationResult {
  slug: string;
  normalizedSlug: string;
  available: boolean;
  reason: string;
  previewHost: string;
  suggestions: string[];
}
