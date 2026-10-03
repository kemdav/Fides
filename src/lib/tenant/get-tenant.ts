import { PLATFORM_DOMAIN, RESERVED_SUBDOMAINS } from "./constants";

/** Result of resolving an incoming request host to a tenant. */
export interface TenantResolution {
  /** Tenant subdomain slug, or `null` when the request targets the platform. */
  slug: string | null;
  /** Lower-cased hostname without the port. */
  hostname: string;
  /** True when the request targets a platform surface (not a tenant site). */
  isPlatformHost: boolean;
}

const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/** Strips the port and lower-cases a hostname (IPv6 hosts are returned as-is). */
function normalizeHost(host: string): string {
  const withoutPort = host.replace(/:\d+$/, "");
  return withoutPort.toLowerCase();
}

/**
 * Resolves the active tenant from a request `Host` header using the platform's
 * wildcard subdomain strategy (SDD 2.1.1 / SPMP deployment plan).
 *
 * - `fides.app` and `www.fides.app` -> platform host (no tenant).
 * - `<slug>.fides.app`             -> tenant `slug`.
 * - `localhost` / IP addresses     -> platform host (local development).
 *
 * Custom domains are explicitly out of MVP scope, so any host that is not a
 * subdomain of the platform domain resolves to no tenant.
 */
export function resolveTenantFromHostname(host: string): TenantResolution {
  const hostname = normalizeHost(host);
  const rootDomain = normalizeHost(PLATFORM_DOMAIN);

  if (!hostname) {
    return { slug: null, hostname, isPlatformHost: true };
  }

  const isLocalHost = hostname === "localhost" || IPV4_PATTERN.test(hostname);
  if (isLocalHost) {
    return { slug: null, hostname, isPlatformHost: true };
  }

  if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
    return { slug: null, hostname, isPlatformHost: true };
  }

  if (hostname.endsWith(`.${rootDomain}`)) {
    const slug = hostname.slice(0, -(rootDomain.length + 1));

    // Nested subdomains, empty slugs, and reserved names are platform hosts.
    if (!slug || slug.includes(".") || RESERVED_SUBDOMAINS.has(slug)) {
      return { slug: null, hostname, isPlatformHost: true };
    }

    return { slug, hostname, isPlatformHost: false };
  }

  return { slug: null, hostname, isPlatformHost: false };
}
