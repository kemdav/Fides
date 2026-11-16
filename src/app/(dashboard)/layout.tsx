import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAccountAccess } from "@/lib/applications/service";
import { getAccountSession } from "@/lib/supabase/account-session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getAccountSession();
  if (!session) redirect("/login");

  const access = await getAccountAccess(session.user.id, session.admin);
  if (!access.ok) redirect("/login");

  return <div className="flex min-h-dvh flex-col bg-powder text-ink">{children}</div>;
}
