import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPortal } from "@/lib/admin/access";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdminPortal();
  return <AdminShell identity={{ name: admin.displayName, role: "Platform administrator" }}>{children}</AdminShell>;
}
