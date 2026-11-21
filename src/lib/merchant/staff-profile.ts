import "server-only";
import type { ManagedStaff } from "@/components/merchant/staff/manage-staff-modal";
import { getAdminClient, type AdminClient } from "@/lib/supabase/admin";
import { zonedDateToUtc } from "@/lib/merchant/overview";

export const staffRoleLabels = { owner: "Owner", admin: "Admin", receptionist: "Receptionist", staff: "Service Staff" };
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const staffProfileColumns = "id, full_name, title, bio, image_url, profile_id, active, commission_type, commission_value";

export function staffDateKey(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: timezone, dateStyle: "short" }).format(date);
}

export function formatStaffCommission(type: string, value: number) {
  if (value <= 0) return "No commission";
  return type === "percentage" ? `${value}% of service price` : `${peso.format(value)} per service`;
}

export async function getMonthlyStaffCommission(db: AdminClient, tenantId: string, timezone: string, now: Date, staffId?: string) {
  const month = staffDateKey(now, timezone).slice(0, 7);
  const { data, error } = await db.rpc("get_staff_commission_totals", {
    p_tenant_id: tenantId,
    p_period_start: zonedDateToUtc(`${month}-01`, timezone).toISOString(),
    p_period_end: now.toISOString(),
    ...(staffId ? { p_staff_id: staffId } : {}),
  });
  if (error) throw error;
  return data ?? [];
}

export async function isLastActiveStaffOwner(db: AdminClient, tenantId: string, staffId: string) {
  const { data: owners, error: ownersError } = await db.from("tenant_memberships").select("profile_id")
    .eq("tenant_id", tenantId).eq("role", "owner");
  if (ownersError) throw ownersError;
  if (!owners?.length) return false;

  const { data: activeOwners, error } = await db.from("staff_members").select("id")
    .eq("tenant_id", tenantId).eq("active", true)
    .in("profile_id", owners.map(({ profile_id }) => profile_id)).limit(2);
  if (error) throw error;
  return activeOwners?.length === 1 && activeOwners[0].id === staffId;
}

// Callers must verify the viewer manages this tenant before loading private profile data.
export async function getStaffProfile(tenantId: string, staffId: string, tenantTimezone: string | null, viewerId: string) {
  const db = getAdminClient();
  if (!db) throw new Error("Staff profiles require Supabase server credentials.");

  const staffWithPhone = await db.from("staff_members")
    .select(`${staffProfileColumns}, phone`)
    .eq("tenant_id", tenantId).eq("id", staffId).maybeSingle();

  const profile = staffWithPhone.error?.code === "42703"
    ? await db.from("staff_members").select(staffProfileColumns)
      .eq("tenant_id", tenantId).eq("id", staffId).maybeSingle()
    : staffWithPhone;
  if (profile.error) throw profile.error;
  const staff = profile.data;
  if (!staff) return null;

  const timezone = tenantTimezone || "Asia/Manila";
  const now = new Date();
  const today = staffDateKey(now, timezone);
  const weekEnd = new Date(`${today}T00:00:00Z`);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const commission = Number(staff.commission_value);
  const results = await Promise.all([
    db.from("staff_service_skills").select("service_id, services!inner(name, active)").eq("tenant_id", tenantId)
      .eq("staff_id", staff.id),
    db.from("shifts").select("id, starts_at, ends_at, breaks(id, starts_at, ends_at)")
      .eq("tenant_id", tenantId).eq("staff_id", staff.id).gt("ends_at", zonedDateToUtc(today, timezone).toISOString())
      .lt("starts_at", zonedDateToUtc(weekEnd.toISOString().slice(0, 10), timezone).toISOString())
      .order("starts_at"),
    staff.profile_id
      ? db.from("tenant_memberships").select("role").eq("tenant_id", tenantId).eq("profile_id", staff.profile_id).maybeSingle()
      : { data: null, error: null },
    db.from("services").select("id, name").eq("tenant_id", tenantId).eq("active", true).order("name"),
    db.from("appointments").select("id, assigned:appointment_services()", { count: "exact", head: true })
      .eq("tenant_id", tenantId).gte("starts_at", now.toISOString())
      .in("status", ["pending_approval", "confirmed", "checked_in", "in_service"])
      .eq("assigned.staff_id", staff.id).or(`staff_id.eq.${staff.id},assigned.not.is.null`),
  ]);
  for (const { error } of results) {
    if (error) throw error;
  }
  const [skills, shifts, staffMembership, catalog, upcoming] = results;
  const [account, totals] = await Promise.all([
    staff.profile_id && staffMembership.data
      ? db.auth.admin.getUserById(staff.profile_id).then(({ data }) => data.user)
      : null,
    commission > 0 ? getMonthlyStaffCommission(db, tenantId, timezone, now, staff.id) : [],
  ]);
  const role = staffMembership.data?.role ?? "staff";
  const staffPhone = "phone" in staff && typeof staff.phone === "string" ? staff.phone : null;
  const phone = staffPhone ?? (account?.phone ? `+${account.phone.replace(/^\+/, "")}` : "");
  const commissionRule = formatStaffCommission(staff.commission_type, commission);
  const accrued = Number(totals[0]?.commission_cents ?? 0);
  const shiftsThisWeek = shifts.data ?? [];
  const services = (skills.data ?? []).filter(({ services }) => services.active)
    .map(({ service_id, services }) => ({ id: service_id, name: services.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const serviceOptions = [
    ...(catalog.data ?? []).map(({ id, name }) => ({ value: id, label: name })),
    ...(skills.data ?? []).filter(({ services }) => !services.active)
      .map(({ service_id, services }) => ({ value: service_id, label: `${services.name} (inactive)` })),
  ];
  const shiftFormat = new Intl.DateTimeFormat("en-PH", { timeZone: timezone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const formatRange = (start: string, end: string) => shiftFormat.formatRange(new Date(start), new Date(end));
  const nextShift = shiftsThisWeek.find((shift) => Date.parse(shift.ends_at) > now.getTime());
  const availability = nextShift ? [
    `Next shift ${formatRange(nextShift.starts_at, nextShift.ends_at)}`,
    ...nextShift.breaks.toSorted((a, b) => a.starts_at.localeCompare(b.starts_at))
      .map((pause) => `Break ${formatRange(pause.starts_at, pause.ends_at)}`),
  ].join(" · ") : "No upcoming shift in the next 7 days";

  const managedStaff: ManagedStaff = {
    id: staff.id,
    fullName: staff.full_name,
    title: staff.title ?? "",
    active: staff.active,
    phone,
    email: account?.email ?? "",
    bio: staff.bio ?? "",
    imageUrl: staff.image_url,
    role,
    roleLabel: staffRoleLabels[role],
    canChangeRole: Boolean(staffMembership.data && staff.profile_id !== viewerId && (role === "staff" || role === "receptionist")),
    services: serviceOptions,
    serviceIds: (skills.data ?? []).map((skill) => skill.service_id),
    commissionType: staff.commission_type,
    commissionValue: commission,
    earnings: peso.format(accrued / 100),
    availability,
    upcomingCount: upcoming.count ?? 0,
  };
  const lastOwnerProtected = staff.active && role === "owner" && await isLastActiveStaffOwner(db, tenantId, staff.id);
  return { managedStaff, services, shiftsThisWeek, commissionRule, timezone, formatRange, lastOwnerProtected };
}
