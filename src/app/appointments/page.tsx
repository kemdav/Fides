import { AppointmentsView } from "@/components/merchant/appointments/appointments-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Appointments · Merchant Workspace · Fides",
  description: "Manage bookings, approvals, and appointment outcomes in one place.",
};

export default function AppointmentsPreviewPage() {
  return <AppointmentsView />;
}
