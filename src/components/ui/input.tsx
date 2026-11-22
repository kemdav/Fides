import * as React from "react";
import { cn } from "@/lib/utils";

/** Shared text-field look (Figma input): use for any text input, textarea or select-like control. */
export const inputClasses = (invalid = false) =>
  cn(
    "h-12 w-full rounded-lg border px-4 text-sm font-semibold text-ink placeholder:font-semibold placeholder:text-ink/50 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
    invalid
      ? "border-danger bg-danger-bg focus-visible:ring-danger/30"
      : "border-glyph bg-white hover:border-muted focus-visible:border-muted focus-visible:ring-burnt/30"
  );

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/*
 * Structural shell with neutral defaults; the design system supplies the final
 * visual treatment (including error/disabled tokens) from Figma.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900",
        "placeholder:text-neutral-400",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-red-500",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
