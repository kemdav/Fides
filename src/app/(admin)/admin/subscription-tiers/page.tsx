import type { Metadata } from "next";
import { TiersScreen } from "@/components/admin/tiers-screen";
import { loadAdminSnapshot } from "@/lib/applications/service";

export const metadata: Metadata = {
  title: "Subscription tiers",
};

export default async function SubscriptionTiersPage() {
  const snapshot = await loadAdminSnapshot();
  return <TiersScreen tiers={snapshot.tiers} />;
}
