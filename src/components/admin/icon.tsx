import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { iconBodies } from "./icon-data";

export type IconName =
  | "alert"
  | "bell"
  | "calendar"
  | "card"
  | "check"
  | "chevron-down"
  | "clock"
  | "close"
  | "file"
  | "grid"
  | "layers"
  | "lock"
  | "more"
  | "search"
  | "settings"
  | "shield"
  | "trash"
  | "users"
  | "verified";

export type IconWeight = "regular" | "bold" | "fill";

export function Icon({
  name,
  className,
  weight = "regular",
}: {
  name: IconName;
  className?: string;
  weight?: IconWeight;
}) {
  const icon = iconBodies[name];
  const filled = weight === "fill" && icon.fill;

  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      className={cn("shrink-0", className)}
      style={{ "--icon-stroke": weight === "bold" ? 2.5 : 1.5 } as CSSProperties}
      dangerouslySetInnerHTML={{ __html: filled ? (icon.fill as string) : icon.regular }}
    />
  );
}
