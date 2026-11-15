import type { Metadata } from "next";
import { SettingsScreen } from "@/components/admin/settings-screen";
import { requireAdminPortal } from "@/lib/admin/access";
import { listAccountDirectory } from "@/lib/applications/service";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const session = await requireAdminPortal();
  const accounts = await listAccountDirectory();
  return <SettingsScreen adminName={session.displayName} adminUsername={session.username} accounts={accounts} />;
}
