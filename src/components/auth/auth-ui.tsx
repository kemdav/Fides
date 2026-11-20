import Link from "next/link";
import type { InputHTMLAttributes, ReactNode } from "react";
import { PasswordInput } from "@/components/ui";
import { cn } from "@/lib/utils";

export const authInputClass = (invalid = false) =>
  cn(
    "h-12 w-full rounded-lg border px-4 text-sm font-semibold text-ink placeholder:font-semibold placeholder:text-ink/50 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50",
    invalid
      ? "border-danger bg-danger-bg focus-visible:ring-danger/30"
      : "border-glyph bg-white hover:border-muted focus-visible:border-muted focus-visible:ring-burnt/30"
  );

export const authButtonClass =
  "inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-md bg-burnt px-4 text-sm font-semibold text-white transition-colors hover:bg-burnt-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] animate-spin" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon({ tone }: { tone: "error" | "warning" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="mt-px size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {tone === "error" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5.5M12 16.5h.01" />
        </>
      ) : (
        <>
          <path d="M10.3 4.2 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9.5v4.5M12 17.2h.01" />
        </>
      )}
    </svg>
  );
}

export function AuthCard({ eyebrow, title, description, children, className }: { eyebrow?: string; title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex w-full max-w-[520px] flex-col gap-4 rounded-2xl border border-hairline bg-white p-6 shadow-[0_3px_14px_rgb(44_58_75/0.04)] sm:p-9", className)}>
      {eyebrow ? <p className="text-xs uppercase text-body">{eyebrow}</p> : null}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] leading-9 text-body sm:text-3xl sm:leading-[38px]">{title}</h1>
        {description ? <p className="text-sm text-subtle">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function AuthBanner({ tone = "error", title, children }: { tone?: "error" | "warning"; title: string; children?: ReactNode }) {
  return (
    <div role="alert" className={cn("flex gap-2.5 rounded-md p-3", tone === "error" ? "bg-danger-bg text-danger" : "bg-warn-bg text-warn-fg")}>
      <AlertIcon tone={tone} />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-semibold">{title}</p>
        {children ? <p className="text-xs text-body">{children}</p> : null}
      </div>
    </div>
  );
}

function FieldShell({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        <span className="opacity-80">{label}</span>
        <span aria-hidden className="text-[#991b1b] opacity-80">*</span>
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-[13px] text-[#991b1b]">
          <span aria-hidden className="size-3.5 shrink-0 rounded-full bg-danger text-center text-[10px] font-bold leading-[14px] text-white">!</span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string };

export function AuthField({ id, label, error, className, ...props }: AuthFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error}>
      <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className={cn(authInputClass(!!error), className)} {...props} />
    </FieldShell>
  );
}

export function AuthPasswordField({ id, label = "Password", error, ...props }: Omit<AuthFieldProps, "type" | "label"> & { label?: string }) {
  return (
    <FieldShell id={id} label={label} error={error}>
      <PasswordInput id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} inputClassName={authInputClass(!!error)} {...props} />
    </FieldShell>
  );
}

export function AuthSubmit({ loading = false, loadingLabel = "Signing in…", children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingLabel?: string }) {
  return (
    <button type="submit" disabled={loading || props.disabled} className={authButtonClass} {...props}>
      {loading ? (
        <>
          <Spinner />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function AuthTextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="cursor-pointer rounded text-xs text-burnt hover:text-burnt-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40">
      {children}
    </Link>
  );
}

export function AuthFootnote({ children }: { children: ReactNode }) {
  return <p className="text-center text-xs text-subtle">{children}</p>;
}
