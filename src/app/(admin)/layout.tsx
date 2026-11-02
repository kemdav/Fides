import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

const sampleAdmin = { name: "Alex Laurent", role: "Platform administrator" };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell identity={sampleAdmin}>{children}</AdminShell>;
}
