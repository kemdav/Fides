"use client";

import { SelectField } from "@/components/ui/select-field";

interface BaseListboxProps {
  id: string;
  label: string;
  hideLabel?: boolean;
  required?: boolean;
  describedBy?: string;
  disabled?: boolean;
  placement?: "auto" | "above" | "below";
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

type ListboxProps = BaseListboxProps &
  (
    | { multiple?: false; value: string; onChange: (value: string) => void }
    | { multiple: true; value: string[]; onChange: (value: string[]) => void }
  );

/** Labelled form dropdown; the control itself is the shared `SelectField`. */
export function Listbox(props: ListboxProps) {
  const {
    id,
    label,
    required,
    value,
    options,
    placeholder,
    describedBy,
    disabled,
    placement = "below",
  } = props;
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const selected = props.multiple
    ? props.value.length
      ? `${props.value.length} selected`
      : undefined
    : options.find((option) => option.value === value)?.label;

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }

    const isArrow = event.key === "ArrowDown" || event.key === "ArrowUp";
    if (!isArrow && !(open && (event.key === "Home" || event.key === "End")))
      return;
    if (disabled) return;

    event.preventDefault();
    const key = event.key;
    const focusOption = () => {
      const enabled = Array.from(
        ref.current?.querySelectorAll<HTMLButtonElement>(
          'button[role="option"]:not(:disabled)',
        ) ?? [],
      );
      const focused = enabled.findIndex(
        (option) => option === document.activeElement,
      );
      const selected = enabled.find(
        (option) => option.getAttribute("aria-selected") === "true",
      );
      const last = enabled.length - 1;

      if (key === "Home") enabled[0]?.focus();
      else if (key === "End") enabled[last]?.focus();
      else if (focused === -1)
        (selected ?? enabled[key === "ArrowUp" ? last : 0])?.focus();
      else
        enabled[
          Math.max(0, Math.min(last, focused + (key === "ArrowUp" ? -1 : 1)))
        ]?.focus();
    };

    if (open) focusOption();
    else {
      setOpen(true);
      requestAnimationFrame(focusOption);
    }
  }

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold leading-5 text-ink"
      >
        {label}
        {required && <span className="text-burnt"> *</span>}
      </label>
      {props.multiple ? (
        <SelectField
          {...shared}
          multiple
          value={props.value}
          onChange={props.onChange}
        />
      ) : (
        <SelectField
          {...shared}
          value={props.value}
          onChange={props.onChange}
        />
      )}
    </div>
  );
}
