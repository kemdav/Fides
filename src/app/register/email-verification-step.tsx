"use client";

import { useEffect, useRef, useState } from "react";
import { verifyRegistrationCodeAction, type sendRegistrationCodeAction } from "@/app/actions/registration-email";
import { AdminButton } from "@/components/admin/admin-button";
import { REGISTRATION_CODE_LENGTH as DIGITS } from "@/lib/registration/options";
import { cn } from "@/lib/utils";

export function EmailVerificationStep({ email, retryAt, onResend, onResent, onVerified, onEdit }: {
  email: string;
  retryAt: number;
  onResend: () => ReturnType<typeof sendRegistrationCodeAction>;
  onResent: (retryAt: number) => void;
  onVerified: (proof: string) => void;
  onEdit: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"confirm" | "resend" | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
      setSecondsLeft(seconds);
      if (seconds === 0) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  async function confirm() {
    if (pending || code.length !== DIGITS) return;
    setPending("confirm");
    setError(null);
    try {
      const result = await verifyRegistrationCodeAction(email, code);
      if (result.ok) {
        onVerified(result.proof);
        return;
      }
      setError(result.error);
    } catch {
      setError("We couldn’t check your code. Please try again.");
    } finally {
      setPending(null);
    }
    requestAnimationFrame(() => input.current?.select());
  }

  async function resend() {
    if (pending || secondsLeft > 0) return;
    setPending("resend");
    setError(null);
    try {
      const result = await onResend();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCode("");
      onResent(result.retryAt);
      setSecondsLeft(Math.max(0, Math.ceil((result.retryAt - Date.now()) / 1000)));
    } catch {
      setError("We couldn’t resend the code. Please try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <form className="mx-auto w-full max-w-md" aria-busy={pending !== null} onSubmit={(event) => {
      event.preventDefault();
      void confirm();
    }}>
      <div className="mb-10 text-center">
        <h1 className="font-display text-[28px] leading-[38px] text-ink sm:text-[32px] sm:leading-[42px]">Verification Code</h1>
        <p id="registration-code-hint" className="mt-2 text-base leading-6 text-muted">
          We sent a six-digit code to <strong className="break-all font-semibold text-ink">{email}</strong>.
        </p>
      </div>

      <div className="group relative mx-auto w-full max-w-[368px]">
        <label htmlFor="registration-code" className="sr-only">Six-digit verification code</label>
        <div aria-hidden="true" className="grid grid-cols-6 gap-2 sm:gap-3">
          {Array.from({ length: DIGITS }, (_, index) => (
            <span key={index} className={cn(
              "grid aspect-square place-items-center rounded-lg border border-burnt bg-white/40 text-xl font-semibold text-ink",
              index === Math.min(code.length, DIGITS - 1) && "group-focus-within:ring-2 group-focus-within:ring-burnt/40"
            )}>{code[index]}</span>
          ))}
        </div>
        <input
          ref={input}
          id="registration-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          disabled={pending !== null}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "registration-code-hint registration-code-error" : "registration-code-hint"}
          onChange={(event) => {
            setCode(event.target.value.replace(/\D/g, "").slice(0, DIGITS));
            setError(null);
          }}
          className="absolute inset-0 size-full opacity-0"
        />
      </div>

      {error && <p id="registration-code-error" role="alert" className="mt-4 text-center text-sm text-danger-dark">{error}</p>}

      <div className="mx-auto mt-8 flex max-w-[368px] flex-col gap-3">
        <AdminButton type="submit" size="md" disabled={pending !== null || code.length !== DIGITS}>
          {pending === "confirm" ? "Checking code…" : "Confirm"}
        </AdminButton>
        <div className="flex flex-wrap justify-between gap-x-3">
          <button type="button" onClick={onEdit} disabled={pending !== null} className="min-h-11 rounded-md text-sm font-semibold text-burnt hover:underline focus-visible:outline-2 focus-visible:outline-burnt disabled:opacity-50">
            Change email
          </button>
          <button type="button" onClick={resend} disabled={pending !== null || secondsLeft > 0} className="min-h-11 rounded-md text-sm font-semibold text-burnt hover:underline focus-visible:outline-2 focus-visible:outline-burnt disabled:text-muted disabled:no-underline">
            {secondsLeft > 0
              ? `Resend in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
              : "Resend code"}
          </button>
        </div>
      </div>
    </form>
  );
}
