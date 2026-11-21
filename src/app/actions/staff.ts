"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const staffProfileSchema = z.object({
  tenantId: z.uuid(),
  staffId: z.uuid(),
  fullName: z.string().trim().min(1).max(150),
  title: z.string().trim().max(150),
  phone: z.string().trim().regex(/^(?:[+0-9][0-9 ()-]{5,23})?$/),
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
    p_phone: input.phone || null,
    p_bio: input.bio,
    p_role: input.role,
    p_service_ids: input.serviceIds,
    p_commission_type: input.commissionType,
    p_commission_value: input.commissionValue,
    p_image_url: imagePath ? bucket.getPublicUrl(imagePath).data.publicUrl : null,
  });
  if (error) {
    if (imagePath) await bucket.remove([imagePath]);
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, id: input.staffId };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StaffActionResult {
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

    const { data, error } = await supabase
      .from("staff_members")
      .update(updates)
      .eq("id", input.staffId)
      .eq("tenant_id", input.tenantId)
      .select("id")
      .maybeSingle();

    if (error) {
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

    const { error } = await supabase
      .from("staff_members")
      .delete()
      .eq("id", params.staffId)
      .eq("tenant_id", params.tenantId);

    if (error) {
      console.error("[deleteStaffMemberAction]", error);
      return { success: false, error: error.message };
    }

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
