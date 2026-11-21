"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { canDeliverVerificationLinks, sendMail } from "@/lib/mail/mailer";
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

const staffEmailChangeSchema = z.object({
  tenantId: z.uuid(),
  staffId: z.uuid(),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
});

export async function requestStaffEmailChangeAction(input: z.input<typeof staffEmailChangeSchema>): Promise<StaffActionResult> {
  const parsed = staffEmailChangeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Enter a valid new email address." };
  const { tenantId, staffId, email } = parsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Sign in to request an email change." };

  const { data: membership } = await supabase.from("tenant_memberships").select("role")
    .eq("tenant_id", tenantId).eq("profile_id", user.id).maybeSingle();
  if (membership?.role !== "owner" && membership?.role !== "admin") {
    return { success: false, error: "You do not have permission to manage staff." };
  }

  const admin = getAdminClient();
  if (!admin || !canDeliverVerificationLinks()) {
    return { success: false, error: "Verification email delivery is unavailable." };
  }

  try {
    const { data: staff } = await admin.from("staff_members").select("profile_id")
      .eq("tenant_id", tenantId).eq("id", staffId).maybeSingle();
    if (!staff?.profile_id) return { success: false, error: "This staff member has no linked sign-in account." };
    const { data: targetMembership } = await admin.from("tenant_memberships").select("profile_id")
      .eq("tenant_id", tenantId).eq("profile_id", staff.profile_id).maybeSingle();
    if (!targetMembership) return { success: false, error: "This staff member has no linked sign-in account." };

    const { data: { user: account } } = await admin.auth.admin.getUserById(staff.profile_id);
    const currentEmail = account?.email;
    if (!currentEmail || !account.email_confirmed_at) {
      return { success: false, error: "The current sign-in email must be verified first." };
    }
    if (currentEmail.toLowerCase() === email) {
      return { success: false, error: "Enter an address different from the current email." };
    }
    const settings = await fetch(`${publicEnv.supabaseUrl.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: { apikey: publicEnv.supabaseKey },
      cache: "no-store",
    });
    if (!settings.ok || (await settings.json()).mailer_autoconfirm !== false) {
      return { success: false, error: "Secure email confirmation is unavailable." };
    }

    const reservation = await admin.rpc("reserve_staff_email_change", { p_profile_id: account.id });
    if (reservation.error) return { success: false, error: "Secure email confirmation is unavailable." };
    if (!reservation.data) return { success: false, error: "Wait two minutes before requesting another email change." };

    const options = { redirectTo: new URL("/login", publicEnv.siteUrl).toString() };
    const current = await admin.auth.admin.generateLink({ type: "email_change_current", email: currentEmail, newEmail: email, options });
    if (current.error) {
      return { success: false, error: current.error.code === "email_exists"
        ? "That email address is already in use." : "Could not start a secure email change." };
    }
    const next = await admin.auth.admin.generateLink({ type: "email_change_new", email: currentEmail, newEmail: email, options });
    if (next.error) return { success: false, error: "Could not generate the new email verification link." };

    await sendMail({
      to: currentEmail,
      subject: "Approve your Fides email change",
      text: `An email change to ${email} was requested for your Fides account. If you approve, open this link:\n\n${current.data.properties.action_link}\n\nIf you did not expect this request, ignore this email.`,
    });
    await sendMail({
      to: email,
      subject: "Verify your new Fides email address",
      text: `Verify this address for your Fides account:\n\n${next.data.properties.action_link}\n\nThe current address must also approve the change before the new address becomes active.`,
    });
    return { success: true };
  } catch {
    return { success: false, error: "Verification emails could not be sent. Please try again later." };
  }
}

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
