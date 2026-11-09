"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAccountAccess } from "@/lib/applications/service";
import { AUTH_ERROR_MESSAGES, mapAuthError } from "@/lib/auth/error-handler";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/auth";

export type LoginState = { error: string | null; email: string };

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", email };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { error: mapAuthError(error), email };
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
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
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
