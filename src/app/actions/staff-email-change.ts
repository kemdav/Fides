"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient as createAuthClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { publicEnv } from "@/lib/env";
import { canDeliverVerificationLinks, isSmtpMailConfigured, sendMail, sendSmtpMail } from "@/lib/mail/mailer";
import { canVerifyStaffEmail, getPendingStaffEmailChange, hashStaffEmailProof, STAFF_EMAIL_CHANGE_COMPLETE_PATH, STAFF_EMAIL_CHANGE_RECEIPT, STAFF_EMAIL_LINK_MINUTES } from "@/lib/merchant/staff-email-change";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  tenantId: z.uuid(),
  staffId: z.uuid(),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
});

export async function requestStaffEmailChangeAction(input: z.input<typeof requestSchema>): Promise<
  { success: true } | { success: false; error: string }
> {
  const parsed = requestSchema.safeParse(input);
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
  const useSmtp = isSmtpMailConfigured();
  if (!admin || (!useSmtp && !canDeliverVerificationLinks())) {
    return { success: false, error: "Verification email delivery is unavailable." };
  }

  const { data: staff } = await admin.from("staff_members").select("profile_id")
    .eq("tenant_id", tenantId).eq("id", staffId).maybeSingle();
  if (!staff?.profile_id) return { success: false, error: "This staff member has no linked sign-in account." };
  const { data: targetMembership } = await admin.from("tenant_memberships").select("profile_id")
    .eq("tenant_id", tenantId).eq("profile_id", staff.profile_id).maybeSingle();
  if (!targetMembership) return { success: false, error: "This staff member has no linked sign-in account." };

  const { data: { user: account } } = await admin.auth.admin.getUserById(staff.profile_id);
  const currentEmail = account?.email;
  if (!currentEmail || !account.email_confirmed_at) return { success: false, error: "The current sign-in email must be verified first." };
  if (currentEmail.toLowerCase() === email) return { success: false, error: "Enter an address different from the current email." };

  const token = randomBytes(32).toString("base64url");
  const link = new URL("/staff-email-change", publicEnv.siteUrl);
  link.searchParams.set("token", token);

  const reservation = await admin.rpc("reserve_staff_email_change", { p_profile_id: account.id });
  if (reservation.error) return { success: false, error: "The verification request could not be started." };
  if (!reservation.data) return { success: false, error: "Wait two minutes before requesting another email change." };

  const now = new Date();
  const request = {
    profile_id: account.id, tenant_id: tenantId, current_email: currentEmail, new_email: email,
    token_hash: hashStaffEmailProof(token),
    expires_at: new Date(now.getTime() + STAFF_EMAIL_LINK_MINUTES * 60_000).toISOString(),
    claimed_at: null,
  };
  const replacement = await admin.from("staff_email_change_requests").update(request).eq("profile_id", account.id)
    .or(`claimed_at.is.null,expires_at.lte.${now.toISOString()}`).select("profile_id").maybeSingle();
  if (replacement.error) return { success: false, error: "The verification request could not be saved." };
  if (!replacement.data) {
    const { error } = await admin.from("staff_email_change_requests").insert(request);
    if (error) return { success: false, error: "An email change is already in progress. Please try again later." };
  }

  try {
    await (useSmtp ? sendSmtpMail : sendMail)({
      to: email,
      subject: "Verify your new Fides email address",
      text: `Open this link to verify your new address within ${STAFF_EMAIL_LINK_MINUTES} minutes:\n\n${link}\n\nEnter your current Fides password to verify your new address and open your workspace. If you did not expect this email, ignore it.`,
    });
  } catch {
    await admin.from("staff_email_change_requests").delete().eq("token_hash", request.token_hash).is("claimed_at", null);
    return { success: false, error: "The verification email could not be sent. Please try again later." };
  }
  return { success: true };
}

export async function verifyStaffEmailChangeAction(_state: { error: string | null }, form: FormData): Promise<{ error: string | null }> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (!password || password.length > 1024) return { error: "Enter your current Fides password." };

  const request = await getPendingStaffEmailChange(token);
  const admin = getAdminClient();
  if (!request || !admin) return { error: "This request is unavailable. Ask for a new verification link." };

  // Check the existing password without placing the old session in the browser.
  const auth = createAuthClient(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }).auth;
  const { data: { user } } = await auth.signInWithPassword({ email: request.current_email, password });
  if (user) await auth.signOut({ scope: "local" }).catch(() => null);
  if (!user || !canVerifyStaffEmail(user, request)) return { error: "The current password could not be verified." };

  const [factors, { data: membership }, { data: staff }] = await Promise.all([
    admin.auth.admin.mfa.listFactors({ userId: user.id }),
    admin.from("tenant_memberships").select("role").eq("tenant_id", request.tenant_id).eq("profile_id", user.id).maybeSingle(),
    admin.from("staff_members").select("id").eq("tenant_id", request.tenant_id).eq("profile_id", user.id).eq("active", true).maybeSingle(),
  ]);
  if (factors.error) return { error: "The current account could not be verified." };
  if (factors.data.factors.some((factor) => factor.status === "verified")) {
    return { error: "This account requires additional identity verification. Contact your workspace administrator." };
  }
  if (!membership || !staff) return { error: "This account does not have active access to the workspace." };

  const tokenHash = hashStaffEmailProof(token);
  const now = new Date().toISOString();
  const claim = await admin.from("staff_email_change_requests").update({ claimed_at: now })
    .eq("profile_id", user.id).eq("token_hash", tokenHash).is("claimed_at", null).gt("expires_at", now)
    .select("profile_id").maybeSingle();
  if (claim.error) return { error: "Verification is temporarily unavailable." };
  if (!claim.data) return { error: "This request is unavailable. Ask for a new verification link." };

  const result = await admin.auth.admin.updateUserById(user.id, { email: request.new_email, email_confirm: true });
  if (result.error) {
    await admin.from("staff_email_change_requests").update({ claimed_at: null }).eq("token_hash", tokenHash);
    return { error: result.error.code === "email_exists" || result.error.code === "user_already_exists"
      ? "That email is already in use." : "The email address could not be changed. Try again." };
  }
  await admin.from("staff_email_change_requests").delete().eq("token_hash", tokenHash);
  const dashboard = `/${request.tenants.slug}/dashboard`;
  revalidatePath(`${dashboard}/staff`);
  revalidatePath(`${dashboard}/staff/${staff.id}`);

  const supabase = await createClient();
  const signIn = await supabase.auth.signInWithPassword({ email: request.new_email, password }).catch(() => null);
  if (signIn?.data.user?.id === user.id) redirect(dashboard);
  if (signIn?.data.user) await supabase.auth.signOut({ scope: "local" }).catch(() => null);

  (await cookies()).set(STAFF_EMAIL_CHANGE_RECEIPT, `${membership.role === "owner" ? "owner" : "staff"}:${request.tenants.slug}`, {
    path: STAFF_EMAIL_CHANGE_COMPLETE_PATH,
    maxAge: 120,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  redirect(STAFF_EMAIL_CHANGE_COMPLETE_PATH);
}
