import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { iconBodies } from "./icon-data";

export type IconName =
  | "alert"
  | "arrow-left"
  | "arrow-right"
  | "arrow-up"
  | "bell"
  | "book-settings"
  | "buildings"
  | "calendar"
  | "card"
  | "chart"
  | "check"
  | "check-circle"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "clipboard-list"
  | "clock"
  | "close"
  | "copy"
  | "document"
  | "external-link"
  | "eye"
  | "eye-closed"
  | "eye-off"
  | "file"
  | "filter"
  | "gallery"
  | "globe"
  | "grid"
  | "layers"
  | "list"
  | "lock"
  | "monitor"
  | "more"
  | "qr-code"
  | "search"
  | "settings"
  | "shield"
  | "shield-check"
  | "smartphone"
  | "sparkles"
  | "trash"
  | "upload"
  | "user"
  | "user-plus"
  | "users"
  | "verified"
  | "warning";

export type IconWeight = "regular" | "medium" | "bold" | "fill";

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
      style={{ "--icon-stroke": weight === "bold" ? 2.5 : weight === "medium" ? 2 : 1.5 } as CSSProperties}
      dangerouslySetInnerHTML={{ __html: filled ? (icon.fill as string) : icon.regular }}
    />
  );
}
