import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "solid"
  | "outline"
  | "ghost"
  | "brand"
  | "brand-outline"
  | "accent";
export type ButtonSize = "sm" | "md" | "lg" | "cta" | "pill";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  solid: "bg-neutral-900 text-white hover:bg-neutral-800",
  outline: "border border-neutral-300 bg-transparent text-neutral-900 hover:bg-neutral-50",
  ghost: "bg-transparent text-neutral-900 hover:bg-neutral-100",
  brand: "bg-burnt text-white hover:bg-burnt-dark",
  "brand-outline":
    "bg-transparent text-burnt shadow-[inset_0_0_0_2px_var(--color-burnt)] hover:bg-burnt/10",
  accent: "bg-sky text-ink shadow-[0_2px_3px_rgb(9_16_29/0.22)] hover:brightness-95",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 rounded-md px-3 text-sm font-medium",
  md: "h-10 rounded-md px-4 text-sm font-medium",
  lg: "h-12 rounded-md px-6 text-base font-medium",
  cta: "rounded-lg px-[18px] py-[14px] text-lg/7 font-semibold",
  pill: "rounded-[32px] px-[18px] py-[14px] text-lg/7 font-semibold",
};

type ButtonClassOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

export function buttonClasses({
  variant = "solid",
  size = "md",
  className,
}: ButtonClassOptions = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-[color,background-color,box-shadow,scale,filter] duration-300 ease-out",
    "active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "solid", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={buttonClasses({ variant, size, className })}
      {...props}
    />
  )
);

Button.displayName = "Button";
