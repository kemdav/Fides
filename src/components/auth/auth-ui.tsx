import Link from "next/link";
import type { InputHTMLAttributes, ReactNode } from "react";
import { buttonClasses, inputClasses, PasswordInput } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/admin/icon";

export const authButtonClass = buttonClasses({ variant: "brand", size: "form", className: "w-full rounded-md" });

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] animate-spin" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon({ tone }: { tone: "error" | "warning" }) {
  return <Icon name={tone === "error" ? "alert" : "warning"} className="mt-px size-5 shrink-0" />;
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
        <span aria-hidden className="text-danger-text opacity-80">*</span>
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-[13px] text-danger-text">
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
      <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className={cn(inputClasses(!!error), className)} {...props} />
    </FieldShell>
  );
}

export function AuthPasswordField({ id, label = "Password", error, ...props }: Omit<AuthFieldProps, "type" | "label"> & { label?: string }) {
  return (
    <FieldShell id={id} label={label} error={error}>
      <PasswordInput id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} inputClassName={inputClasses(!!error)} {...props} />
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
