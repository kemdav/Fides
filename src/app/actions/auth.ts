"use server";

import type { AuthError, SupabaseClient, User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminSession, clearAdminSession } from "@/lib/admin/session";
import { verifyAdminCredentials } from "@/lib/admin/local-accounts";
import { getAccountAccess } from "@/lib/applications/service";
import { AUTH_ERROR_MESSAGES, mapAuthError } from "@/lib/auth/error-handler";
import { cloudPublicEnv, cloudSupabaseConfigured, publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createCloudClient } from "@/lib/supabase/cloud-server";
import { createAdminClient, getCloudAdminClient, type AdminClient } from "@/lib/supabase/admin";
import { getAccountSession } from "@/lib/supabase/account-session";
import type { Database } from "@/types/database.types";
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

  type LoginBackend = {
    name: "cloud" | "active";
    client: SupabaseClient<Database>;
    admin: AdminClient;
  };
  const backends: LoginBackend[] = [];
  const cloudAdmin = cloudSupabaseConfigured ? getCloudAdminClient() : null;
  if (cloudSupabaseConfigured && cloudAdmin) {
    backends.push({ name: "cloud", client: await createCloudClient(), admin: cloudAdmin });
  }
  if (!cloudSupabaseConfigured || cloudPublicEnv.supabaseUrl !== publicEnv.supabaseUrl) {
    backends.push({ name: "active" as const, client: await createClient(), admin: createAdminClient() });
  }

  let signedIn: LoginBackend | undefined;
  let user: User | null = null;
  let authError: AuthError | null = null;
  for (const backend of backends) {
    const result = await backend.client.auth.signInWithPassword(parsed.data);
    if (result.data.user && !result.error) {
      signedIn = backend;
      user = result.data.user;
      break;
    }
    authError = result.error;
  }
  if (!signedIn || !user) return { error: mapAuthError(authError), email };

  // Only business owners may enter through this surface (not staff, receptionists or admins).
  const { data: profile } = await signedIn.admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile && profile.role !== "owner") {
    await signedIn.client.auth.signOut();
    return { error: AUTH_ERROR_MESSAGES.NOT_OWNER, email };
  }

  const access = await getAccountAccess(user.id, signedIn.admin);
  if (!access.ok) {
    await signedIn.client.auth.signOut();
    const message = {
      none: AUTH_ERROR_MESSAGES.NO_ACCOUNT,
      pending: AUTH_ERROR_MESSAGES.PENDING,
      rejected: AUTH_ERROR_MESSAGES.REJECTED,
      suspended: AUTH_ERROR_MESSAGES.SUSPENDED,
    }[access.reason];
    return { error: message, email };
  }

  for (const backend of backends) {
    if (backend !== signedIn) await backend.client.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect(safeRedirect(formData.get("redirect")));
}

export async function logout(): Promise<void> {
  await clearAdminSession();
  const supabase = await createClient();
  await supabase.auth.signOut();
  if (cloudSupabaseConfigured && cloudPublicEnv.supabaseUrl !== publicEnv.supabaseUrl) {
    const cloud = await createCloudClient();
    await cloud.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function updatePassword(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const fail = (message: string): never => redirect(`/reset-password?error=${encodeURIComponent(message)}`);

  if (password.length < 8) fail("Password must be at least 8 characters.");
  if (password !== confirmPassword) fail("Passwords do not match.");

  const session = await getAccountSession();
  if (!session) return fail("Please log in again before changing your password.");
  const { error } = await session.client.auth.updateUser({ password });
  if (error) fail(mapAuthError(error));

  await session.client.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
