"use client";

import Link from "next/link";
import { useMemo, type InputHTMLAttributes, type ReactNode } from "react";
import { inputClasses, PasswordInput as BasePasswordInput } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getObjectUrl, formatBytes } from "./controls";
import { Icon, type IconName as SharedIconName } from "@/components/admin/icon";

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

const sharedIcons: Record<IconName, { name: SharedIconName; weight: "regular" | "bold" | "fill" }> = {
  user: { name: "user", weight: "fill" },
  shield: { name: "shield", weight: "fill" },
  building: { name: "buildings", weight: "fill" },
  document: { name: "document", weight: "fill" },
  card: { name: "card", weight: "fill" },
  clipboard: { name: "clipboard-list", weight: "fill" },
  check: { name: "check", weight: "bold" },
  upload: { name: "upload", weight: "regular" },
  info: { name: "alert", weight: "fill" },
  lock: { name: "lock", weight: "fill" },
};

export function StepIcon({ name, className }: { name: IconName; className?: string }) {
  const { name: shared, weight } = sharedIcons[name];
  return <Icon name={shared} weight={weight} className={cn("size-5", className)} />;
}

export function Sidebar({ current, onJump, furthest }: { current: number; furthest: number; onJump: (step: number) => void }) {
  return (
    <aside className="relative hidden w-[300px] shrink-0 overflow-hidden bg-sand lg:block xl:w-[354px]">
      <div aria-hidden className="absolute -left-20 -top-24 size-[340px] rounded-full bg-sand-200/70" />
      <div aria-hidden className="absolute -bottom-20 -right-24 size-[300px] rounded-full bg-sand-200/70" />
      <div aria-hidden className="absolute left-[132px] top-[250px] size-[120px] rounded-full bg-sand-200/50" />
      <div aria-hidden className="absolute right-12 top-24 size-9 rotate-[15deg] rounded-lg bg-sand-300" />
      <div aria-hidden className="absolute bottom-40 right-16 size-10 rotate-[15deg] rounded-xl bg-sand-300" />
      <div aria-hidden className="absolute left-5 top-[360px] size-2 rounded-full bg-sand-400" />
      <div aria-hidden className="absolute right-14 top-[200px] size-1.5 rounded-full bg-sand-400" />
      <div aria-hidden className="absolute bottom-16 left-16 size-1.5 rounded-full bg-sand-400" />
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
                      className={cn("absolute left-[18px] top-[46px] h-[22px] w-0.5 rounded-full", done ? "bg-success" : active ? "bg-burnt/40" : "bg-sand-line")}
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
                        !done && !active && "border-hairline bg-mist text-muted"
                      )}
                    >
                      <StepIcon name={step.icon} className="size-[18px]" />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className={cn("text-sm leading-5", active ? "font-bold text-burnt" : "font-semibold text-muted")}>{step.title}</span>
                      <span className={cn("text-xs leading-4", done ? "flex items-center gap-1 text-success" : active ? "text-burnt/80" : "text-subtle")}>
                        {done ? (
                          <>
                            <Icon name="check-circle" weight="fill" className="size-3.5" />
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
    <header className="bg-sand px-4 pb-4 pt-4 sm:px-8 lg:hidden">
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
          <span key={step.title} className={cn("h-1.5 flex-1 rounded-full", index <= current ? "bg-burnt" : "bg-sand-line")} />
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

export const inputClass = (invalid: boolean) => inputClasses(invalid);

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
    <div className="flex items-start gap-3 rounded-lg bg-info-bg px-4 py-3 text-sm text-info">
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
