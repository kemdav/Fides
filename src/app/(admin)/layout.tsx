import type { ReactNode } from "react";

/**
 * Fides admin portal surface (platform administrators).
 *
 * Reserved for internal platform operations only; access is gated server-side.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh flex-col bg-neutral-950 text-neutral-50">{children}</div>;
}
