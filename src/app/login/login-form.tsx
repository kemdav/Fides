"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { buttonClasses, PasswordInput } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ForgotPasswordFlow } from "./forgot-password-flow";

const initialState: LoginState = { error: null, email: "" };

const fieldClass = (invalid: boolean) =>
  cn(
    "h-11 w-full rounded-md border bg-white px-3.5 text-sm text-ink placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60",
    invalid ? "border-danger focus-visible:ring-danger/30" : "border-outline/60 hover:border-outline focus-visible:border-burnt focus-visible:ring-burnt/30"
  );

export function LoginForm({
  submitted,
  queryError,
  queryMessage,
  redirectTo,
}: {
  submitted: boolean;
  queryError: string | null;
  queryMessage: string | null;
  redirectTo: string;
}) {
  const [state, action, pending] = useActionState(login, initialState);
  const emailRef = useRef<HTMLInputElement>(null);
  const [forgot, setForgot] = useState<{ open: boolean; email: string }>({ open: false, email: "" });
  const emailError = state.fieldErrors?.email;
  const passwordError = state.fieldErrors?.password;
  // Field-level problems appear under their fields; the banner is for everything else.
  const bannerError = state.error && !emailError && !passwordError ? state.error : null;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-powder px-4 py-8 sm:px-8">
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-[360px] rounded-full bg-burnt/10" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 size-[420px] rounded-full bg-burnt/10" />

      <div className="relative flex w-full max-w-[1040px] flex-col gap-3">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 rounded-md py-1 pr-2 text-sm font-semibold text-burnt hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
        >
          <span aria-hidden>←</span> Back to home
        </Link>

        <div className="grid w-full overflow-hidden rounded-3xl bg-white shadow-[0_12px_40px_-12px_rgb(44_58_75/0.25)] md:grid-cols-[1fr_1.05fr]">
          <aside className="relative flex flex-col items-center justify-between gap-4 bg-[#faecd3] px-6 pb-8 pt-8 text-center md:px-10 md:pb-12 md:pt-12 md:text-left">
            <div className="flex w-full flex-col gap-1 md:items-start">
              <Link href="/" className="font-display text-4xl text-burnt md:text-[40px]">
                Fides
              </Link>
              <p className="text-sm text-burnt/90">Manage and grow your service business</p>
            </div>
            <div className="relative aspect-[466/508] w-[200px] max-w-full sm:w-[240px] md:w-full md:max-w-[340px]">
              <Image
                src="/images/mascot/fox-mascot.png"
                alt="Fides fox mascot waving"
                fill
                priority
                sizes="(min-width: 768px) 340px, 240px"
                className="object-contain"
              />
            </div>
            <p className="hidden max-w-[320px] text-sm text-muted md:block">Bookings, schedules, customers, and reports — all in one place.</p>
          </aside>

          <section className="flex flex-col justify-center gap-6 px-6 py-8 sm:px-10 md:py-14">
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-3xl text-ink sm:text-4xl">Welcome back</h1>
              <p className="text-sm text-muted">Log in to manage your business account on Fides.</p>
            </div>

            {submitted ? (
              <p role="status" className="rounded-lg bg-wash px-4 py-3 text-sm text-success">
                Application received. You can log in once an administrator approves it — we will email you.
              </p>
            ) : null}
            {queryMessage ? (
              <p role="status" className="rounded-lg bg-info-bg px-4 py-3 text-sm text-info">
                {queryMessage}
              </p>
            ) : null}
            {queryError ? (
              <p role="alert" className="rounded-lg bg-danger-bg px-4 py-3 text-sm text-danger-dark">
                {queryError}
              </p>
            ) : null}

            <form action={action} className="flex flex-col gap-5" noValidate aria-busy={pending}>
              <input type="hidden" name="redirect" value={redirectTo} />

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-semibold text-ink">
                  Business Email
                </label>
                <input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={pending}
                  defaultValue={state.email}
                  placeholder="maria@bellavita.ph"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "email-error" : undefined}
                  className={fieldClass(!!emailError)}
                />
                {emailError ? (
                  <p id="email-error" role="alert" className="text-xs text-danger">
                    {emailError}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="password" className="text-sm font-semibold text-ink">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgot({ open: true, email: emailRef.current?.value.trim() ?? "" })}
                    className="text-xs font-semibold text-burnt hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
                  >
                    Forgot password?
                  </button>
                </div>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  disabled={pending}
                  placeholder="Enter your password"
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? "password-error" : undefined}
                  inputClassName={fieldClass(!!passwordError)}
                />
                {passwordError ? (
                  <p id="password-error" role="alert" className="text-xs text-danger">
                    {passwordError}
                  </p>
                ) : null}
              </div>

              {bannerError ? (
                <p role="alert" className="rounded-lg bg-danger-bg px-4 py-3 text-sm text-danger-dark">
                  {bannerError}
                </p>
              ) : null}

              <button type="submit" disabled={pending} className={cn(buttonClasses({ variant: "brand", size: "cta" }), "w-full text-base")}>
                {pending ? "Logging in…" : "Log in"}
              </button>
            </form>

            <p className="text-center text-sm text-muted">
              New to Fides?{" "}
              <Link href="/register" className="font-semibold text-burnt underline underline-offset-2 hover:text-burnt-dark">
                Create an account
              </Link>
            </p>
          </section>
        </div>
      </div>
      <ForgotPasswordFlow open={forgot.open} initialEmail={forgot.email} onClose={() => setForgot((current) => ({ ...current, open: false }))} />
    </main>
  );
}
