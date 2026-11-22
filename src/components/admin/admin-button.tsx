import Link from "next/link";
import * as React from "react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

export type AdminButtonVariant = "primary" | "outline" | "danger";
export type AdminButtonSize = "xs" | "sm" | "md";

const variantMap: Record<AdminButtonVariant, ButtonVariant> = {
  primary: "brand",
  outline: "secondary",
  danger: "danger",
};

const sizeMap: Record<AdminButtonSize, ButtonSize> = {
  xs: "xs",
  sm: "form",
  md: "formLg",
};

export function adminButtonClasses({
  variant = "primary",
  size = "sm",
  className,
}: { variant?: AdminButtonVariant; size?: AdminButtonSize; className?: string } = {}) {
  return buttonClasses({ variant: variantMap[variant], size: sizeMap[size], className });
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
