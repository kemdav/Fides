import type { ComponentProps } from "react";
import { StatusPill } from "@/components/admin/primitives";

type Tone = ComponentProps<typeof StatusPill>["tone"];

/** The label statuses shown across the merchant screens (appointments, overview). */
export type AppointmentStatusLabel = "Confirmed" | "Pending approval" | "Check In" | "In service" | "Completed" | "Cancelled";

const labelTones: Record<AppointmentStatusLabel, Tone> = {
  Confirmed: "success",
  "Pending approval": "warning",
  "Check In": "info",
  "In service": "info",
  Completed: "neutral",
  Cancelled: "danger",
};

export function AppointmentStatusPill({ status }: { status: AppointmentStatusLabel }) {
  return <StatusPill tone={labelTones[status] ?? "neutral"}>{status}</StatusPill>;
}

/** Same pill for raw database statuses (customer profile visit history). */
export function DbAppointmentStatusPill({ status, label }: { status: string; label: string }) {
  const tone: Tone =
    status === "completed" || status === "confirmed"
      ? "success"
      : status === "cancelled" || status === "no_show"
        ? "danger"
        : status === "pending_approval"
          ? "warning"
          : "info";
  return <StatusPill tone={tone}>{label}</StatusPill>;
}
