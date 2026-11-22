"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { bookingSettingsSchema } from "@/lib/validations/booking-settings";
import {
  DEFAULT_BOOKING_SETTINGS,
  type BookingSettingsFormValues,
  type BookingSettingsWorkspaceData,
  type StaffAssignmentMode,
} from "@/types/booking-settings";

export type BookingSettingsActionResult<T = unknown> =
  | { success: true; message: string; data?: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

interface TenantBookingSettingsRow {
  tenant_id: string;
  auto_confirm: boolean | null;
  booking_lead_time_minutes: number | null;
  max_advance_days: number | null;
  cancellation_window_hours: number | null;
  reschedule_window_hours: number | null;
  slot_interval_minutes: number | null;
  default_buffer_minutes: number | null;
  staff_assignment_mode: string | null;
  cancellation_policy_notes: string | null;
  time_zone: string | null;
  updated_at: string | null;
  booking_settings_updated_at: string | null;
  booking_settings_updated_by: string | null;
}

interface ResolvedAccess {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  canEdit: boolean;
  tenantId: string;
  tenantSlug: string;
  businessName: string;
  tenantTimezone: string | null;
}

function normalizeStaffAssignmentMode(value: string | null | undefined): StaffAssignmentMode {
  return value === "specific_staff" ? "specific_staff" : "any_available";
}

function formatRoleLabel(role: string): string {
  switch (role) {
    case "owner":
      return "Business owner";
    case "receptionist":
      return "Receptionist";
    case "staff":
      return "Staff member";
    case "admin":
      return "Administrator";
    default:
      return "Team member";
  }
}

async function resolveTenantAccess(
  tenantIdParam?: string
): Promise<
  | { success: true; access: ResolvedAccess; supabase: Awaited<ReturnType<typeof createClient>> }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    return { success: false, error: "Authentication required." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const targetTenantId = tenantIdParam || profile?.tenant_id;
  if (!targetTenantId) {
    return {
      success: false,
      error: "No active business workspace is associated with this account.",
    };
  }

  const [{ data: membership }, { data: tenant }] = await Promise.all([
    supabase
      .from("tenant_memberships")
      .select("role")
      .eq("tenant_id", targetTenantId)
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("tenants")
      .select("id, slug, name, timezone")
      .eq("id", targetTenantId)
      .maybeSingle(),
  ]);

  if (!tenant) {
    return { success: false, error: "Business workspace not found." };
  }

  const isMember =
    Boolean(membership) || profile?.tenant_id === targetTenantId;
  if (!isMember) {
    return {
      success: false,
      error: "Access denied: you are not a member of this business workspace.",
    };
  }

  const effectiveRole =
    membership?.role ??
    (profile?.tenant_id === targetTenantId ? profile?.role : null) ??
    "staff";

  const canEdit = effectiveRole === "owner";
  const userName =
    profile?.full_name?.trim() ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "") ||
    user.email ||
    "Merchant user";

  return {
    success: true,
    supabase,
    access: {
      userId: user.id,
      userName,
      userEmail: user.email ?? profile?.email ?? "",
      role: formatRoleLabel(effectiveRole),
      canEdit,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      businessName: tenant.name,
      tenantTimezone: tenant.timezone ?? null,
    },
  };
}

export async function getBookingSettingsAction(
  tenantIdParam?: string
): Promise<BookingSettingsActionResult<BookingSettingsWorkspaceData>> {
  const resolved = await resolveTenantAccess(tenantIdParam);
  if (!resolved.success) {
    return { success: false, error: resolved.error };
  }

  const { supabase, access } = resolved;
  const db = supabase as unknown as SupabaseClient;

  const { data: row, error } = await db
    .from("tenant_settings")
    .select(
      [
        "tenant_id",
        "auto_confirm",
        "booking_lead_time_minutes",
        "max_advance_days",
        "cancellation_window_hours",
        "reschedule_window_hours",
        "slot_interval_minutes",
        "default_buffer_minutes",
        "staff_assignment_mode",
        "cancellation_policy_notes",
        "time_zone",
        "updated_at",
        "booking_settings_updated_at",
        "booking_settings_updated_by",
      ].join(", ")
    )
    .eq("tenant_id", access.tenantId)
    .maybeSingle<TenantBookingSettingsRow>();

  if (error) {
    return {
      success: false,
      error: `Failed to load booking settings: ${error.message}`,
    };
  }

  let lastSavedByName: string | null = null;
  if (row?.booking_settings_updated_by) {
    const { data: updater } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", row.booking_settings_updated_by)
      .maybeSingle();
    lastSavedByName = updater?.full_name?.trim() || updater?.email || null;
  }

  const settings: BookingSettingsFormValues = {
    autoConfirm: row?.auto_confirm ?? DEFAULT_BOOKING_SETTINGS.autoConfirm,
    staffAssignmentMode: normalizeStaffAssignmentMode(
      row?.staff_assignment_mode
    ),
    defaultBufferMinutes:
      row?.default_buffer_minutes ?? DEFAULT_BOOKING_SETTINGS.defaultBufferMinutes,
    bookingLeadTimeMinutes:
      row?.booking_lead_time_minutes ??
      DEFAULT_BOOKING_SETTINGS.bookingLeadTimeMinutes,
    maxAdvanceDays:
      row?.max_advance_days ?? DEFAULT_BOOKING_SETTINGS.maxAdvanceDays,
    cancellationWindowHours:
      row?.cancellation_window_hours ??
      DEFAULT_BOOKING_SETTINGS.cancellationWindowHours,
    rescheduleWindowHours:
      row?.reschedule_window_hours ??
      DEFAULT_BOOKING_SETTINGS.rescheduleWindowHours,
    cancellationPolicyNotes: row?.cancellation_policy_notes ?? "",
    slotIntervalMinutes:
      row?.slot_interval_minutes ?? DEFAULT_BOOKING_SETTINGS.slotIntervalMinutes,
  };

  return {
    success: true,
    message: "Booking settings loaded.",
    data: {
      settings,
      meta: {
        tenantId: access.tenantId,
        tenantSlug: access.tenantSlug,
        businessName: access.businessName,
        timeZone:
          row?.time_zone || access.tenantTimezone || "Asia/Manila (UTC+8)",
        canEdit: access.canEdit,
        userRole: access.role,
        userName: access.userName,
        userEmail: access.userEmail,
        lastSavedAt: row?.booking_settings_updated_at ?? row?.updated_at ?? null,
        lastSavedByName,
      },
    },
  };
}

export async function saveBookingSettingsAction(
  tenantIdParam: string | undefined,
  payload: BookingSettingsFormValues
): Promise<
  BookingSettingsActionResult<{
    settings: BookingSettingsFormValues;
    lastSavedAt: string;
    lastSavedByName: string;
  }>
> {
  const resolved = await resolveTenantAccess(tenantIdParam);
  if (!resolved.success) {
    return { success: false, error: resolved.error };
  }

  const { supabase, access } = resolved;
  if (!access.canEdit) {
    return {
      success: false,
      error:
        "Access denied: only business owners can modify booking settings.",
    };
  }

  const parsed = bookingSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Please review the invalid settings.",
      fieldErrors,
    };
  }

  const clean = parsed.data;
  const nowIso = new Date().toISOString();
  const db = supabase as unknown as SupabaseClient;

  const { error } = await db.from("tenant_settings").upsert(
    {
      tenant_id: access.tenantId,
      auto_confirm: clean.autoConfirm,
      staff_assignment_mode: clean.staffAssignmentMode,
      default_buffer_minutes: clean.defaultBufferMinutes,
      booking_lead_time_minutes: clean.bookingLeadTimeMinutes,
      max_advance_days: clean.maxAdvanceDays,
      cancellation_window_hours: clean.cancellationWindowHours,
      reschedule_window_hours: clean.rescheduleWindowHours,
      cancellation_policy_notes: clean.cancellationPolicyNotes || null,
      slot_interval_minutes: clean.slotIntervalMinutes,
      booking_settings_updated_at: nowIso,
      booking_settings_updated_by: access.userId,
    },
    { onConflict: "tenant_id" }
  );

  if (error) {
    return {
      success: false,
      error: `Unable to save booking settings: ${error.message}`,
    };
  }

  revalidatePath(`/${access.tenantSlug}/dashboard/settings/booking`);
  revalidatePath("/dashboard/settings/booking");

  return {
    success: true,
    message: "Booking settings saved.",
    data: {
      settings: clean,
      lastSavedAt: nowIso,
      lastSavedByName: access.userName,
    },
  };
}