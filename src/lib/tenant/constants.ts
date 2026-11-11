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
  "login",
  "signup",
  "register",
  "request-account",
  "reset-password",
  "reset-request",
  "help",
  "billing",
  "mail",
  "docs",
  "portal",
  "status",
]);

/** Root domain tenant subdomains are served from, e.g. `fides.app`. */
export const PLATFORM_DOMAIN = siteConfig.platformDomain;

/** IP address for A-record DNS routing for custom root domains. */
export const PLATFORM_IP = process.env.NEXT_PUBLIC_PLATFORM_IP || "76.76.21.21";

/**
 * Request header used to pass the resolved tenant slug from the proxy into
 * server components, route handlers, and server actions.
 */
export const TENANT_HEADER = "x-fides-tenant";
