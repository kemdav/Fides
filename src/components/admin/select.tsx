"use client";

import { useId } from "react";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { cn } from "@/lib/utils";

export type { SelectOption };

type SelectProps<T extends string> = {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  labelClassName?: string;
};

/** Labelled compact dropdown for admin and merchant filters; the control itself is the shared `SelectField`. */
export function Select<T extends string>({ label, value, options, onChange, className, labelClassName }: SelectProps<T>) {
  const labelId = useId();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span id={labelId} className={cn("text-sm leading-5", labelClassName)}>
        {label}
      </span>
      <SelectField compact labelledBy={labelId} value={value} options={options} onChange={onChange} />
    </div>
  );
}
