"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { limitByClient, MINUTES } from "@/lib/rate-limit";
import { publicEnv } from "@/lib/env";
import { staffInvitationMessage } from "@/lib/mail/emails";
import { isSmtpMailConfigured, sendSmtpMail } from "@/lib/mail/mailer";
import { getStaffInvitation, hashStaffInvitation } from "@/lib/merchant/staff-invitations";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());
const inviteSchema = z.object({
  tenantId: z.uuid(),
  name: z.string().trim().min(1).max(150),
  email: emailSchema,
  title: z.string().trim().max(150),
  role: z.enum(["staff", "receptionist", "admin"]),
  serviceIds: z.array(z.uuid()),
  commission: z.enum(["none", "fixed", "percentage"]),
  commissionValue: z.string(),
});

const emailTenantColumns = "name, slug, brand_color, secondary_color, accent_color, tenant_settings(typography)";

function invitationEmail(tenant: {
  slug: string; name: string; brand_color: string | null; secondary_color: string | null; accent_color: string | null;
  tenant_settings: { typography: string } | null;
}, name: string, token: string) {
  const invitationUrl = new URL("/staff-access", publicEnv.siteUrl);
  invitationUrl.searchParams.set("invite", token);
  const signInUrl = new URL("/staff-access", publicEnv.siteUrl);
  signInUrl.searchParams.set("workspace", tenant.slug);
  return staffInvitationMessage({
    name, merchant: tenant.name, invitationUrl, signInUrl,
    typography: tenant.tenant_settings?.typography,
    colors: { brand: tenant.brand_color, secondary: tenant.secondary_color, accent: tenant.accent_color },
  });
}

export async function sendStaffInvitationAction(input: z.input<typeof inviteSchema>) {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a full name and valid email address." };
  const fields = parsed.data;
  const commission = fields.role === "receptionist" ? "none" : fields.commission;
  const amount = commission === "none" ? 0 : Number(fields.commissionValue);
  const limit = commission === "percentage" ? 100 : 9999999999.99;
  if (commission !== "none" && (!/^\d+(?:\.\d{1,2})?$/.test(fields.commissionValue) || amount <= 0 || amount > limit)) {
    return { error: "Enter a valid commission value." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to invite staff." };
  const admin = getAdminClient();
  if (!admin || !isSmtpMailConfigured()) return { error: "SMTP email delivery is unavailable." };

  const { data: tenant } = await supabase.from("tenants")
    .select(emailTenantColumns).eq("id", fields.tenantId).maybeSingle();
  if (!tenant) return { error: "This workspace is unavailable." };

  const token = randomBytes(32).toString("base64url");
  const message = invitationEmail(tenant, fields.name, token);
  const { data: invitationId, error } = await admin.rpc("reserve_staff_invitation", {
    p_actor_id: user.id,
    p_tenant_id: fields.tenantId,
    p_full_name: fields.name,
    p_email: fields.email,
    p_role: fields.role,
    p_title: fields.title,
    p_service_ids: fields.role === "receptionist" ? [] : [...new Set(fields.serviceIds)],
    p_commission_type: commission === "percentage" ? "percentage" : "fixed",
    p_commission_value: amount,
    p_token_hash: hashStaffInvitation(token),
  });
  if (error) return { error: error.code === "P0001" ? error.message : "The invitation could not be created." };

  try {
    await sendSmtpMail({
      to: fields.email,
      ...message,
    });
  } catch {
    const result = await admin.from("staff_invitations").update({ cancelled_at: new Date().toISOString(), token_hash: null })
      .eq("id", invitationId).eq("tenant_id", fields.tenantId).is("accepted_at", null);
    if (result.error) console.error("Failed to release staff invitation after SMTP error", result.error.code);
    revalidatePath(`/${tenant.slug}/dashboard/staff`);
    return { error: "The invitation email could not be sent. Check the SMTP settings and try again." };
  }

  revalidatePath(`/${tenant.slug}/dashboard/staff`);
  return { error: null };
}

async function getInvitationManager(tenantId: string, invitationId: string) {
  if (!z.uuid().safeParse(tenantId).success || !z.uuid().safeParse(invitationId).success) {
    return { error: "This invitation could not be found." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to manage staff invitations." };
  const admin = getAdminClient();
  if (!admin) return { error: "Invitations are currently unavailable." };

  const { data: membership } = await supabase.from("tenant_memberships").select(`role, tenants(${emailTenantColumns})`)
    .eq("tenant_id", tenantId).eq("profile_id", user.id).maybeSingle();
  if (!membership?.tenants || (membership.role !== "owner" && membership.role !== "admin")) {
    return { error: "You do not have permission to manage invitations." };
  }
  return { admin, tenant: membership.tenants };
}

export async function cancelStaffInvitationAction(tenantId: string, invitationId: string) {
  const manager = await getInvitationManager(tenantId, invitationId);
  if (!manager.admin) return { error: manager.error };
  const { admin, tenant } = manager;
  const now = new Date().toISOString();
  const { data, error } = await admin.from("staff_invitations")
    .update({ cancelled_at: now, token_hash: null })
    .eq("tenant_id", tenantId).eq("id", invitationId)
    .is("cancelled_at", null).is("accepted_at", null).gt("expires_at", now)
    .select("id").maybeSingle();
  if (error) return { error: "The invitation could not be cancelled." };
  if (!data) return { error: "This invitation is no longer pending." };
  revalidatePath(`/${tenant.slug}/dashboard/staff`);
  return { error: null };
}

export async function removeStaffInvitationAction(tenantId: string, invitationId: string) {
  const manager = await getInvitationManager(tenantId, invitationId);
  if (!manager.admin) return { error: manager.error };
  const { admin, tenant } = manager;
  const { data, error } = await admin.from("staff_invitations").delete()
    .eq("tenant_id", tenantId).eq("id", invitationId)
    .is("accepted_at", null).or(`cancelled_at.not.is.null,expires_at.lte.${new Date().toISOString()}`)
    .select("id").maybeSingle();
  if (error) return { error: "The invitation could not be removed." };
  if (!data) return { error: "Only expired or cancelled invitations can be removed." };
  revalidatePath(`/${tenant.slug}/dashboard/staff`);
  return { error: null };
}

export async function resendStaffInvitationAction(tenantId: string, invitationId: string) {
  const manager = await getInvitationManager(tenantId, invitationId);
  if (!manager.admin) return { error: manager.error };
  if (!isSmtpMailConfigured()) return { error: "SMTP email delivery is unavailable." };

  const { admin, tenant } = manager;
  const { data: invitation, error: readError } = await admin.from("staff_invitations")
    .select("email, full_name, token_hash, expires_at, last_resent_at")
    .eq("tenant_id", tenantId).eq("id", invitationId)
    .is("cancelled_at", null).is("accepted_at", null).maybeSingle();
  if (readError) return { error: "The invitation could not be loaded." };
  if (!invitation) return { error: "Only pending or expired invitations can be resent." };

  const token = randomBytes(32).toString("base64url");
  const hash = hashStaffInvitation(token);
  const message = invitationEmail(tenant, invitation.full_name, token);
  const { data, error } = await admin.rpc("renew_staff_invitation", {
    p_tenant_id: tenantId, p_invitation_id: invitationId, p_expected_expiry: invitation.expires_at, p_token_hash: hash,
  });
  if (error) return { error: error.code === "P0001" ? error.message : "The invitation could not be renewed." };
  if (!data) return { error: "The invitation changed or was recently resent. Refresh the roster or try again in two minutes." };

  try {
    await sendSmtpMail({ to: invitation.email, ...message });
  } catch {
    const restore = await admin.from("staff_invitations").update({
      token_hash: invitation.token_hash, expires_at: invitation.expires_at, last_resent_at: invitation.last_resent_at,
    }).eq("tenant_id", tenantId).eq("id", invitationId).eq("token_hash", hash)
      .is("accepted_at", null).is("cancelled_at", null);
    if (restore.error) console.error("Failed to restore staff invitation after SMTP error", restore.error.code);
    return { error: restore.error ? "Email could not be resent, and the previous link could not be restored."
      : "The invitation email could not be resent. Try again." };
  }
  revalidatePath(`/${tenant.slug}/dashboard/staff`);
  return { error: null };
}

export async function accessStaffWorkspaceAction(form: FormData): Promise<{ error: string }> {
  if (await limitByClient("staff-workspace-access", { limit: 20, windowMs: 15 * MINUTES })) {
    return { error: "Too many attempts. Please try again later." };
  }
  const token = String(form.get("invite") ?? "");
  const password = String(form.get("password") ?? "");
  const createAccount = form.get("intent") === "create";
  const admin = getAdminClient();
  if (!admin) return { error: "Staff access is unavailable." };

  let invitation: Awaited<ReturnType<typeof getStaffInvitation>> = null;
  if (token) {
    try {
      invitation = await getStaffInvitation(token);
    } catch {
      return { error: "The invitation could not be checked. Try again." };
    }
    if (!invitation) return { error: "This invitation has expired, was cancelled, or has already been used." };
  }

  const email = emailSchema.safeParse(invitation?.email ?? form.get("email"));
  const workspace = invitation?.tenants.slug ?? String(form.get("workspace") ?? "");
  if (!email.success || !/^[a-z0-9-]{1,80}$/.test(workspace) || !password || Buffer.byteLength(password, "utf8") > 72) {
    return { error: "Check your email and password." };
  }

  if (createAccount) {
    if (!invitation) return { error: "An invitation is required to create a staff account." };
    if (password.length < 8) return { error: "Choose a password with at least 8 characters." };
    if (password !== form.get("confirmPassword")) return { error: "The passwords do not match." };
    const { error } = await admin.auth.admin.createUser({
      email: email.data, password, email_confirm: true,
      app_metadata: { role: "staff" }, user_metadata: { full_name: invitation.full_name },
    });
    if (error) return { error: error.code === "email_exists" || error.code === "user_already_exists"
      ? "An account already exists for this email. Choose Sign in and accept."
      : "The account could not be created. Try another password or sign in if you already have an account." };
  }

  const supabase = await createClient();
  const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (signInError || !user) return { error: "Could not sign in with these credentials." };

  if (invitation) {
    const result = await admin.rpc("accept_staff_invitation", { p_token_hash: hashStaffInvitation(token), p_profile_id: user.id });
    if (result.error) {
      await supabase.auth.signOut({ scope: "local" });
      return { error: result.error.code === "P0001" ? result.error.message : "The invitation could not be accepted. Try again." };
    }
    revalidatePath(`/${workspace}/dashboard/staff`);
  } else {
    const tenant = await admin.from("tenants").select("id").eq("slug", workspace).eq("status", "active").maybeSingle();
    const staff = tenant.data && await admin.from("staff_members").select("id")
      .eq("tenant_id", tenant.data.id).eq("profile_id", user.id).eq("active", true).maybeSingle();
    const membership = tenant.data && await admin.from("tenant_memberships").select("profile_id")
      .eq("tenant_id", tenant.data.id).eq("profile_id", user.id).maybeSingle();
    if (!staff?.data || !membership?.data) {
      await supabase.auth.signOut({ scope: "local" });
      return { error: "This account does not have active staff access to this workspace." };
    }
  }

  redirect(`/${workspace}/dashboard`);
}
