import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccountAccess } from "@/lib/applications/service";
import { getAccountSession } from "@/lib/supabase/account-session";
import { safeRedirect } from "@/lib/validations/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ registered?: string; error?: string; message?: string; redirect?: string }> }) {
  const { registered, error, message, redirect: redirectTo } = await searchParams;
  const target = safeRedirect(redirectTo);
  const session = await getAccountSession();

  // Never auto-forward right after registration: the new applicant must always land on the login form.
  if (session && registered !== "1") {
    const access = await getAccountAccess(session.user.id, session.admin);
    if (access.ok) redirect(target);
  }

  return <LoginForm submitted={registered === "1"} queryError={error?.slice(0, 300) ?? null} queryMessage={message?.slice(0, 300) ?? null} redirectTo={target} />;
}
