import { publicEnv } from "@/lib/env";

/**
 * Platform-level branding and routing configuration.
 * Tenant-specific branding lives in the database and is loaded per request.
 */
export const siteConfig = {
  name: "Fides",
  description:
    "A multi-tenant SaaS platform giving local service businesses an official booking website and a unified management dashboard.",
  url: publicEnv.siteUrl,
  platformDomain: publicEnv.platformDomain,
} as const;
