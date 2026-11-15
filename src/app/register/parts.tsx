"use client";

import Link from "next/link";
import { useMemo, type InputHTMLAttributes, type ReactNode } from "react";
import { PasswordInput as BasePasswordInput } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getObjectUrl, formatBytes } from "./controls";

export { formatBytes };

export const STEPS = [
  { title: "Account Creation", icon: "user" },
  { title: "Identity Verification", icon: "shield" },
  { title: "Business Information", icon: "building" },
  { title: "Document Requirements", icon: "document" },
  { title: "Subscription Package", icon: "card" },
  { title: "Application Summary", icon: "clipboard" },
] as const;

type IconName = (typeof STEPS)[number]["icon"] | "check" | "upload" | "info" | "lock";

export function StepIcon({ name, className }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0v1H5v-1Z" fill="currentColor" />,
    shield: (
      <path
        d="M12 2.5 4.5 5.5v5.8c0 4.4 3 8.4 7.5 10.2 4.5-1.8 7.5-5.8 7.5-10.2V5.5L12 2.5Zm-1.2 13.2-3-3 1.4-1.4 1.6 1.6 4-4 1.4 1.4-5.4 5.4Z"
        fill="currentColor"
      />
    ),
    building: (
      <path
        d="M4 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v6h4a1 1 0 0 1 1 1v10H4Zm3-14v2h2V7H7Zm0 4v2h2v-2H7Zm0 4v2h2v-2H7Zm4-8v2h2V7h-2Zm0 4v2h2v-2h-2Zm0 4v2h2v-2h-2Zm5-1v2h2v-2h-2Zm0 4v2h2v-2h-2Z"
        fill="currentColor"
      />
    ),
    document: (
      <path
        d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V8h4.5L13 3.5ZM7 12v1.5h10V12H7Zm0 4v1.5h7V16H7Z"
        fill="currentColor"
      />
    ),
    card: (
      <path
        d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2H3V6Zm0 4h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8Zm3 5v2h4v-2H6Z"
        fill="currentColor"
      />
    ),
    clipboard: (
      <path
        d="M9 2h6a1 1 0 0 1 1 1v1h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V3a1 1 0 0 1 1-1Zm1 2v1h4V4h-4Zm-.3 9.2 1.8 1.8 3.8-3.8 1.2 1.2-5 5-3-3 1.2-1.2Z"
        fill="currentColor"
      />
    ),
    check: <path d="M5 12.5 10 17.5 19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />,
    upload: (
      <path
        d="M12 16V5m0 0-4 4m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    info: (
      <path
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 5h2v2h-2V7Zm0 4h2v6h-2v-6Z"
        fill="currentColor"
      />
    ),
    lock: (
      <path d="M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1Zm2 0h6V7a3 3 0 0 0-6 0v3Z" fill="currentColor" />
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-5", className)}>
      {paths[name]}
    </svg>
  );
}

export function Sidebar({ current, onJump, furthest }: { current: number; furthest: number; onJump: (step: number) => void }) {
  return (
    <aside className="relative hidden w-[300px] shrink-0 overflow-hidden bg-[#faecd3] lg:block xl:w-[354px]">
      <div aria-hidden className="absolute -left-20 -top-24 size-[340px] rounded-full bg-[#f6dcb9]/70" />
      <div aria-hidden className="absolute -bottom-20 -right-24 size-[300px] rounded-full bg-[#f6dcb9]/70" />
      <div aria-hidden className="absolute left-[132px] top-[250px] size-[120px] rounded-full bg-[#f6dcb9]/50" />
      <div aria-hidden className="absolute right-12 top-24 size-9 rotate-[15deg] rounded-lg bg-[#f1d3ab]" />
      <div aria-hidden className="absolute bottom-40 right-16 size-10 rotate-[15deg] rounded-xl bg-[#f1d3ab]" />
      <div aria-hidden className="absolute left-5 top-[360px] size-2 rounded-full bg-[#f1b98a]" />
      <div aria-hidden className="absolute right-14 top-[200px] size-1.5 rounded-full bg-[#f1b98a]" />
      <div aria-hidden className="absolute bottom-16 left-16 size-1.5 rounded-full bg-[#f1b98a]" />
      <div className="sticky top-0 flex h-dvh min-h-[640px] flex-col px-8 pb-8 pt-9 xl:px-10">
        <div>
          <Link href="/" className="font-display text-4xl leading-tight text-burnt">
            Fides
          </Link>
          <p className="text-xs text-burnt/90">Manage and grow your service business</p>
        </div>
        <nav aria-label="Registration progress" className="mt-16">
          <ol className="relative flex flex-col">
            {STEPS.map((step, index) => {
              const done = index < current;
              const active = index === current;
              const reachable = index <= furthest && !active;
              const last = index === STEPS.length - 1;
              return (
                <li key={step.title} className={cn("relative", !last && "pb-[38px]")}>
                  {!last ? (
                    <span
                      aria-hidden
                      className={cn("absolute left-[18px] top-[46px] h-[22px] w-0.5 rounded-full", done ? "bg-success" : active ? "bg-burnt/40" : "bg-[#e1d6c6]")}
                    />
                  ) : null}
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => onJump(index)}
                    aria-current={active ? "step" : undefined}
                    className="flex items-center gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 disabled:cursor-default"
                  >
                    <span
                      className={cn(
                        "flex size-[38px] shrink-0 items-center justify-center rounded-full border-2",
                        done && "border-success bg-white text-success",
                        active && "border-burnt bg-burnt text-white shadow-[0_4px_10px_-2px_rgb(195_80_0/0.45)]",
                        !done && !active && "border-[#e3e6ee] bg-[#eceff6] text-muted"
                      )}
                    >
                      <StepIcon name={step.icon} className="size-[18px]" />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className={cn("text-sm leading-5", active ? "font-bold text-burnt" : "font-semibold text-muted")}>{step.title}</span>
                      <span className={cn("text-[11px] leading-4", done ? "flex items-center gap-1 text-success" : active ? "text-burnt/80" : "text-subtle")}>
                        {done ? (
                          <>
                            <svg viewBox="0 0 24 24" aria-hidden className="size-3.5">
                              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.2-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7Z" fill="currentColor" />
                            </svg>
                            Completed
                          </>
                        ) : active ? (
                          `Step ${index + 1} · Active`
                        ) : (
                          `Step ${index + 1}`
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </aside>
  );
}

export function MobileProgress({ current }: { current: number }) {
  return (
    <header className="bg-[#faecd3] px-4 pb-4 pt-4 sm:px-8 lg:hidden">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-display text-3xl text-burnt">
          Fides
        </Link>
        <p className="text-xs font-semibold text-burnt">
          Step {current + 1} of {STEPS.length}
        </p>
      </div>
      <p className="mt-1 text-sm font-semibold text-ink">{STEPS[current].title}</p>
      <div className="mt-3 flex gap-1.5" aria-hidden>
        {STEPS.map((step, index) => (
          <span key={step.title} className={cn("h-1.5 flex-1 rounded-full", index <= current ? "bg-burnt" : "bg-[#e6d5bb]")} />
        ))}
      </div>
    </header>
  );
}

export function Field({
  label,
  error,
  hint,
  className,
  children,
  htmlFor,
  caps = false,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
  htmlFor: string;
  /** Small uppercase label style used on the Identity step in Figma. */
  caps?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className={cn(caps ? "text-xs font-semibold uppercase tracking-wide text-body" : "text-sm font-semibold text-ink")}>
        {label}
        <span aria-hidden className="ml-0.5 text-danger">
          *
        </span>
        <span className="sr-only"> (required)</span>
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <div id={`${htmlFor}-hint`} className="text-xs text-subtle">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export const inputClass = (invalid: boolean) =>
  cn(
    "h-11 w-full rounded-md border bg-white px-3.5 text-sm text-ink placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2",
    invalid ? "border-danger focus-visible:ring-danger/30" : "border-outline/60 hover:border-outline focus-visible:border-burnt focus-visible:ring-burnt/30"
  );

export function TextInput({
  id,
  invalid,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { id: string; invalid: boolean }) {
  return <input id={id} aria-invalid={invalid} className={cn(inputClass(invalid), className)} {...props} />;
}

export function PasswordInput({
  id,
  invalid,
  fieldLabel,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { id: string; invalid: boolean; fieldLabel?: string }) {
  return <BasePasswordInput id={id} aria-invalid={invalid} fieldLabel={fieldLabel} inputClassName={inputClass(invalid)} {...props} />;
}

export function useObjectUrl(file: File | null): string | null {
  return useMemo(() => (file ? getObjectUrl(file) : null), [file]);
}

export function validateFile(file: File, types: readonly string[], limit: number, label: string): string | null {
  if (!types.includes(file.type)) return `${label} must be ${types.map((type) => type.split("/")[1].toUpperCase().replace("JPEG", "JPG")).join(", ")}.`;
  if (file.size > limit) return `${label} must be ${Math.round(limit / (1024 * 1024))} MB or smaller.`;
  return null;
}

export function InfoNote({ children, icon = "info" }: { children: ReactNode; icon?: "info" | "shield" }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-[#eef2ff] px-4 py-3 text-sm text-info">
      <StepIcon name={icon === "shield" ? "shield" : "info"} className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

export function SecureFooter() {
  return (
    <p className="flex items-center justify-center gap-2 text-xs text-subtle">
      <StepIcon name="shield" className="size-4 text-glyph" />
      Your data is encrypted and secure. We never share your information.
    </p>
  );
}
