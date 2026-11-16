import type { Metadata } from "next";
import {
  WalkInsView,
  type AvailableStaffMember,
  type WaitingListEntry,
} from "@/components/merchant/walk-ins/walk-ins-view";

export const metadata: Metadata = {
  title: "Walk-ins & waiting list · Merchant Workspace · Fides",
  description: "Welcome every walk-in and fill available slots without displacing existing bookings.",
};

const waitingList: WaitingListEntry[] = [
  {
    id: "wait-1",
    time: "10:15 AM",
    customer: "Mia Garcia",
    service: "Signature haircut",
    staff: "Any available",
    estimatedWait: "15 min",
    serviceDurationMinutes: 60,
    servicePriceCents: 45000,
  },
  {
    id: "wait-2",
    time: "10:22 AM",
    customer: "Paolo Santos",
    service: "Wellness massage",
    staff: "Lia Ramos",
    estimatedWait: "30 min",
    serviceDurationMinutes: 60,
    servicePriceCents: 120000,
  },
];

const availableStaff: AvailableStaffMember[] = [
  {
    id: "staff-1",
    staff: "Sofia Cruz",
    eligibleServices: "Haircuts · Facial treatments",
    resource: "Chair A",
    nextAvailability: "10:45 AM",
    resourceId: "resource-chair-a",
    eligibleServiceList: ["Signature haircut", "Balayage & gloss", "Facial treatment"],
  },
];

const staffPool: AvailableStaffMember[] = [
  ...availableStaff,
  {
    id: "staff-2",
    staff: "Lia Ramos",
    eligibleServices: "Massage · Manicure",
    resource: "Treatment room",
    nextAvailability: "11:00 AM",
    resourceId: "resource-treatment-room",
    eligibleServiceList: ["Wellness massage", "Botanical spa manicure"],
  },
];

export default function WalkInsPreviewPage() {
  return (
    <WalkInsView
      initialEntries={waitingList}
      availableStaff={availableStaff}
      staffPool={staffPool}
      servedTodayCount={6}
      typicalWait="15 min"
      dateISO="2026-10-21"
      dateLabel="October 21, 2026"
    />
  );
}
