"use client";

import { useEffect, useState, useTransition } from "react";
import { resetPasswordAction, sendResetCodeAction, verifyResetCodeAction } from "@/app/actions/password-reset";
import { Modal, PasswordInput } from "@/components/ui";
import { checkPassword } from "@/lib/registration/schema";
import { cn } from "@/lib/utils";

type Step = "confirm" | "code" | "password" | "done";

const RESEND_SECONDS = 45;
const inputClass = (invalid: boolean) =>
  cn(
    "h-11 w-full rounded-md border bg-white px-3.5 text-sm text-ink placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2",
    invalid ? "border-danger focus-visible:ring-danger/30" : "border-outline/60 hover:border-outline focus-visible:border-burnt focus-visible:ring-burnt/30"
  );
const primary =
  "inline-flex h-11 items-center justify-center rounded-md bg-burnt px-5 text-sm font-semibold text-white transition-colors hover:bg-burnt-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 disabled:cursor-not-allowed disabled:opacity-60";
const secondary =
  "inline-flex h-11 items-center justify-center rounded-md border border-ink/50 bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 disabled:opacity-60";

/**
 * Forgot-password flow shown as popups on the login page:
 * 1) "Did you really forget your password?" confirmation  2) enter the 4-character emailed code
 * 3) choose a new password  4) reload the login page.
 */
export function ForgotPasswordFlow({ open, initialEmail, onClose }: { open: boolean; initialEmail: string; onClose: () => void }) {
  const [step, setStep] = useState<Step>("confirm");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [pending, startTransition] = useTransition();

  // Fresh state each time the flow opens (adjusted during render, as React recommends).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStep("confirm");
      setEmail(initialEmail);
      setCode("");
      setToken("");
      setPassword("");
      setConfirm("");
      setError(null);
      setCooldown(0);
    }
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const checks = checkPassword(password);

  function sendCode(resend = false) {
    setError(null);
    startTransition(async () => {
      const result = await sendResetCodeAction(email);
      if (!result.ok) return setError(result.error);
      setCooldown(RESEND_SECONDS);
      if (resend) setCode("");
      setStep("code");
    });
  }

  function verify() {
    setError(null);
    if (code.trim().length !== 4) return setError("Enter the 4-character code from your email.");
    startTransition(async () => {
      const result = await verifyResetCodeAction(email, code);
      if (!result.ok) return setError(result.error);
      setToken(result.token);
      setStep("password");
    });
  }

  function savePassword() {
    setError(null);
    if (!password) return setError("Enter a new password.");
    if (!checks.length || !checks.mixedCase || !checks.unique) return setError("Password does not meet all the requirements.");
    if (password !== confirm) return setError("Passwords do not match.");
    startTransition(async () => {
      const result = await resetPasswordAction(email, token, password, confirm);
      if (!result.ok) return setError(result.error);
      setStep("done");
      // Reload the login page so the user can sign in with the new password.
      window.setTimeout(() => { window.location.href = "/login?message=" + encodeURIComponent("Your password has been updated. Please log in with your new password."); }, 1200);
    });
  }

  const errorBox = error ? (
    <p role="alert" className="rounded-lg bg-danger-bg px-4 py-3 text-sm text-danger-dark">
      {error}
    </p>
  ) : null;

  return (
    <Modal open={open} onClose={pending || step === "done" ? () => {} : onClose} unstyled labelledBy="forgot-title" className="m-auto max-h-[calc(100dvh-2rem)] w-[min(30rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl bg-white p-0 shadow-2xl">
      <div className="flex flex-col gap-5 p-6 sm:p-8">
        {step === "confirm" ? (
          <form
            noValidate
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              sendCode();
            }}
          >
            <div className="flex flex-col gap-2">
              <h2 id="forgot-title" className="font-display text-2xl text-ink">
                Forgot your password?
              </h2>
              <p className="text-sm text-muted">Did you really forget your password? If so, we will email a 4-character code to your registered email address.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="forgot-email" className="text-sm font-semibold text-ink">
                Registered email
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="maria@bellavita.ph"
                aria-invalid={!!error}
                className={inputClass(!!error)}
              />
            </div>
            {errorBox}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} className={secondary} disabled={pending}>
                No, go back
              </button>
              <button type="submit" className={primary} disabled={pending}>
                {pending ? "Sending…" : "Yes, send me a code"}
              </button>
            </div>
          </form>
        ) : null}

        {step === "code" ? (
          <form
            noValidate
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              verify();
            }}
          >
            <div className="flex flex-col gap-2">
              <h2 id="forgot-title" className="font-display text-2xl text-ink">
                Enter your code
              </h2>
              <p className="text-sm text-muted">
                If <strong className="text-ink">{email}</strong> is registered, a 4-character code is on its way. It expires in 10 minutes.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset-code" className="text-sm font-semibold text-ink">
                4-character code
              </label>
              <input
                id="reset-code"
                inputMode="text"
                autoComplete="one-time-code"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={4}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())}
                placeholder="A1B2"
                aria-invalid={!!error}
                className={cn(inputClass(!!error), "h-14 text-center font-mono text-2xl font-bold uppercase tracking-[0.5em]")}
              />
            </div>
            {errorBox}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} className={secondary} disabled={pending}>
                Cancel
              </button>
              <button type="submit" className={primary} disabled={pending}>
                {pending ? "Checking…" : "Verify code"}
              </button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => { setError(null); setStep("confirm"); }} className="font-semibold text-muted hover:underline" disabled={pending}>
                Change email
              </button>
              <button type="button" onClick={() => sendCode(true)} disabled={pending || cooldown > 0} className="font-semibold text-burnt hover:underline disabled:text-subtle disabled:no-underline">
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </form>
        ) : null}

        {step === "password" ? (
          <form
            noValidate
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              savePassword();
            }}
          >
            <div className="flex flex-col gap-2">
              <h2 id="forgot-title" className="font-display text-2xl text-ink">
                Set a new password
              </h2>
              <p className="text-sm text-muted">Your code was verified. Choose a new password for your account.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-password" className="text-sm font-semibold text-ink">
                New password
              </label>
              <PasswordInput id="new-password" fieldLabel="new password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} inputClassName={inputClass(false)} />
              <ul className="mt-1 flex flex-col gap-1 text-xs">
                {[
                  [checks.length, "More than 6 characters"],
                  [checks.mixedCase, "Upper and lower case letters"],
                  [checks.unique, "At least one number or symbol"],
                ].map(([ok, label]) => (
                  <li key={String(label)} className={ok ? "text-success" : "text-subtle"}>
                    {ok ? "✓" : "○"} {label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-new-password" className="text-sm font-semibold text-ink">
                Confirm new password
              </label>
              <PasswordInput id="confirm-new-password" fieldLabel="confirm new password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} inputClassName={inputClass(false)} />
            </div>
            {errorBox}
            <button type="submit" className={primary} disabled={pending}>
              {pending ? "Saving…" : "Save new password"}
            </button>
          </form>
        ) : null}

        {step === "done" ? (
          <div role="status" className="flex flex-col items-center gap-3 py-4 text-center">
            <h2 id="forgot-title" className="font-display text-2xl text-ink">
              Password updated
            </h2>
            <p className="text-sm text-muted">Taking you back to the login page…</p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
