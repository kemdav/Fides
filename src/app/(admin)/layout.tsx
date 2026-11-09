import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPortal } from "@/lib/admin/access";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const admin = { name: "Fides Admin", role: "Platform administrator" };

export default function AdminLayout({ children }: { children: ReactNode }) {
  requireAdminPortal();
  return <AdminShell identity={admin}>{children}</AdminShell>;
}
