"use client";

import { SelectField } from "@/components/ui/select-field";

interface BaseListboxProps {
  id: string;
  label: string;
  required?: boolean;
  describedBy?: string;
  disabled?: boolean;
  placement?: "auto" | "above" | "below";
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

type ListboxProps = BaseListboxProps & (
  | { multiple?: false; value: string; onChange: (value: string) => void }
  | { multiple: true; value: string[]; onChange: (value: string[]) => void }
);

/** Labelled form dropdown; the control itself is the shared `SelectField`. */
export function Listbox(props: ListboxProps) {
  const { id, label, required, options, placeholder, describedBy, disabled, placement } = props;
  const shared = { id, options, placeholder, describedBy, disabled, placement };
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold leading-5 text-ink">
        {label}
        {required && <span className="text-burnt"> *</span>}
      </label>
      {props.multiple ? (
        <SelectField {...shared} multiple value={props.value} onChange={props.onChange} />
      ) : (
        <SelectField {...shared} value={props.value} onChange={props.onChange} />
      )}
    </div>
  );
}
