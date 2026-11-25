"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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
  const { data: profile } = await admin
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", data.user.id)
    .maybeSingle();
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

  const requestedRedirect = safeRedirect(formData.get("redirect"));
  let target = requestedRedirect;

  let tenantSlug: string | null = null;
  if (profile?.tenant_id) {
    const { data: tenant } = await createAdminClient()
      .from("tenants")
      .select("slug")
      .eq("id", profile.tenant_id)
      .maybeSingle();
    tenantSlug = tenant?.slug ?? null;
  }

  if (!tenantSlug && !requestedRedirect.match(/^\/[a-z0-9-]+\/dashboard(?:\/appointments)?$/)) {
    await supabase.auth.signOut();
    return { error: AUTH_ERROR_MESSAGES.NO_ACCOUNT, email };
  }

  if (tenantSlug) {
    const canonicalOverview = `/${tenantSlug}/dashboard`;
    const canonicalAppointments = `/${tenantSlug}/dashboard/appointments`;
    if (
      requestedRedirect === "/dashboard" ||
      requestedRedirect.startsWith("/dashboard/") ||
      requestedRedirect === "/tenant-dashboard" ||
      requestedRedirect === "/overview" ||
      requestedRedirect === "/appointments"
    ) {
      target = requestedRedirect.endsWith("/appointments") ||
        requestedRedirect === "/appointments"
        ? canonicalAppointments
        : canonicalOverview;
    } else if (
      requestedRedirect === canonicalOverview ||
      requestedRedirect === canonicalAppointments
    ) {
      target = requestedRedirect;
    } else if (requestedRedirect.match(/^\/[a-z0-9-]+\/dashboard(?:\/appointments)?$/)) {
      target = requestedRedirect.startsWith(`/${tenantSlug}/dashboard`)
        ? requestedRedirect
        : canonicalOverview;
    } else {
      target = canonicalOverview;
    }
  }

  revalidatePath("/", "layout");
  redirect(target);
}

export async function logout(formData?: FormData): Promise<void> {
  const workspace = formData?.get("workspace");
  const store = await cookies();
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) console.warn("Could not revoke the current Supabase session", error.code);
  } catch {
    console.warn("Could not contact Supabase during logout.");
  } finally {
    await clearAdminSession();
    for (const { name } of store.getAll()) {
      if (/^sb-[\w-]+-auth-token(?:-code-verifier)?(?:\.\d+)?$/.test(name)) store.delete(name);
    }
  }

  revalidatePath("/", "layout");
  redirect(typeof workspace === "string" && /^[a-z0-9-]{1,80}$/.test(workspace) ? `/login?workspace=${workspace}` : "/login");
}
