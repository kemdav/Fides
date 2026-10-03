import type { ReactNode } from "react";

/**
 * Provider website surface (customer-facing booking site).
 *
 * Rendered per tenant from the wildcard subdomain. Tenant branding, layout, and
 * content are loaded per request once those features are implemented.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh flex-col">{children}</div>;
}
