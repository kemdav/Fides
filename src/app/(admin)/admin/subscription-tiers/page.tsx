import type { Metadata } from "next";
import { TiersScreen } from "@/components/admin/tiers-screen";

export const metadata: Metadata = {
  title: "Subscription tiers",
};

export default function SubscriptionTiersPage() {
  return <TiersScreen />;
}
