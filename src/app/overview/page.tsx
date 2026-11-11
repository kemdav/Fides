import { OverviewView } from "@/components/merchant/overview/overview-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Overview Dashboard · Merchant Workspace · Fides",
  description: "Merchant workspace dashboard overview, appointment statistics, and metrics.",
};

export default function OverviewPreviewPage() {
  return <OverviewView />;
}
