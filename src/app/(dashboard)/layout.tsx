import type { ReactNode } from "react";

/**
 * Management dashboard surface (business owners and employees).
 *
 * Authentication, role-based access, and tenant scoping are enforced by the
 * proxy and server-side checks in the feature modules.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh flex-col bg-neutral-50">{children}</div>;
}
