"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

    const { error } = await supabase
      .from("staff_members")
      .update(updates)
      .eq("id", input.staffId)
      .eq("tenant_id", input.tenantId);

    if (error) {
      console.error("[updateStaffMemberAction]", error);
      return { success: false, error: error.message };
    }

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
