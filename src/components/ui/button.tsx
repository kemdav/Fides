import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "solid"
  | "outline"
  | "ghost"
  | "brand"
  | "brand-outline"
  | "accent"
  | "secondary"
  | "danger";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "dialog" | "form" | "formLg" | "cta" | "pill";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  solid: "bg-ink text-white hover:bg-ink",
  outline: "border border-line bg-transparent text-ink hover:bg-mist",
  ghost: "bg-transparent text-ink hover:bg-mist",
  brand: "bg-burnt text-white hover:bg-burnt-dark",
  "brand-outline":
    "bg-transparent text-burnt shadow-[inset_0_0_0_2px_var(--color-burnt)] hover:bg-burnt/10",
  accent: "bg-sky text-ink shadow-[0_2px_3px_rgb(9_16_29/0.22)] hover:brightness-95",
  secondary: "border-2 border-outline bg-transparent text-ink hover:bg-mist",
  danger: "bg-danger text-white hover:bg-danger-dark",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "h-9 rounded-md px-3 text-sm/5 font-semibold",
  sm: "h-8 rounded-md px-3 text-sm font-medium",
  md: "h-10 rounded-md px-4 text-sm font-medium",
  lg: "h-12 rounded-md px-6 text-base font-medium",
  dialog: "h-[42px] rounded-md px-4 text-sm/5 font-semibold",
  form: "h-12 rounded-lg px-4 text-sm/6 font-semibold",
  formLg: "h-12 rounded-lg px-4 text-base/6 font-semibold",
  cta: "rounded-lg px-5 py-3 text-base/6 font-semibold",
  pill: "rounded-[32px] px-5 py-3 text-base/6 font-semibold",
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
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glyph focus-visible:ring-offset-2",
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
