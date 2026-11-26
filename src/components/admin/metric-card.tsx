import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";
import { interactiveRing } from "./primitives";

type MetricCardProps = {
  label: string;
  value: number | string;
  caption: string;
  /** Adds the shared arrow after the caption, for cards that link somewhere. */
  captionArrow?: boolean;
  /** Optional: some pages (outside the admin portal) show cards without an icon. */
  icon?: IconName;
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
  captionArrow,
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
    "flex min-h-[184px] flex-col gap-3 overflow-hidden rounded-[10px] p-6 text-left shadow-card-sm",
    featured ? "bg-burnt text-on-burnt" : "bg-white text-ink",
    (href || onClick) && interactiveRing,
  );

  const content = (
    <>
      <div className="flex min-h-5 items-start gap-2">
        {icon ? (
          <Icon
            name={icon}
            weight={iconWeight ?? (featured ? "fill" : "regular")}
            className={cn("size-5 shrink-0", featured ? "text-on-burnt" : "text-glyph")}
          />
        ) : null}
        <p className="min-w-0 break-words text-sm font-semibold leading-5">{label}</p>
      </div>
      <div className="flex h-9 items-center gap-2">
        <p className="text-[32px] font-semibold leading-9">
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
              "min-w-0 flex-1 text-xs leading-[13px] sm:text-[13px] sm:leading-[14px]",
              featured ? "text-on-burnt" : "text-muted",
            )}
          >
            {caption}
            {captionArrow ? <Icon name="arrow-right" weight="medium" className="ml-1 inline size-4 align-text-bottom" /> : null}
          </p>
        </div>
      ) : (
        <>
          <p
            className={cn(
              "wrap-anywhere text-[13px] leading-[18px]",
              featured ? "text-on-burnt" : "text-muted",
            )}
          >
            {caption}
            {captionArrow ? <Icon name="arrow-right" weight="medium" className="ml-1 inline size-4 align-text-bottom" /> : null}
          </p>
          {progress !== undefined && <div
            className="mt-auto flex h-[5px] overflow-hidden rounded-[3px] bg-mist"
            aria-hidden
          >
            <div
              className={cn(
                "h-[5px] rounded-[3px]",
                featured ? "bg-on-burnt" : "bg-burnt",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>}
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
