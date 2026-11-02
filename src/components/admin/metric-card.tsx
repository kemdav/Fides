import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AssetIcon } from "./asset-icon";
import { interactiveRing } from "./primitives";

type MetricCardProps = {
  label: string;
  value: number;
  caption: string;
  icon: string;
  progress: number;
  featured?: boolean;
  badge?: ReactNode;
  href?: string;
  onClick?: () => void;
};

export function MetricCard({ label, value, caption, icon, progress, featured, badge, href, onClick }: MetricCardProps) {
  const className = cn(
    "flex h-[184px] flex-col gap-3 overflow-hidden rounded-[10px] p-6 text-left shadow-[0_3px_7px_rgb(44_58_75/0.04)]",
    featured ? "bg-burnt text-white" : "bg-white text-ink",
    (href || onClick) &&
      interactiveRing
  );

  const content = (
    <>
      <div className="flex h-5 items-center gap-2">
        <AssetIcon name={icon} className={cn("size-5", featured ? "text-white" : "text-glyph")} />
        <p className="truncate text-sm font-semibold leading-5">{label}</p>
      </div>
      <div className="flex h-9 items-center gap-2">
        <p className="text-[32px] font-semibold leading-9">{value}</p>
        {badge}
      </div>
      <p className={cn("truncate text-[13px] leading-[18px]", featured ? "text-white" : "text-muted")}>
        {caption}
      </p>
      <div className="mt-auto flex h-[5px] overflow-hidden rounded-[3px] bg-mist" aria-hidden>
        <div
          className={cn("h-[5px] rounded-[3px]", featured ? "bg-white" : "bg-burnt")}
          style={{ width: `${progress}%` }}
        />
      </div>
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
      <button type="button" onClick={onClick} className={className}>
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
