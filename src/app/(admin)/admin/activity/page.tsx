import type { Metadata } from "next";
import { ActivityLog } from "@/components/admin/activity-log";

export const metadata: Metadata = {
  title: "Activity log",
};

export default function ActivityPage() {
  return <ActivityLog />;
}
