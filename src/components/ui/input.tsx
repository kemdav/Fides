import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Shared text-field look (Figma input): use for any text input, textarea (multiline) or select-like control.
 * Default is 48px (dialogs, auth); `compact` is the 40px search and filter used in table toolbars.
 */
export const inputClasses = (invalid = false, multiline = false, compact = false) =>
  cn(
    multiline ? "resize-y py-3" : compact ? "h-10" : "h-12",
    compact ? "px-3 text-xs" : "px-4 text-sm",
    "w-full rounded-lg border font-semibold text-ink placeholder:font-semibold placeholder:text-ink/50 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
    invalid
      ? "border-danger bg-danger-bg focus-visible:ring-danger/30"
      : "border-glyph bg-white hover:border-muted focus-visible:border-muted focus-visible:ring-burnt/30"
  );

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { unstyled?: boolean };

/*
 * Structural shell with neutral defaults; the design system supplies the final
 * visual treatment (including error/disabled tokens) from Figma.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", unstyled = false, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        !unstyled && [
        "flex h-10 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink",
        "placeholder:text-glyph",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glyph focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-danger",
        ],
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
