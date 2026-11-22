import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccountAccess } from "@/lib/applications/service";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/validations/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ registered?: string; error?: string; message?: string; redirect?: string; workspace?: string; switch?: string }> }) {
  const { registered, error, message, redirect: redirectTo, workspace, switch: switchAccount } = await searchParams;
  const target = safeRedirect(redirectTo);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Never auto-forward right after registration: the new applicant must always land on the login form.
  if (user && registered !== "1" && switchAccount !== "1") {
    const access = await getAccountAccess(user.id);
    if (access.ok) redirect(target);
  }

  const staffSignInHref = typeof workspace === "string" && /^[a-z0-9-]{1,80}$/.test(workspace)
    ? `/staff-access?workspace=${workspace}` : "/staff-access";
  return <LoginForm submitted={registered === "1"} queryError={error?.slice(0, 300) ?? null} queryMessage={message?.slice(0, 300) ?? null} redirectTo={target} staffSignInHref={staffSignInHref} />;
}
