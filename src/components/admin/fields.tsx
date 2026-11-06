"use client";

import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

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
      <label htmlFor={id} className="text-[13px] font-semibold leading-5 opacity-80">
        {label}
        {required ? <span className="text-[#991b1b]"> *</span> : null}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "h-11 w-full rounded-lg border bg-white px-4 text-sm text-body transition-colors placeholder:text-subtle",
          "focus-visible:border-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40",
          error ? "border-danger" : "border-hairline hover:border-outline"
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
