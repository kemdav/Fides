"use client";

import { useActionState, useState } from "react";
import { adminLogin, type AdminLoginState } from "@/app/actions/admin-auth";
import { AdminAuthShell } from "@/components/auth/admin-auth-shell";
import { AuthBanner, AuthCard, AuthField, AuthFootnote, AuthPasswordField, AuthSubmit, authButtonClass } from "@/components/auth/auth-ui";

const initialState: AdminLoginState = { status: "idle", email: "" };

type View = "login" | "forgot" | "sent";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, initialState);
  const [view, setView] = useState<View>("login");

  if (view !== "login") {
    return (
      <AdminAuthShell eyebrow={view === "forgot" ? "Administration" : undefined}>
        {view === "forgot" ? (
          <AuthCard eyebrow="Fides admin" title="Reset your password" description="Enter your administrator email to receive a password reset link." className="gap-[18px]">
            <button type="button" onClick={() => setView("login")} className="-ml-3 -mt-1 inline-flex w-fit cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-[11px] font-semibold text-burnt hover:text-burnt-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40">
              <span aria-hidden>←</span> Back to login
            </button>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setView("sent");
              }}
              className="flex flex-col gap-4"
            >
              <AuthField id="reset-email" name="email" type="email" label="Email address" placeholder="admin@fides.app" autoComplete="email" required />
              <AuthSubmit>Send reset link</AuthSubmit>
            </form>
            <AuthFootnote>Authorized administrators only.</AuthFootnote>
          </AuthCard>
        ) : (
          <AuthCard title="Check your email" description="If an eligible account exists, you’ll receive a link to reset your password. Check your inbox and spam folder." className="max-w-[480px] p-6 sm:p-8">
            <button type="button" onClick={() => setView("login")} className={authButtonClass}>
              Back to sign in
            </button>
          </AuthCard>
        )}
      </AdminAuthShell>
    );
  }

  const locked = state.status === "rate-limited";
  const invalid = state.status === "invalid";
  const fieldErrors = state.status === "field-error" ? state.fieldErrors : undefined;

  return (
    <AdminAuthShell>
      <AuthCard eyebrow="Fides admin" title="Welcome back, Admin!" description="Access the Fides administration portal.">
        <form action={action} noValidate aria-busy={pending} className="flex flex-col gap-4">
          {invalid ? <AuthBanner title="Email or password is incorrect">Check your details and try again, or reset your password.</AuthBanner> : null}
          {locked ? <AuthBanner tone="warning" title="Too many sign-in attempts">Please wait before trying again. Your account is temporarily rate-limited.</AuthBanner> : null}

          <AuthField id="email" name="email" type="email" label="Email address" placeholder="admin@fides.app" autoComplete="username" required defaultValue={state.email} disabled={pending || locked} error={fieldErrors?.email} />
          <AuthPasswordField id="password" name="password" autoComplete="current-password" placeholder="Enter your password" required disabled={pending || locked} error={fieldErrors?.password} />

          <button type="button" onClick={() => setView("forgot")} className="-mt-1 w-fit cursor-pointer rounded text-xs text-burnt hover:text-burnt-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40">
            Forgot password?
          </button>

          {locked ? (
            <button type="button" disabled className="inline-flex h-12 w-full cursor-not-allowed items-center justify-center rounded-md bg-body text-sm font-semibold text-white opacity-45">
              Try again later
            </button>
          ) : (
            <AuthSubmit loading={pending}>{invalid ? "Try again" : "Sign in"}</AuthSubmit>
          )}
        </form>
        <AuthFootnote>Authorized administrators only.</AuthFootnote>
      </AuthCard>
    </AdminAuthShell>
  );
}
