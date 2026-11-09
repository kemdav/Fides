import type { Metadata } from "next";
import { ActivityLog } from "@/components/admin/activity-log";
import { loadAdminSnapshot } from "@/lib/applications/service";

export const metadata: Metadata = {
  title: "Activity log",
};

export default async function ActivityPage() {
  const snapshot = await loadAdminSnapshot();
  return <ActivityLog events={snapshot.activity} now={Date.parse(snapshot.now)} />;
}
