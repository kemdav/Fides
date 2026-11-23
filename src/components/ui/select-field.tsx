"use client";

import { useId, useRef, useState } from "react";
import { Icon } from "@/components/admin/icon";
import { useOutsideClose } from "@/lib/use-outside-close";
import { cn } from "@/lib/utils";
import { inputClasses } from "./input";

export type SelectOption<T extends string = string> = { value: T; label: string; detail?: string };

/**
 * Branded dropdown (keyboard accessible listbox), the same look as the admin filters.
 * Use it instead of a native <select>. It is controlled; to submit it in a plain <form>,
 * render a hidden input with the value. `compact` is the 44px toolbar/filter trigger.
 */
export function SelectField<T extends string = string>({
  id,
  value,
  options,
  onChange,
  invalid = false,
  placeholder = "Select an option",
  className,
  describedBy,
  ariaLabel,
  labelledBy,
  compact = false,
  disabled = false,
}: {
  id?: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  invalid?: boolean;
  placeholder?: string;
  className?: string;
  describedBy?: string;
  ariaLabel?: string;
  labelledBy?: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [active, setActive] = useState(Math.max(0, selectedIndex));
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const generatedId = useId();
  const listId = `${generatedId}-list`;

  useOutsideClose(open, () => setOpen(false), wrapRef);

  function openList() {
    setActive(Math.max(0, selectedIndex));
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((current) => Math.min(options.length - 1, current + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((current) => Math.max(0, current - 1));
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default: {
        if (event.key.length === 1) {
          const index = options.findIndex((option) => option.label.toLowerCase().startsWith(event.key.toLowerCase()));
          if (index >= 0) setActive(index);
        }
      }
    }
  }

  const current = options[selectedIndex];

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid}
        aria-label={ariaLabel}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          compact
            ? cn(
                "flex h-11 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3.5 text-left text-sm text-body transition-colors",
                "focus-visible:border-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 disabled:cursor-not-allowed disabled:opacity-50",
                open ? "border-burnt" : "border-hairline hover:border-outline"
              )
            : cn(inputClasses(invalid), "flex cursor-pointer items-center justify-between gap-2 text-left")
        )}
      >
        <span className={cn("truncate", !current && "text-subtle")}>{current?.label ?? placeholder}</span>
        <span className="flex shrink-0 items-center gap-3">
          {current?.detail ? <span className="text-xs font-normal text-muted">{current.detail}</span> : null}
          <Icon name="chevron-down" className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          aria-labelledby={labelledBy ?? id}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 flex max-h-60 flex-col gap-0.5 overflow-auto rounded-lg border border-hairline bg-white p-1 shadow-popover"
        >
          {options.map((option, index) => {
            const selected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                className={cn(
                  "flex min-h-9 cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm",
                  index === active ? "bg-burnt/10 text-burnt" : "text-body",
                  selected && "font-semibold"
                )}
              >
                <span className="truncate">{option.label}</span>
                <span className="flex shrink-0 items-center gap-3">
                  {option.detail ? <span className="text-xs font-normal text-muted">{option.detail}</span> : null}
                  <span className="flex w-3.5 justify-center">
                    {selected ? <Icon name="check" weight="bold" className="size-3.5 text-burnt" /> : null}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** `SelectField` for numeric values (minutes, hours, days). */
export function NumberSelectField({
  value,
  options,
  onChange,
  ...rest
}: Omit<React.ComponentProps<typeof SelectField>, "value" | "options" | "onChange"> & {
  value: number;
  options: readonly { value: number; label: string }[];
  onChange: (value: number) => void;
}) {
  return (
    <SelectField
      {...rest}
      value={String(value)}
      options={options.map((option) => ({ value: String(option.value), label: option.label }))}
      onChange={(next) => onChange(Number(next))}
    />
  );
}
