import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "solid" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/*
 * Neutral, structural defaults only. Brand colors, radii, shadows, and motion
 * are applied later from the finalized Figma design system.
 */
const variantClasses: Record<ButtonVariant, string> = {
  solid: "bg-neutral-900 text-white hover:bg-neutral-800",
  outline: "border border-neutral-300 bg-transparent text-neutral-900 hover:bg-neutral-50",
  ghost: "bg-transparent text-neutral-900 hover:bg-neutral-100",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "solid", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
