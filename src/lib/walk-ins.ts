import { createClient } from "@/lib/supabase/server";
import type {
  AvailableStaffMember,
  WaitingListEntry,
} from "@/components/merchant/walk-ins/walk-ins-view";

const DEFAULT_SERVICE_DURATION_MINUTES = 60;
const DEFAULT_PRICE_CENTS = 45000;

export function getManilaDateISO(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatManilaDateLabel(dateISO: string): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatManilaTime(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function nextQuarterHourLabel(): string {
  const now = new Date();
  const minutes = now.getMinutes();
  const remainder = 15 - (minutes % 15);
  now.setMinutes(minutes + (remainder === 0 ? 15 : remainder), 0, 0);
  return formatManilaTime(now);
}

export async function loadWalkInsDashboardData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
) {
  const now = new Date();
  const dateISO = getManilaDateISO(now);
  const dayStart = `${dateISO}T00:00:00+08:00`;
  const dayEnd = `${dateISO}T23:59:59+08:00`;

  const [
    { data: queueRows },
    { data: staffRows },
    { data: serviceRows },
    { data: resourceRows },
    { data: skillRows },
    { data: serviceResourceRows },
    { count: servedTodayCount },
  ] = await Promise.all([
    supabase
      .from("waitlist_entries")
      .select("id, customer_id, guest_name, service_id, staff_id, status, joined_at, notes")
      .eq("tenant_id", tenantId)
      .in("status", ["waiting", "notified"])
      .order("joined_at", { ascending: true }),
    supabase
      .from("staff_members")
      .select("id, full_name, active, sort_order")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("services")
      .select("id, name, price_cents, duration_minutes")
      .eq("tenant_id", tenantId),
    supabase
      .from("resources")
      .select("id, name, active")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("staff_service_skills")
      .select("staff_id, service_id")
      .eq("tenant_id", tenantId),
    supabase
      .from("service_resources")
      .select("service_id, resource_id")
      .eq("tenant_id", tenantId),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("source", "walk_in")
      .gte("starts_at", dayStart)
      .lte("starts_at", dayEnd),
  ]);

  const queue = queueRows ?? [];
  const staff = staffRows ?? [];
  const services = serviceRows ?? [];
  const resources = resourceRows ?? [];
  const skills = skillRows ?? [];
  const serviceResources = serviceResourceRows ?? [];

  const customerIds = Array.from(
    new Set(queue.map((row) => row.customer_id).filter((id): id is string => Boolean(id))),
  );
  const customerNames = new Map<string, string>();
  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from("customers")
      .select("id, full_name")
      .eq("tenant_id", tenantId)
      .in("id", customerIds);
    for (const customer of customers ?? []) {
      if (customer.full_name) customerNames.set(customer.id, customer.full_name);
    }
  }

  const serviceById = new Map(services.map((service) => [service.id, service]));
  const resourceById = new Map(resources.map((resource) => [resource.id, resource]));
  const staffById = new Map(staff.map((member) => [member.id, member]));

  const skillServiceNames = new Map<string, string[]>();
  for (const skill of skills) {
    const service = serviceById.get(skill.service_id);
    if (!service) continue;
    const list = skillServiceNames.get(skill.staff_id) ?? [];
    list.push(service.name);
    skillServiceNames.set(skill.staff_id, list);
  }

  const resourceForService = new Map<string, string>();
  for (const link of serviceResources) {
    if (!resourceForService.has(link.service_id)) {
      resourceForService.set(link.service_id, link.resource_id);
    }
  }

  const initialEntries: WaitingListEntry[] = queue.map((row, index) => {
    const service = row.service_id ? serviceById.get(row.service_id) : undefined;
    const requestedStaff = row.staff_id ? staffById.get(row.staff_id) : undefined;
    const customerName =
      (row.customer_id ? customerNames.get(row.customer_id) : undefined) ??
      row.guest_name?.trim() ??
      "Walk-in guest";

    return {
      id: row.id,
      time: formatManilaTime(row.joined_at),
      customer: customerName,
      service: service?.name ?? "Walk-in service",
      staff: requestedStaff?.full_name ?? "Any available",
      estimatedWait: `${(index + 1) * 15} min`,
      serviceDurationMinutes: service?.duration_minutes ?? DEFAULT_SERVICE_DURATION_MINUTES,
      servicePriceCents: service?.price_cents ?? DEFAULT_PRICE_CENTS,
      requestedStaffId: row.staff_id ?? undefined,
      joinedAtISO: row.joined_at,
      notes: row.notes ?? undefined,
    };
  });

  const nextAvailability = nextQuarterHourLabel();
  const firstResourceName = resources[0]?.name ?? "No resource";

  const availableStaff: AvailableStaffMember[] = staff.map((member) => {
    const eligibleServiceList = skillServiceNames.get(member.id) ?? [];

    let preferredResourceId: string | undefined;
    for (const service of services) {
      if (!eligibleServiceList.includes(service.name)) continue;
      const linkedResourceId = resourceForService.get(service.id);
      if (linkedResourceId && resourceById.has(linkedResourceId)) {
        preferredResourceId = linkedResourceId;
        break;
      }
    }
    if (!preferredResourceId) preferredResourceId = resources[0]?.id;
    const resource = preferredResourceId ? resourceById.get(preferredResourceId) : undefined;

    return {
      id: member.id,
      staff: member.full_name,
      eligibleServices:
        eligibleServiceList.length > 0 ? eligibleServiceList.slice(0, 2).join(" · ") : "All services",
      resource: resource?.name ?? firstResourceName,
      nextAvailability,
      resourceId: resource?.id,
      eligibleServiceList,
    };
  });

  return {
    initialEntries,
    availableStaff,
    servedTodayCount: servedTodayCount ?? 0,
    typicalWait: initialEntries.length > 0 ? `${initialEntries.length * 15} min` : "No wait",
    dateISO,
    dateLabel: formatManilaDateLabel(dateISO),
  };
}
