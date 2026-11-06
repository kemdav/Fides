import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

export const interactiveRing =
  "ring-2 ring-transparent transition-shadow hover:ring-burnt/40 focus-visible:outline-none focus-visible:ring-burnt/40";

export function Surface({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-[10px] bg-white p-4 shadow-[0_3px_14px_rgb(44_58_75/0.04)] sm:p-6", className)}>
      {children}
    </section>
  );
}

export function PageContent({ children }: { children: ReactNode }) {
  return <main className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">{children}</main>;
}

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-xs leading-[18px] tracking-[1.2px] text-muted">{eyebrow}</p>
        <h1 className="font-display text-[28px] leading-[38px] sm:text-[32px] sm:leading-[42px]">{title}</h1>
        <p className="max-w-[780px] text-sm leading-[21px] text-muted">{description}</p>
      </div>
      {actions}
    </div>
  );
}

export type PillTone = "neutral" | "warning" | "success" | "info" | "danger";

const pillTones: Record<PillTone, string> = {
  neutral: "bg-mist text-ink",
  warning: "bg-warn-bg text-warn-fg",
  success: "bg-wash text-success",
  info: "bg-info-bg text-info",
  danger: "bg-danger-bg text-danger-dark",
};

export function StatusPill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: PillTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold leading-[18px]",
        pillTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  tone = "neutral",
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  tone?: "neutral" | "brand";
  className?: string;
}) {
  return (
    <label className={cn("flex w-fit items-center gap-[10px] text-sm leading-[21px]", className)}>
      <span className="relative flex size-4 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className={cn(
            "peer size-4 appearance-none rounded-[2px] border bg-white checked:border-burnt checked:bg-burnt",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40",
            tone === "brand" ? "border-burnt" : "border-subtle"
          )}
        />
        <Icon
          name="check"
          weight="bold"
          className="pointer-events-none absolute inset-0 m-auto hidden size-3 text-white peer-checked:block"
        />
      </span>
      {label}
    </label>
  );
}
