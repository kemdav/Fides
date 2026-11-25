"use client";

import * as React from "react";
import { fieldOutlineClasses } from "@/components/admin/fields";

function ChevronSvg({ open }: { open: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 16 10"
      className={`size-4 text-glyph shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
      fill="currentColor"
    >
      <path d="M1.2 1.4a1 1 0 0 1 1.4-.2L8 5.7l5.4-4.5a1 1 0 1 1 1.2 1.6l-6 5a1 1 0 0 1-1.2 0l-6-5a1 1 0 0 1-.2-1.4Z" />
    </svg>
  );
}

interface BaseListboxProps {
  id: string;
  label: string;
  hideLabel?: boolean;
  required?: boolean;
  describedBy?: string;
  disabled?: boolean;
  placement?: "above" | "below";
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

type ListboxProps = BaseListboxProps & (
  | { multiple?: false; value: string; onChange: (value: string) => void }
  | { multiple: true; value: string[]; onChange: (value: string[]) => void }
);

export function Listbox(props: ListboxProps) {
  const { id, label, hideLabel, required, value, options, placeholder, describedBy, disabled, placement = "below" } = props;
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const selected = props.multiple
    ? (props.value.length ? `${props.value.length} selected` : undefined)
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
    if (!isArrow && !(open && (event.key === "Home" || event.key === "End"))) return;
    if (disabled) return;

    event.preventDefault();
    const key = event.key;
    const focusOption = () => {
      const enabled = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>(
        'button[role="option"]:not(:disabled)',
      ) ?? []);
      const focused = enabled.findIndex((option) => option === document.activeElement);
      const selected = enabled.find((option) => option.getAttribute("aria-selected") === "true");
      const last = enabled.length - 1;

      if (key === "Home") enabled[0]?.focus();
      else if (key === "End") enabled[last]?.focus();
      else if (focused === -1) (selected ?? enabled[key === "ArrowUp" ? last : 0])?.focus();
      else enabled[Math.max(0, Math.min(last, focused + (key === "ArrowUp" ? -1 : 1)))]?.focus();
    };

    if (open) focusOption();
    else {
      setOpen(true);
      requestAnimationFrame(focusOption);
    }
  }

  return (
    <div>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "mb-2 block text-sm font-semibold leading-5 text-ink"}>
        {label}{required && <span className="text-burnt"> *</span>}
      </label>
      <div ref={ref} className="relative" onKeyDown={handleKeyDown}>
        <button ref={triggerRef} id={id} type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${id}-options` : undefined} aria-describedby={describedBy}
          onClick={() => setOpen((o) => !o)}
          className={`${fieldOutlineClasses} flex h-11 w-full items-center justify-between px-3 text-left text-sm aria-expanded:border-burnt disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <span className={selected ? "text-ink" : "text-glyph"}>
            {selected ?? placeholder ?? "Select an option"}
          </span>
          <ChevronSvg open={open} />
        </button>
        {open && (
          <ul
            id={`${id}-options`}
            role="listbox"
            aria-label={label}
            aria-multiselectable={props.multiple || undefined}
            className={`absolute inset-x-0 z-30 max-h-56 overflow-y-auto rounded-lg border border-outline bg-white py-1 shadow-md ${placement === "above" ? "bottom-full mb-1" : "top-full mt-1"}`}
          >
            {options.map((option) => {
              const isSelected = props.multiple
                ? props.value.includes(option.value)
                : value === option.value;

              return (
                <li key={option.value} role="presentation">
                  <button type="button" role="option" aria-selected={isSelected} disabled={disabled || option.disabled}
                    onClick={() => {
                      if (props.multiple) {
                        props.onChange(isSelected
                          ? props.value.filter((entry) => entry !== option.value)
                          : [...props.value, option.value]);
                      } else {
                        props.onChange(option.value);
                        setOpen(false);
                        triggerRef.current?.focus();
                      }
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-mist focus-visible:bg-mist focus-visible:outline-none disabled:cursor-default disabled:opacity-60 ${isSelected ? "text-burnt font-semibold" : "text-ink"}`}
                  >
                    {option.label}
                    {props.multiple && isSelected && <span aria-hidden="true">✓</span>}
                  </button>
                </li>
              );
            })}
            {options.length === 0 && <li role="option" aria-disabled="true" aria-selected="false" className="px-4 py-2.5 text-sm text-muted">No options available</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
