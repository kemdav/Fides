import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

export type AdminButtonVariant = "primary" | "outline" | "danger";
export type AdminButtonSize = "xs" | "sm" | "md";

const variantClasses: Record<AdminButtonVariant, string> = {
  primary: "bg-burnt text-white hover:bg-burnt-dark",
  outline: "border-2 border-outline text-ink hover:bg-mist",
  danger: "bg-danger text-white hover:bg-danger-dark",
};

const sizeClasses: Record<AdminButtonSize, string> = {
  xs: "h-9 rounded-md px-3 py-2 text-sm leading-5",
  sm: "h-12 rounded-lg px-4 py-3 text-sm leading-6",
  md: "h-12 rounded-lg px-4 py-3 text-base leading-6",
};

export function adminButtonClasses({
  variant = "primary",
  size = "sm",
  className,
}: { variant?: AdminButtonVariant; size?: AdminButtonSize; className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center whitespace-nowrap font-semibold transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40",
    "disabled:opacity-[0.42] disabled:hover:bg-burnt",
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

type AdminButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
};

export function AdminButton({ variant, size, className, type = "button", ...props }: AdminButtonProps) {
  return <button type={type} className={adminButtonClasses({ variant, size, className })} {...props} />;
}

export function AdminLinkButton({
  variant,
  size,
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: AdminButtonVariant; size?: AdminButtonSize }) {
  return <Link className={adminButtonClasses({ variant, size, className })} {...props} />;
}
