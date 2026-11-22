"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getStaffProfile, isLastActiveStaffOwner } from "@/lib/merchant/staff-profile";
import { z } from "zod";

const staffEditorKey = z.object({ tenantId: z.uuid(), staffId: z.uuid() });

export async function loadStaffEditorAction(tenantId: string, staffId: string) {
  if (!staffEditorKey.safeParse({ tenantId, staffId }).success) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: membership }, { data: tenant }] = await Promise.all([
    supabase.from("tenant_memberships").select("role")
      .eq("tenant_id", tenantId).eq("profile_id", user.id).maybeSingle(),
    supabase.from("tenants").select("timezone").eq("id", tenantId).maybeSingle(),
  ]);
  if (!tenant || (membership?.role !== "owner" && membership?.role !== "admin")) return null;

  const profile = await getStaffProfile(tenantId, staffId, tenant.timezone, user.id);
  return profile?.managedStaff ?? null;
}

const staffProfileSchema = z.object({
  tenantId: z.uuid(),
  staffId: z.uuid(),
  fullName: z.string().trim().min(1).max(150),
  title: z.string().trim().max(150),
  phone: z.string().regex(/^(?:[0-9]{6,11})?$/).optional(),
  bio: z.string().trim().max(2000),
  role: z.enum(["owner", "admin", "staff", "receptionist"]),
  serviceIds: z.array(z.uuid()),
  commissionType: z.enum(["fixed", "percentage"]),
  commissionValue: z.coerce.number().finite().min(0).max(9999999999.99),
});

export async function saveStaffProfileAction(form: FormData): Promise<StaffActionResult> {
  const parsed = staffProfileSchema.safeParse({ ...Object.fromEntries(form), serviceIds: form.getAll("serviceIds") });
  if (!parsed.success) return { success: false, error: "Check the profile fields and try again." };
  const input = parsed.data;
  if (input.commissionType === "percentage" && input.commissionValue > 100) {
    return { success: false, error: "Percentage commission must be between 0 and 100." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Sign in to manage staff." };
  const { data: membership } = await supabase.from("tenant_memberships").select("role")
    .eq("tenant_id", input.tenantId).eq("profile_id", user.id).maybeSingle();
  if (membership?.role !== "owner" && membership?.role !== "admin") {
    return { success: false, error: "You do not have permission to manage staff." };
  }
  const admin = getAdminClient();
  if (!admin) return { success: false, error: "Staff management is unavailable." };

  let phone = input.phone || null;
  if (input.phone === undefined) {
    const { data, error } = await admin.from("staff_members").select("phone")
      .eq("id", input.staffId).eq("tenant_id", input.tenantId).maybeSingle();
    if (error || !data) return { success: false, error: "Could not load the existing staff phone number." };
    phone = data.phone;
  }

  const bucket = admin.storage.from("tenant-assets");
  const image = form.get("image");
  let imagePath: string | null = null;
  if (image instanceof File && image.size > 0) {
    const extensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
    const extension = extensions[image.type];
    if (!extension || image.size > 750 * 1024) {
      return { success: false, error: "Select a JPG, PNG, or WebP image up to 750 KB." };
    }
    imagePath = `${input.tenantId}/staff/${input.staffId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await bucket.upload(imagePath, image, { contentType: image.type });
    if (error) return { success: false, error: "The profile image could not be uploaded." };
  }

  const { error } = await admin.rpc("manage_staff_profile", {
    p_actor_id: user.id,
    p_tenant_id: input.tenantId,
    p_staff_id: input.staffId,
    p_full_name: input.fullName,
    p_title: input.title,
    p_phone: phone,
    p_bio: input.bio,
    p_role: input.role,
    p_service_ids: input.serviceIds,
    p_commission_type: input.commissionType,
    p_commission_value: input.commissionValue,
    p_image_url: imagePath ? bucket.getPublicUrl(imagePath).data.publicUrl : null,
  });
  if (error) {
    if (imagePath) await bucket.remove([imagePath]);
    if (error.code === "PGRST202" || error.code === "42703") {
      return { success: false, error: "Saving this profile requires the latest staff management database migration." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, id: input.staffId };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StaffActionResult {
  lastOwnerProtected?: boolean;
  success: boolean;
  error?: string;
  id?: string;
}

interface AddStaffInput {
  tenantId: string;
  fullName: string;
  title?: string;
  bio?: string;
  commissionType?: "fixed" | "percentage";
  commissionValue?: number;
}

interface UpdateStaffInput {
  staffId: string;
  tenantId: string;
  fullName?: string;
  title?: string;
  bio?: string;
  active?: boolean;
  commissionType?: "fixed" | "percentage";
  commissionValue?: number;
}

// ─── Add staff member ─────────────────────────────────────────────────────────

export async function addStaffMemberAction(
  input: AddStaffInput
): Promise<StaffActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data, error } = await supabase
      .from("staff_members")
      .insert({
        tenant_id: input.tenantId,
        full_name: input.fullName.trim(),
        title: input.title?.trim() || null,
        bio: input.bio?.trim() || null,
        commission_type: input.commissionType ?? "fixed",
        commission_value: input.commissionValue ?? 0,
        active: true,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[addStaffMemberAction]", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true, id: data.id };
  } catch (err) {
    console.error("[addStaffMemberAction]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error.",
    };
  }
}

// ─── Update staff member ──────────────────────────────────────────────────────

export async function updateStaffMemberAction(
  input: UpdateStaffInput
): Promise<StaffActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const updates: {
      full_name?: string;
      title?: string | null;
      bio?: string | null;
      active?: boolean;
      commission_type?: "fixed" | "percentage";
      commission_value?: number;
    } = {};
    if (input.fullName !== undefined) updates.full_name = input.fullName.trim();
    if (input.title !== undefined) updates.title = input.title.trim() || null;
    if (input.bio !== undefined) updates.bio = input.bio.trim() || null;
    if (input.active !== undefined) updates.active = input.active;
    if (input.commissionType !== undefined) updates.commission_type = input.commissionType;
    if (input.commissionValue !== undefined) updates.commission_value = input.commissionValue;

    const hasUpdates = Object.keys(updates).length > 0;
    if (!hasUpdates) {
      return { success: false, error: "Nothing to update." };
    }

    if (input.active === false) {
      const { data: membership } = await supabase.from("tenant_memberships").select("role")
        .eq("tenant_id", input.tenantId).eq("profile_id", user.id).maybeSingle();
      const admin = getAdminClient();
      if (!admin || (membership?.role !== "owner" && membership?.role !== "admin")) {
        return { success: false, error: "Staff status could not be changed." };
      }
      if (await isLastActiveStaffOwner(admin, input.tenantId, input.staffId)) {
        return { success: false, lastOwnerProtected: true };
      }
    }

    const { data, error } = await supabase
      .from("staff_members")
      .update(updates)
      .eq("id", input.staffId)
      .eq("tenant_id", input.tenantId)
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "P0001" && error.message === "LAST_ACTIVE_STAFF_OWNER") {
        return { success: false, lastOwnerProtected: true };
      }
      console.error("[updateStaffMemberAction]", error);
      return { success: false, error: error.message };
    }

    if (!data) return { success: false, error: "Staff member could not be updated." };

    revalidatePath("/", "layout");
    return { success: true, id: input.staffId };
  } catch (err) {
    console.error("[updateStaffMemberAction]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error.",
    };
  }
}

// ─── Toggle active / deactivate ───────────────────────────────────────────────

export async function toggleStaffActiveAction(params: {
  staffId: string;
  tenantId: string;
  active: boolean;
}): Promise<StaffActionResult> {
  return updateStaffMemberAction({
    staffId: params.staffId,
    tenantId: params.tenantId,
    active: params.active,
  });
}

// ─── Delete staff member ──────────────────────────────────────────────────────

export async function deleteStaffMemberAction(params: {
  staffId: string;
  tenantId: string;
}): Promise<StaffActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data, error } = await supabase
      .from("staff_members")
      .delete()
      .eq("id", params.staffId)
      .eq("tenant_id", params.tenantId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[deleteStaffMemberAction]", error);
      return { success: false, error: error.message };
    }

    if (!data) return { success: false, error: "Staff member could not be removed." };

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("[deleteStaffMemberAction]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error.",
    };
  }
}
