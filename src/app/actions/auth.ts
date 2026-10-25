"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import { mapAuthError, AUTH_ERROR_MESSAGES } from "@/lib/auth/error-handler";

/**
 * Server Action: Sign in with email and password.
 *
 * Catches and securely maps:
 * - Invalid credentials (`invalid_grant` / `invalid_credentials`) -> "Invalid email or password."
 * - Unverified email (`email_not_confirmed`) -> "Please check your inbox to verify your email address before signing in."
 * - Rate limiting (HTTP 429) -> "Too many login attempts. Please wait a few minutes before trying again."
 * - Suspended tenant -> "This business account is temporarily suspended. Please contact platform support."
 */
export async function login(formData: FormData): Promise<void> {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");
  const redirectTarget = formData.get("redirect")?.toString();

  // Validate form fields via Zod
  const validation = loginSchema.safeParse({
    email: rawEmail,
    password: rawPassword,
  });

  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message || "Invalid input.";
    redirect(`/login?error=${encodeURIComponent(firstError)}`);
  }

  const { email, password } = validation.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const userMessage = mapAuthError(error);
    redirect(`/login?error=${encodeURIComponent(userMessage)}`);
  }

  // Double-check email verification state:
  // If user has not confirmed their email, do not allow entry
  if (data?.user && !data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    redirect(
      `/login?error=${encodeURIComponent(
        AUTH_ERROR_MESSAGES.UNVERIFIED_EMAIL
      )}`
    );
  }

  // Intercept logins belonging to a suspended tenant
  if (data?.user) {
    const admin = getAdminClient();
    const db = admin ?? supabase;

    const { data: profile } = await db
      .from("profiles")
      .select("id, role, tenant_id")
      .eq("id", data.user.id)
      .single();

    if (profile && profile.role !== "admin") {
      // Find all associated tenant IDs
      const { data: memberships } = await db
        .from("tenant_memberships")
        .select("tenant_id")
        .eq("profile_id", data.user.id);

      const allTenantIds = Array.from(
        new Set([profile.tenant_id, ...(memberships?.map((m) => m.tenant_id) || [])].filter(Boolean))
      ) as string[];

      if (allTenantIds.length > 0) {
        const { data: userTenants } = await db
          .from("tenants")
          .select("id, status")
          .in("id", allTenantIds);

        const allSuspended =
          userTenants &&
          userTenants.length > 0 &&
          userTenants.every((t) => t.status === "suspended");

        if (allSuspended) {
          await supabase.auth.signOut();
          redirect(
            `/login?error=${encodeURIComponent(
              AUTH_ERROR_MESSAGES.SUSPENDED_BUSINESS
            )}`
          );
        }
      }
    }
  }

  revalidatePath("/", "layout");
  const destination =
    redirectTarget && redirectTarget.startsWith("/")
      ? redirectTarget
      : "/dashboard";
  redirect(destination);
}

/**
 * Server Action: Register a new user account.
 *
 * Enforces email confirmation: newly registered users must confirm their email
 * address before they are allowed into the dashboard.
 */
export async function signup(formData: FormData): Promise<void> {
  const rawFullName = formData.get("fullName");
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");
  const rawConfirmPassword = formData.get("confirmPassword");

  const validation = signupSchema.safeParse({
    fullName: rawFullName,
    email: rawEmail,
    password: rawPassword,
    confirmPassword: rawConfirmPassword,
  });

  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message || "Invalid input.";
    redirect(`/login?tab=signup&error=${encodeURIComponent(firstError)}`);
  }

  const { email, password, fullName } = validation.data;
  const headerStore = await headers();
  const origin = headerStore.get("origin") || "";
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || "" },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    const userMessage = mapAuthError(error);
    redirect(`/login?tab=signup&error=${encodeURIComponent(userMessage)}`);
  }

  // Supabase anti-enumeration check: existing accounts return an empty identities array
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    redirect(
      `/login?error=${encodeURIComponent(
        AUTH_ERROR_MESSAGES.DUPLICATE_REGISTRATION
      )}`
    );
  }

  // Enforce Email Verification:
  // If a session was automatically issued by dev/auto-confirm settings, revoke it immediately
  // so the user is required to confirm their email before accessing the dashboard.
  if (data?.session) {
    await supabase.auth.signOut();
  }

  // Redirect to login screen with email verification prompt
  redirect(
    `/login?message=${encodeURIComponent(
      AUTH_ERROR_MESSAGES.UNVERIFIED_EMAIL
    )}`
  );
}

/**
 * Server Action: Request password reset link.
 */
export async function requestPasswordReset(formData: FormData): Promise<void> {
  const rawEmail = formData.get("email");
  const validation = forgotPasswordSchema.safeParse({ email: rawEmail });

  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message || "Invalid email address.";
    redirect(`/login?tab=forgot&error=${encodeURIComponent(firstError)}`);
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin") || "";
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(
    validation.data.email,
    { redirectTo: `${origin}/auth/callback?type=recovery` }
  );

  if (error) {
    const userMessage = mapAuthError(error);
    redirect(`/login?tab=forgot&error=${encodeURIComponent(userMessage)}`);
  }

  redirect(
    `/login?message=${encodeURIComponent(
      "If an account exists with this email, a password reset link has been sent to your inbox."
    )}`
  );
}

/**
 * Server Action: Update password.
 */
export async function updatePassword(formData: FormData): Promise<void> {
  const rawPassword = formData.get("password");
  const rawConfirmPassword = formData.get("confirmPassword");

  const validation = resetPasswordSchema.safeParse({
    password: rawPassword,
    confirmPassword: rawConfirmPassword,
  });

  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message || "Invalid password.";
    redirect(`/reset-password?error=${encodeURIComponent(firstError)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: validation.data.password,
  });

  if (error) {
    const userMessage = mapAuthError(error);
    redirect(`/reset-password?error=${encodeURIComponent(userMessage)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard?toast=password_updated&toast_message=Password+updated+successfully.");
}

/**
 * Server Action: Log out the active user and clear session cookies.
 */
export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
