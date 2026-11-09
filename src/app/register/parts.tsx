"use client";

import Link from "next/link";
import { useId, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { FILE_LIMITS } from "@/lib/registration/options";
import { cn } from "@/lib/utils";

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
      <div aria-hidden className="absolute right-12 top-24 size-9 rotate-[15deg] rounded-lg bg-[#f1d3ab]" />
      <div aria-hidden className="absolute bottom-40 right-16 size-10 rotate-[15deg] rounded-xl bg-[#f1d3ab]" />
      <div className="sticky top-0 flex min-h-dvh flex-col gap-10 px-8 py-8 xl:px-9">
        <div>
          <Link href="/" className="font-display text-4xl leading-tight text-burnt">
            Fides
          </Link>
          <p className="text-xs text-burnt/90">Manage and grow your service business</p>
        </div>
        <ol className="relative flex flex-col">
          {STEPS.map((step, index) => {
            const done = index < current;
            const active = index === current;
            const reachable = index <= furthest && !active;
            return (
              <li key={step.title} className="relative flex gap-4 pb-8 last:pb-0">
                {index < STEPS.length - 1 ? (
                  <span
                    aria-hidden
                    className={cn("absolute left-[19px] top-[42px] h-[calc(100%-42px)] w-0.5", done ? "bg-success" : active ? "bg-burnt/50" : "bg-[#dfd2c0]")}
                  />
                ) : null}
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => onJump(index)}
                  aria-current={active ? "step" : undefined}
                  className="flex items-center gap-4 text-left disabled:cursor-default"
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full border-2",
                      done && "border-success bg-white text-success",
                      active && "border-burnt bg-burnt text-white",
                      !done && !active && "border-[#e3e6ee] bg-[#eceff6] text-muted"
                    )}
                  >
                    <StepIcon name={step.icon} />
                  </span>
                  <span className="flex flex-col">
                    <span className={cn("text-sm font-semibold", active ? "text-burnt" : "text-muted")}>{step.title}</span>
                    <span className={cn("text-[11px]", done ? "flex items-center gap-1 text-success" : active ? "text-burnt/80" : "text-subtle")}>
                      {done ? (
                        <>
                          <StepIcon name="check" className="size-3" /> Completed
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
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label} <span className="text-danger">*</span>
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <div className="text-xs text-subtle">{hint}</div>
      ) : null}
    </div>
  );
}

export const inputClass = (invalid: boolean) =>
  cn(
    "h-12 w-full rounded-lg border bg-white px-4 text-base text-ink placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2",
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
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { id: string; invalid: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? "text" : "password"} aria-invalid={invalid} className={cn(inputClass(invalid), "pr-20")} {...props} />
      <button
        type="button"
        onClick={() => setShow((value) => !value)}
        aria-pressed={show}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-3 py-1.5 text-xs font-semibold text-burnt hover:bg-burnt/10"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function useObjectUrl(file: File | null): string | null {
  return useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
}

export function validateFile(file: File, types: readonly string[], limit: number, label: string): string | null {
  if (!types.includes(file.type)) return `${label} must be ${types.map((type) => type.split("/")[1].toUpperCase().replace("JPEG", "JPG")).join(", ")}.`;
  if (file.size > limit) return `${label} must be ${Math.round(limit / (1024 * 1024))} MB or smaller.`;
  return null;
}

export function FilePicker({
  file,
  onChange,
  label,
  idleText,
  compact = false,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  label: string;
  idleText?: string;
  compact?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const url = useObjectUrl(file);
  const isImage = file?.type.startsWith("image/");

  function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0];
    event.target.value = "";
    if (!next) return;
    const problem = validateFile(next, FILE_LIMITS.documentTypes, FILE_LIMITS.documentBytes, "The file");
    setError(problem);
    if (!problem) onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <input id={inputId} ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="sr-only" onChange={pick} aria-label={label} />
      {file ? (
        <div className="flex items-center gap-3 rounded-lg bg-[#eceff6] px-3 py-2.5">
          {isImage && url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="size-10 shrink-0 rounded-md object-cover" />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-wash text-success">
              <StepIcon name="shield" className="size-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <a href={url ?? undefined} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold text-ink hover:underline">
              {file.name}
            </a>
            <p className="text-xs text-success">Selected · {formatBytes(file.size)}</p>
          </div>
          <button type="button" onClick={() => onChange(null)} className="shrink-0 text-xs font-semibold text-burnt hover:underline">
            Remove
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-outline/60 text-sm text-muted transition-colors hover:border-burnt hover:bg-burnt/5 hover:text-burnt",
          compact ? "h-11 border-solid bg-white font-semibold" : "flex-col px-4 py-5"
        )}
      >
        {compact ? <StepIcon name="upload" className="size-4" /> : null}
        <span>{file ? "Upload a different file" : (idleText ?? "Upload File")}</span>
        {!compact ? <span className="text-[11px] text-subtle">PDF, JPG or PNG · max 5 MB</span> : null}
      </button>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-[#eef2ff] px-4 py-3 text-sm text-info">
      <StepIcon name="info" className="mt-0.5 size-4 shrink-0" />
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
