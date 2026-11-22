"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { publicEnv } from "@/lib/env";
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

export async function sendStaffInvitationAction(input: z.input<typeof inviteSchema>) {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a full name and valid email address." };
  const fields = parsed.data;
  const amount = fields.commission === "none" ? 0 : Number(fields.commissionValue);
  const limit = fields.commission === "percentage" ? 100 : 9999999999.99;
  if (fields.commission !== "none" && (!/^\d+(?:\.\d{1,2})?$/.test(fields.commissionValue) || amount <= 0 || amount > limit)) {
    return { error: "Enter a valid commission value." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to invite staff." };
  const admin = getAdminClient();
  if (!admin || !isSmtpMailConfigured()) return { error: "SMTP email delivery is unavailable." };

  const { data: tenant } = await supabase.from("tenants").select("name, slug").eq("id", fields.tenantId).maybeSingle();
  if (!tenant) return { error: "This workspace is unavailable." };

  const token = randomBytes(32).toString("base64url");
  const url = new URL("/staff-access", publicEnv.siteUrl);
  url.searchParams.set("invite", token);
  const signInUrl = new URL("/staff-access", publicEnv.siteUrl);
  signInUrl.searchParams.set("workspace", tenant.slug);
  const { data: invitationId, error } = await admin.rpc("reserve_staff_invitation", {
    p_actor_id: user.id,
    p_tenant_id: fields.tenantId,
    p_full_name: fields.name,
    p_email: fields.email,
    p_role: fields.role,
    p_title: fields.title,
    p_service_ids: [...new Set(fields.serviceIds)],
    p_commission_type: fields.commission === "percentage" ? "percentage" : "fixed",
    p_commission_value: amount,
    p_token_hash: hashStaffInvitation(token),
  });
  if (error) return { error: error.code === "P0001" ? error.message : "The invitation could not be created." };

  try {
    await sendSmtpMail({
      to: fields.email,
      subject: "Your Fides staff invitation",
      text: `Hi ${fields.name},\n\nYou’ve been invited to join ${tenant.name} on Fides. Accept your invitation within 7 days:\n\n${url}\n\nAfter accepting, use this page to sign in:\n${signInUrl}\n\nIf you weren’t expecting this invitation, you can ignore this email.`,
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

export async function accessStaffWorkspaceAction(form: FormData): Promise<{ error: string }> {
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
    if (!invitation) return { error: "This invitation has expired or has already been used." };
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
