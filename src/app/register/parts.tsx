"use client";

import Link from "next/link";
import { useMemo, type InputHTMLAttributes, type ReactNode } from "react";
import { Icon } from "@/components/admin/icon";
import { Input, PasswordInput as BasePasswordInput } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getObjectUrl, formatBytes } from "./controls";
import { registrationFieldClasses } from "./field-styles";
import motion from "./sidebar-motion.module.css";

export { formatBytes };

export const STEPS = [
  { title: "Account Creation", icon: "user" },
  { title: "Identity Verification", icon: "shield" },
  { title: "Business Information", icon: "grid" },
  { title: "Document Requirements", icon: "document" },
  { title: "Subscription Package", icon: "card" },
  { title: "Application Summary", icon: "verified" },
] as const;

export function Sidebar({
  current,
  onJump,
  furthest,
  completed,
}: {
  current: number;
  furthest: number;
  completed: readonly number[];
  onJump: (step: number) => void;
}) {
  return (
    <aside className="hidden w-1/3 shrink-0 bg-[#faeed5] lg:block">
      <div className="sticky top-0 isolate h-dvh">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div
            className={cn(
              motion.circle,
              "absolute -left-[22%] -top-[12%] aspect-square w-[min(72%,44dvh)] rounded-full bg-[#efd0a5]/45",
            )}
          />
          <div
            className={cn(
              motion.circle,
              "absolute left-[32%] top-[32%] aspect-square w-[min(34%,30dvh)] rounded-full bg-[#efd0a5]/20",
            )}
          />
          <div
            className={cn(
              motion.circle,
              "absolute -right-[19%] top-[65%] aspect-square w-[min(54%,50dvh)] rounded-full bg-[#efd0a5]/35",
            )}
          />
          <div
            className={cn(
              motion.square,
              "absolute right-[11%] top-[14%] aspect-square w-[min(9%,10dvh)] rotate-[23deg] rounded-md bg-[#e9bb86]/30",
            )}
          />
          <div
            className={cn(
              motion.square,
              motion.driftLeft,
              "absolute left-[8%] top-[53%] aspect-square w-[min(6%,8dvh)] -rotate-12 rounded bg-[#e9bb86]/40",
            )}
          />
          <div
            className={cn(
              motion.square,
              motion.driftLeft,
              "absolute bottom-[max(6%,18px)] left-[calc(50%_-_12px)] size-6 rotate-[20deg] rounded bg-[#e9bb86]/30",
            )}
          />
          <div
            className={cn(
              motion.dot,
              "absolute right-[17%] top-[22%] size-1.5 rounded-full bg-burnt/25",
            )}
          />
          <div
            className={cn(
              motion.dot,
              "absolute right-[28%] top-[52%] size-1.5 rounded-full bg-burnt/25",
            )}
          />
          <div
            className={cn(
              motion.dot,
              "absolute left-[17%] top-[81%] size-2 rounded-full bg-burnt/20",
            )}
          />
        </div>

        <div className="grid h-full grid-rows-[minmax(max-content,1fr)_auto_minmax(0,1fr)] justify-items-start overflow-y-auto py-6 pl-[calc(10%_+_12px)] pr-[calc(10%_-_12px)]">
          <header className="mb-14 self-end text-left">
            <Link
              href="/"
              className="inline-block rounded-sm font-display text-[clamp(2.5rem,4vw,3.5rem)] leading-none text-burnt focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-burnt"
            >
              Fides
            </Link>
            <p className="mt-1 text-base leading-6 text-burnt-dark">
              Manage and grow your service business
            </p>
          </header>

          <nav
            aria-label="Registration progress"
            className="relative top-3 w-fit max-w-full"
          >
            <ol className="flex h-[clamp(476px,72dvh,37rem)] flex-col [--step-size:56px]">
              {STEPS.map((step, index) => {
                const active = index === current;
                const done = !active && completed.includes(index);
                const reachable = index <= furthest && !active;
                const last = index === STEPS.length - 1;
                const Row = reachable ? "button" : "div";

                return (
                  <li
                    key={step.title}
                    aria-current={active ? "step" : undefined}
                    className={cn("relative", !last && "flex-1 pb-7")}
                  >
                    {!last && (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute bottom-1.5 left-[calc(var(--step-size)/2)] top-[calc(var(--step-size)+0.375rem)] w-0.5 -translate-x-1/2 rounded-full",
                          done
                            ? "bg-success/65"
                            : active
                              ? "bg-burnt/50"
                              : "bg-outline/40",
                        )}
                      />
                    )}
                    <Row
                      {...(reachable
                        ? {
                            type: "button" as const,
                            onClick: () => onJump(index),
                          }
                        : {})}
                      className={cn(
                        "flex w-full items-center gap-4 rounded-xl pr-3 text-left transition-colors motion-reduce:transition-none",
                        reachable &&
                          "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-burnt",
                        reachable &&
                          done &&
                          "group hover:bg-wash/90 focus-visible:bg-wash/90",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-(--step-size) shrink-0 place-items-center rounded-full border",
                          active
                            ? "border-burnt bg-burnt text-white shadow-md shadow-burnt/25"
                            : done
                              ? "border-success-deep bg-wash text-success"
                              : "border-outline/30 bg-mist text-muted",
                        )}
                      >
                        <Icon
                          name={step.icon}
                          weight={active || done ? "fill" : "regular"}
                          className="size-[22px]"
                        />
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span
                          className={cn(
                            "text-lg font-bold leading-6 xl:text-xl xl:leading-7",
                            active
                              ? "text-burnt-dark"
                              : "text-muted group-hover:text-ink group-focus-visible:text-ink",
                          )}
                        >
                          {step.title}
                        </span>
                        <span
                          className={cn(
                            "text-sm leading-5",
                            active
                              ? "text-burnt-dark"
                              : done
                                ? "text-success-deep"
                                : "text-muted",
                          )}
                        >
                          {done ? "Completed" : `Step ${index + 1}`}
                        </span>
                      </span>
                    </Row>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </div>
    </aside>
  );
}

export function MobileProgress({
  current,
  completed,
  onJump,
  navigationLocked,
}: {
  current: number;
  completed: readonly number[];
  onJump?: (step: number) => void;
  navigationLocked: boolean;
}) {
  return (
    <header className="bg-[#faecd3] px-4 pb-4 pt-4 sm:px-8 lg:hidden">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-display text-3xl text-burnt">
          Fides
        </Link>
        <p className="text-sm font-semibold text-burnt">
          Step {current + 1} of {STEPS.length}
        </p>
      </div>
      <p className="mt-1 flex items-center gap-2 text-base font-semibold text-ink">
        <Icon
          name={STEPS[current].icon}
          weight="fill"
          className="size-5 text-burnt"
        />
        {STEPS[current].title}
      </p>
      <div className="mt-3 flex gap-1.5" aria-hidden>
        {STEPS.map((step, index) => (
          <span
            key={step.title}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              index === current || completed.includes(index)
                ? "bg-burnt"
                : "bg-[#e6d5bb]",
            )}
          />
        ))}
      </div>
      {onJump && (
        <label className="mt-3 grid gap-1 text-sm font-semibold text-ink">
          Preview a step (development)
          <select
            value={current}
            disabled={navigationLocked}
            onChange={(event) => onJump(Number(event.target.value))}
            className="min-h-11 w-full rounded-lg border border-outline bg-white px-3 text-base font-normal focus-visible:outline-2 focus-visible:outline-burnt disabled:opacity-50"
          >
            {STEPS.map((step, index) => (
              <option key={step.title} value={index}>
                {step.title}
              </option>
            ))}
          </select>
        </label>
      )}
    </header>
  );
}

export function Field({
  label,
  error,
  hint,
  required = true,
  className,
  children,
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-base font-semibold text-ink">
        {label}
        {required && (
          <>
            <span aria-hidden className="ml-0.5 text-danger">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <div id={`${htmlFor}-hint`} className="text-sm text-subtle">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export function TextInput({
  id,
  invalid,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { id: string; invalid: boolean }) {
  return (
    <Input
      unstyled
      id={id}
      aria-invalid={invalid}
      aria-describedby={invalid ? `${id}-error` : undefined}
      className={cn(registrationFieldClasses(invalid), className)}
      {...props}
    />
  );
}

export function PasswordInput({
  id,
  invalid,
  fieldLabel,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  id: string;
  invalid: boolean;
  fieldLabel?: string;
}) {
  return (
    <BasePasswordInput
      id={id}
      aria-invalid={invalid}
      aria-describedby={invalid ? `${id}-error` : undefined}
      fieldLabel={fieldLabel}
      inputClassName={registrationFieldClasses(invalid)}
      {...props}
    />
  );
}

export function useObjectUrl(file: File | null): string | null {
  return useMemo(() => (file ? getObjectUrl(file) : null), [file]);
}

export function validateFile(
  file: File,
  types: readonly string[],
  limit: number,
  label: string,
): string | null {
  if (!types.includes(file.type))
    return `${label} must be ${types.map((type) => type.split("/")[1].toUpperCase().replace("JPEG", "JPG")).join(", ")}.`;
  if (file.size > limit)
    return `${label} must be ${Math.round(limit / (1024 * 1024))} MB or smaller.`;
  return null;
}

export function InfoNote({
  children,
  icon = "info",
}: {
  children: ReactNode;
  icon?: "info" | "shield";
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg bg-[#eef2ff] px-4 py-3 text-info",
        icon === "shield"
          ? "items-center text-sm leading-5"
          : "items-start text-base",
      )}
    >
      {icon === "shield" ? (
        <Icon name="shield" weight="fill" className="size-5" />
      ) : (
        <Icon name="alert" className="mt-0.5 size-4" />
      )}
      <p>{children}</p>
    </div>
  );
}

export function SecureFooter({
  children = "Your verification documents are stored securely.",
}: {
  children?: ReactNode;
}) {
  return (
    <p className="flex items-start justify-center gap-2 text-sm leading-6 text-muted">
      <Icon name="shield" weight="fill" className="mt-0.5 size-5 text-muted" />
      <span>{children}</span>
    </p>
  );
}

export function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-3 text-sm leading-5 sm:gap-5">
      <span className="text-muted">{label}</span>
      <span className="min-w-0 [overflow-wrap:anywhere] text-right font-medium text-ink">
        {value}
      </span>
    </div>
  );
}
