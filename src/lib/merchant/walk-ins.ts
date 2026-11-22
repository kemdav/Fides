    import { createClient } from "@/lib/supabase/server";
import type {
  AssignableSlotOption,
  WaitlistQueueItem,
  WaitlistStatus,
  WalkInServiceOption,
  WalkInStaffOption,
  WalkInWorkspaceData,
} from "@/types/walk-ins";

const MANILA_OFFSET = "+08:00";
const MANILA_TZ = "Asia/Manila";
const BUSINESS_START_HOUR = 9; // 9:00 AM
const BUSINESS_END_HOUR = 20; // 8:00 PM
const SLOT_STEP_MINUTES = 15;

const BLOCKING_STATUSES = [
  "pending_approval",
  "confirmed",
  "checked_in",
  "in_service",
] as const;

export function getManilaDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatManilaTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatManilaDate(dateStr: string): string {
  const dt = new Date(`${dateStr}T00:00:00${MANILA_OFFSET}`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(dt);
}

export function buildManilaIso(dateStr: string, timeLabel: string): string {
  let hour = 10;
  let minute = 0;
  const match = timeLabel.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    hour = parseInt(match[1], 10);
    minute = parseInt(match[2], 10);
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
  }
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return new Date(`${dateStr}T${hh}:${mm}:00${MANILA_OFFSET}`).toISOString();
}

export async function resolveMerchantTenantId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantIdParam?: string
): Promise<string | null> {
  if (tenantIdParam) return tenantIdParam;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("profile_id", user.id)
    .in("role", ["owner", "admin", "receptionist", "staff"])
    .limit(1)
    .maybeSingle();

  if (membership?.tenant_id) return membership.tenant_id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.tenant_id) return profile.tenant_id;

  const { data: fallbackTenant } = await supabase
    .from("tenants")
    .select("id")
    .limit(1)
    .maybeSingle();

  return fallbackTenant?.id ?? null;
}

interface BusyInterval {
  staffId: string;
  startMs: number;
  endMs: number;
}

function hasOverlap(
  intervals: BusyInterval[],
  staffId: string,
  startMs: number,
  endMs: number
): boolean {
  return intervals.some(
    (b) => b.staffId === staffId && b.startMs < endMs && b.endMs > startMs
  );
}

function roundUpToStep(ms: number, stepMinutes: number): number {
  const stepMs = stepMinutes * 60 * 1000;
  return Math.ceil(ms / stepMs) * stepMs;
}

export function computeAvailableSlotsForStaff(params: {
  dateStr: string;
  staffId: string;
  durationMinutes: number;
  busyIntervals: BusyInterval[];
  nowMs?: number;
  limit?: number;
}): AssignableSlotOption[] {
  const {
    dateStr,
    staffId,
    durationMinutes,
    busyIntervals,
    nowMs = Date.now(),
    limit = 12,
  } = params;

  const dayStartMs = new Date(
    `${dateStr}T${String(BUSINESS_START_HOUR).padStart(2, "0")}:00:00${MANILA_OFFSET}`
  ).getTime();
  const dayEndMs = new Date(
    `${dateStr}T${String(BUSINESS_END_HOUR).padStart(2, "0")}:00:00${MANILA_OFFSET}`
  ).getTime();

  const durationMs = Math.max(durationMinutes, 15) * 60 * 1000;
  const todayStr = getManilaDateString(new Date(nowMs));
  const earliestMs =
    dateStr === todayStr
      ? Math.max(dayStartMs, roundUpToStep(nowMs, SLOT_STEP_MINUTES))
      : dayStartMs;

  const slots: AssignableSlotOption[] = [];
  for (
    let cursor = earliestMs;
    cursor + durationMs <= dayEndMs && slots.length < limit;
    cursor += SLOT_STEP_MINUTES * 60 * 1000
  ) {
    const endCursor = cursor + durationMs;
    if (!hasOverlap(busyIntervals, staffId, cursor, endCursor)) {
      const startsAt = new Date(cursor).toISOString();
      const endsAt = new Date(endCursor).toISOString();
      slots.push({
        startsAt,
        endsAt,
        label: `${formatManilaTime(startsAt)} → ${formatManilaTime(endsAt)}`,
        durationMinutes,
      });
    }
  }

  return slots;
}

export async function getWalkInWorkspaceData(
  tenantIdParam?: string
): Promise<WalkInWorkspaceData | null> {
  const supabase = await createClient();
  const tenantId = await resolveMerchantTenantId(supabase, tenantIdParam);
  if (!tenantId) return null;

  const todayStr = getManilaDateString();
  const dayStartIso = new Date(`${todayStr}T00:00:00${MANILA_OFFSET}`).toISOString();
  const dayEndIso = new Date(`${todayStr}T23:59:59${MANILA_OFFSET}`).toISOString();

  const [servicesRes, staffRes, waitlistRes, todayApptsRes] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, price_cents, duration_minutes")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true }),
    supabase
      .from("staff_members")
      .select("id, full_name, active")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("full_name", { ascending: true }),
    supabase
      .from("waitlist_entries")
      .select(
        "id, customer_id, guest_name, guest_phone, service_id, staff_id, status, joined_at, notified_at, notes, customers(full_name, phone)"
      )
      .eq("tenant_id", tenantId)
      .in("status", ["waiting", "notified"])
      .order("joined_at", { ascending: true }),
    supabase
      .from("appointments")
      .select("id, staff_id, starts_at, ends_at, status, source")
      .eq("tenant_id", tenantId)
      .gte("starts_at", dayStartIso)
      .lte("starts_at", dayEndIso),
  ]);

  const services: WalkInServiceOption[] = (servicesRes.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    priceCents: s.price_cents ?? 0,
    durationMinutes: s.duration_minutes ?? 60,
  }));

  const serviceById = new Map(services.map((s) => [s.id, s]));
  const defaultServicesSummary =
    services
      .slice(0, 2)
      .map((s) => s.name)
      .join(" · ") || "All active services";

  const todayAppts = todayApptsRes.data ?? [];
  const busyIntervals: BusyInterval[] = todayAppts
    .filter((a) =>
      (BLOCKING_STATUSES as readonly string[]).includes(a.status)
    )
    .map((a) => ({
      staffId: a.staff_id,
      startMs: new Date(a.starts_at).getTime(),
      endMs: new Date(a.ends_at).getTime(),
    }));

  const nowMs = Date.now();
  const staffRows = staffRes.data ?? [];

  const staff: WalkInStaffOption[] = staffRows.map((member, idx) => {
    const slotsToday = computeAvailableSlotsForStaff({
      dateStr: todayStr,
      staffId: member.id,
      durationMinutes: 45,
      busyIntervals,
      nowMs,
      limit: 1,
    });

    const isOccupiedRightNow = hasOverlap(
      busyIntervals,
      member.id,
      nowMs,
      nowMs + 15 * 60 * 1000
    );

    const firstSlot = slotsToday[0] ?? null;

    return {
      id: member.id,
      fullName: member.full_name,
      resourceLabel: `Station ${String.fromCharCode(65 + (idx % 26))}`,
      eligibleServicesLabel: defaultServicesSummary,
      isAvailableNow: !isOccupiedRightNow && firstSlot !== null,
      nextAvailableLabel: firstSlot
        ? formatManilaTime(firstSlot.startsAt)
        : "Fully booked today",
      nextAvailableIso: firstSlot?.startsAt ?? null,
    };
  });

  const staffById = new Map(staff.map((s) => [s.id, s]));
  const availableNow = staff.filter((s) => s.isAvailableNow);

  const rawWaitlist = waitlistRes.data ?? [];
  const baseWaitStep = availableNow.length > 0 ? 15 : 25;

  const waitingList: WaitlistQueueItem[] = rawWaitlist.map((row, index) => {
    const svc = row.service_id ? serviceById.get(row.service_id) : undefined;
    const requestedStaff = row.staff_id ? staffById.get(row.staff_id) : undefined;
    const joinedCustomer = Array.isArray(row.customers)
      ? row.customers[0]
      : row.customers;

    return {
      id: row.id,
      position: index + 1,
      totalWaiting: rawWaitlist.length,
      joinedAt: row.joined_at,
      joinedTimeLabel: formatManilaTime(row.joined_at),
      customerId: row.customer_id,
      customerName:
        row.guest_name?.trim() || joinedCustomer?.full_name || "Walk-in guest",
      customerPhone: row.guest_phone?.trim() || joinedCustomer?.phone || null,
      serviceId: row.service_id,
      serviceName: svc?.name ?? "General service",
      serviceDurationMinutes: svc?.durationMinutes ?? 60,
      servicePriceCents: svc?.priceCents ?? 0,
      requestedStaffId: row.staff_id,
      requestedStaffName: requestedStaff?.fullName ?? null,
      status: row.status as WaitlistStatus,
      notifiedAt: row.notified_at,
      notes: row.notes,
      estimatedWaitMinutes: (index + 1) * baseWaitStep,
    };
  });

  const walkInsServedToday = todayAppts.filter(
    (a) =>
      a.source === "walk_in" &&
      !["cancelled", "rejected", "expired", "no_show"].includes(a.status)
  ).length;

  const firstAvail = availableNow[0];
  const availableStaffSummary = firstAvail
    ? `${firstAvail.fullName} · next slot ${firstAvail.nextAvailableLabel}`
    : "All staff currently occupied";

  const typicalWaitingMinutes =
    waitingList.length === 0 ? 0 : waitingList[0].estimatedWaitMinutes;

  return {
    tenantId,
    kpis: {
      waitingNow: waitingList.length,
      availableStaffCount: availableNow.length,
      availableStaffSummary,
      walkInsServedToday,
      typicalWaitingMinutes,
      totalActiveStaff: Math.max(staff.length, 1),
    },
    waitingList,
    availableNow,
    services,
    staff,
  };
}