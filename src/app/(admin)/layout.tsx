import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPortal } from "@/lib/admin/access";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const sampleAdmin = { name: "Alex Laurent", role: "Platform administrator" };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminPortal();
  return <AdminShell identity={sampleAdmin}>{children}</AdminShell>;
}
