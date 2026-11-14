import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPortal } from "@/lib/admin/access";
import { loadPendingSummary } from "@/lib/applications/service";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminPortal();
  const pending = await loadPendingSummary().catch(() => ({ count: 0, items: [] }));
  const identity = { name: session.displayName, role: "Platform administrator" };
  return (
    <AdminShell identity={identity} pending={pending}>
      {children}
    </AdminShell>
  );
}
