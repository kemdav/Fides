import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";
import { interactiveRing } from "./primitives";

type MetricCardProps = {
  label: string;
  value: number | string;
  caption: string;
  icon: IconName;
  progress?: number;
  featured?: boolean;
  badge?: ReactNode;
  miniChart?: boolean;
  href?: string;
  onClick?: () => void;
  pressed?: boolean;
  iconWeight?: "regular" | "bold" | "fill";
  valuePrefix?: string;
  valueSuffix?: string;
};

export function MetricCard({
  label,
  value,
  caption,
  icon,
  progress,
  featured,
  badge,
  miniChart,
  href,
  onClick,
  pressed,
  iconWeight,
  valuePrefix,
  valueSuffix,
}: MetricCardProps) {
  const className = cn(
    "flex h-[184px] flex-col gap-3 overflow-hidden rounded-[10px] p-6 text-left shadow-[0_3px_7px_rgb(44_58_75/0.04)]",
    featured ? "bg-burnt text-on-burnt" : "bg-white text-ink",
    (href || onClick) && interactiveRing,
  );

  const content = (
    <>
      <div className="flex h-5 items-center gap-2">
        <Icon
          name={icon}
          weight={iconWeight ?? (featured ? "fill" : "regular")}
          className={cn("size-5", featured ? "text-on-burnt" : "text-glyph")}
        />
        <p className="truncate text-sm font-semibold leading-5">{label}</p>
      </div>
      <div className={cn("flex items-center gap-2", typeof value === "number" ? "h-9" : "min-h-9")}>
        <p className={cn(
          "font-semibold",
          typeof value === "number" ? "text-[32px] leading-9" : "break-all text-xl leading-7 sm:text-2xl 2xl:text-[28px]",
        )}>
          {valuePrefix}{value.toLocaleString()}{valueSuffix}
        </p>
        {badge}
      </div>
      {miniChart ? (
        <div className="mt-auto flex min-h-8 items-center gap-2 sm:min-h-10 sm:gap-5">
          <div className="flex h-8 shrink-0 items-end gap-1 sm:h-10 sm:gap-1.5" aria-hidden>
            {[
              "h-3 sm:h-4",
              "h-5 sm:h-6",
              "h-6 sm:h-8",
              "h-5 sm:h-6",
              "h-8 sm:h-10",
              "h-6 sm:h-8",
              "h-5 sm:h-6",
            ].map((height, index) => (
              <span
                key={`${height}-${index}`}
                className={`w-1.5 rounded-[3px] sm:w-2 ${height} ${index === 4 ? "bg-burnt" : "bg-sky"}`}
              />
            ))}
          </div>
          <p
            className={cn(
              "min-w-0 flex-1 text-[10px] leading-[13px] sm:text-[13px] sm:leading-[14px]",
              featured ? "text-on-burnt" : "text-muted",
            )}
          >
            {caption}
          </p>
        </div>
      ) : (
        <>
          <p
            className={cn(
              "truncate text-[13px] leading-[18px]",
              featured ? "text-on-burnt" : "text-muted",
            )}
          >
            {caption}
          </p>
          {progress !== undefined && (
            <div className="mt-auto flex h-[5px] overflow-hidden rounded-[3px] bg-mist" aria-hidden>
              <div
                className={cn("h-[5px] rounded-[3px]", featured ? "bg-on-burnt" : "bg-burnt")}
                style={{ width: progress + "%" }}
              />
            </div>
          )}
        </>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={pressed}
        className={cn(className, pressed && "ring-burnt")}
      >
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}

export function OverdueBadge({ count }: { count: number }) {
  return (
    <span className="flex gap-1 rounded-md bg-warn-bg px-1.5 py-[3px] text-[13px] leading-4 text-body">
      <span>{count}</span>
      <span>overdue</span>
    </span>
  );
}
