import { siteConfig } from "@/lib/site";

/**
 * Subdomains that are reserved for platform surfaces and must never be
 * interpreted as a tenant slug.
 */
export const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set([
  "www",
  "app",
  "admin",
  "api",
  "dashboard",
  "auth",
  "static",
  "assets",
  "cdn",
]);

/** Root domain tenant subdomains are served from, e.g. `fides.app`. */
export const PLATFORM_DOMAIN = siteConfig.platformDomain;

/**
 * Request header used to pass the resolved tenant slug from the proxy into
 * server components, route handlers, and server actions.
 */
export const TENANT_HEADER = "x-fides-tenant";
