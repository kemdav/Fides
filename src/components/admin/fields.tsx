"use client";

import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const fieldOutlineClasses =
  "rounded-lg border border-outline bg-white transition-colors focus-visible:border-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function TextField({ label, required, value, onChange, error, className, ...props }: TextFieldProps) {
  const id = useId();
  const errorId = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-semibold leading-5 text-ink">
        {label}
        {required ? <span className="text-burnt"> *</span> : null}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          fieldOutlineClasses,
          "h-11 w-full px-3 text-sm text-ink placeholder:text-glyph read-only:bg-mist disabled:bg-mist",
          error && "border-danger"
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-xs leading-[18px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
