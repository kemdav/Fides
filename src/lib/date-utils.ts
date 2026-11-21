/**
 * Fides Date & Time Utilities for Asia/Manila (UTC+08:00)
 *
 * Provides standardized, timezone-safe formatting, date bucketing,
 * and data mapping between database records and UI appointment items.
 */

export const MANILA_TIMEZONE = "Asia/Manila";

/**
 * Format an ISO timestamp or Date object into 12-hour "hh:mm A" in Asia/Manila.
 * e.g. "2026-11-19T02:30:00.000Z" -> "10:30 AM"
 */
export function formatTimeManila(dateOrIso: string | Date): string {
  const date = typeof dateOrIso === "string" ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(date.getTime())) return "09:00 AM";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const hour = parts.find((p) => p.type === "hour")?.value ?? "12";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value?.toUpperCase() ?? "AM";

  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")} ${dayPeriod}`;
}

/**
 * Get date key "YYYY-MM-DD" in Asia/Manila timezone.
 * Handles UTC boundary (e.g. 16:00 UTC = 00:00 next day Manila).
 */
export function getManilaDateKey(dateOrIso?: string | Date): string {
  const date =
    dateOrIso === undefined
      ? new Date()
      : typeof dateOrIso === "string"
        ? new Date(dateOrIso)
        : dateOrIso;

  if (isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Get today's date key "YYYY-MM-DD" in Asia/Manila.
 */
export function getManilaTodayKey(): string {
  return getManilaDateKey(new Date());
}

/**
 * Combine a calendar date (YYYY-MM-DD) and a time string (e.g. "10:30 AM" or "14:30")
 * into a timezone-correct ISO 8601 string (+08:00 offset).
 */
export function combineDateAndTimeManila(
  dateStr: string,
  timeStr: string,
): { startsAt: string; startsAtDate: Date } {
  let hour = 10;
  let minute = 0;

  const timeMatch = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    minute = parseInt(timeMatch[2], 10);
    const meridiem = timeMatch[3]?.toUpperCase();

    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
  }

  const paddedH = String(hour).padStart(2, "0");
  const paddedM = String(minute).padStart(2, "0");
  const cleanDate = dateStr.trim().slice(0, 10);

  // Parse as Manila local time with explicit +08:00 offset
  const isoLocal = `${cleanDate}T${paddedH}:${paddedM}:00+08:00`;
  const date = new Date(isoLocal);

  return {
    startsAt: date.toISOString(),
    startsAtDate: date,
  };
}

export interface ManilaWeekDay {
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  dateKey: string;
}

/**
 * Generate Monday–Sunday week buckets for the week containing `anchorDate` in Asia/Manila.
 */
export function getManilaWeekDays(anchorDate?: Date | string): ManilaWeekDay[] {
  const date =
    anchorDate === undefined
      ? new Date()
      : typeof anchorDate === "string"
        ? new Date(anchorDate)
        : anchorDate;

  // Find year, month, day in Manila
  const dateKey = getManilaDateKey(date);
  const [y, m, d] = dateKey.split("-").map(Number);
  // Noon in Manila to avoid DST/boundary issues
  const manilaNoon = new Date(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00+08:00`);

  // Determine Manila day of week: Sunday = 0, Monday = 1, etc.
  const dayOfWeekStr = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIMEZONE,
    weekday: "short",
  }).format(manilaNoon);

  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const currentDay = dayMap[dayOfWeekStr] ?? 1;
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

  const days: Array<ManilaWeekDay["day"]> = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return days.map((day, index) => {
    const offsetFromMonday = index;
    const targetOffset = mondayOffset + offsetFromMonday;
    const targetDate = new Date(manilaNoon.getTime() + targetOffset * 24 * 60 * 60 * 1000);
    return {
      day,
      dateKey: getManilaDateKey(targetDate),
    };
  });
}

/**
 * Map database appointment_status enum to UI AppointmentItem["status"]
 */
export function mapDbStatusToUi(
  status: string | null | undefined,
): "Confirmed" | "Check In" | "Pending approval" | "In service" | "Completed" | "Cancelled" {
  switch (status?.trim().toLowerCase()) {
    case "confirmed":
      return "Confirmed";
    case "checked_in":
    case "check in":
      return "Check In";
    case "pending_approval":
    case "pending":
      return "Pending approval";
    case "in_service":
    case "in service":
      return "In service";
    case "completed":
      return "Completed";
    case "cancelled":
    case "canceled":
    case "rejected":
    case "expired":
    case "no_show":
    case "no show":
      return "Cancelled";
    default:
      return "Confirmed";
  }
}

/**
 * Map database booking_source enum to UI AppointmentItem["source"]
 */
export function mapDbSourceToUi(source: string | null | undefined): "Online" | "Walk-In" {
  if (source?.trim().toLowerCase() === "walk_in" || source === "Walk-In") {
    return "Walk-In";
  }
  return "Online";
}

/**
 * Fallback-safe resolvers for joined Supabase data
 */
export function resolveCustomerName(
  customer: { full_name?: string | null } | { full_name?: string | null }[] | null | undefined,
  notes?: string | null,
): string {
  const c = Array.isArray(customer) ? customer[0] : customer;
  if (c?.full_name?.trim()) return c.full_name.trim();
  if (notes?.trim()) {
    const match = notes.match(/Customer:\s*([^\n;]+)/i);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return "Guest Customer";
}

export function resolveStaffName(
  staff: { full_name?: string | null } | { full_name?: string | null }[] | null | undefined,
): string {
  const s = Array.isArray(staff) ? staff[0] : staff;
  return s?.full_name?.trim() || "Unassigned";
}

export function resolveServiceName(
  appointmentServices:
    | { services?: { name?: string | null } | { name?: string | null }[] | null }
    | { services?: { name?: string | null } | { name?: string | null }[] | null }[]
    | null
    | undefined,
): string {
  const item = Array.isArray(appointmentServices) ? appointmentServices[0] : appointmentServices;
  const svc = Array.isArray(item?.services) ? item?.services[0] : item?.services;
  return svc?.name?.trim() || "Signature Service";
}
