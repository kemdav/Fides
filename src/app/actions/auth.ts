"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminSession, clearAdminSession } from "@/lib/admin/session";
import { verifyAdminCredentials } from "@/lib/admin/local-accounts";
import { getAccountAccess } from "@/lib/applications/service";
import { AUTH_ERROR_MESSAGES, mapAuthError } from "@/lib/auth/error-handler";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginFieldErrors, loginSchema, safeRedirect, type LoginFieldErrors } from "@/lib/validations/auth";

export type LoginState = { error: string | null; email: string; fieldErrors?: LoginFieldErrors };

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");

  // Local admin accounts (see lib/admin/local-accounts.ts) bypass Supabase and go to the Admin page.
  const adminAccount = verifyAdminCredentials(email, String(formData.get("password") ?? ""));
  if (adminAccount) {
    await createAdminSession(adminAccount);
    revalidatePath("/", "layout");
    redirect("/admin");
  }

  const parsed = loginSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields and try again.", email, fieldErrors: loginFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { error: mapAuthError(error), email };
  }

  // Only business owners may enter through this surface (not staff, receptionists or admins).
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profile && profile.role !== "owner") {
    await supabase.auth.signOut();
    return { error: AUTH_ERROR_MESSAGES.NOT_OWNER, email };
  }

  const access = await getAccountAccess(data.user.id);
  if (!access.ok) {
    await supabase.auth.signOut();
    const message = {
      none: AUTH_ERROR_MESSAGES.NO_ACCOUNT,
      pending: AUTH_ERROR_MESSAGES.PENDING,
      rejected: AUTH_ERROR_MESSAGES.REJECTED,
      suspended: AUTH_ERROR_MESSAGES.SUSPENDED,
    }[access.reason];
    return { error: message, email };
  }

  revalidatePath("/", "layout");
  redirect(safeRedirect(formData.get("redirect")));
}

export async function logout(): Promise<void> {
  await clearAdminSession();
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function updatePassword(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const fail = (message: string): never => redirect(`/reset-password?error=${encodeURIComponent(message)}`);

  if (password.length < 8) fail("Password must be at least 8 characters.");
  if (password !== confirmPassword) fail("Passwords do not match.");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) fail(mapAuthError(error));

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
