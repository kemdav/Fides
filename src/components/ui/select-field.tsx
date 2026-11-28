"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/admin/icon";
import { useOutsideClose } from "@/lib/use-outside-close";
import { cn } from "@/lib/utils";
import { inputClasses } from "./input";
import { useFloatingFieldPanel } from "./use-floating-field-panel";

export type SelectOption<T extends string = string> = { value: T; label: string; detail?: string; disabled?: boolean };

type SelectValueProps<T extends string> =
  | { multiple?: false; value: T; onChange: (value: T) => void }
  | { multiple: true; value: T[]; onChange: (value: T[]) => void };

/**
 * Branded dropdown (keyboard accessible listbox), the same look as the admin filters.
 * Use it instead of a native <select>. It is controlled; to submit it in a plain <form>,
 * render a hidden input with the value. `compact` is the 44px toolbar/filter trigger.
 */
export function SelectField<T extends string = string>({
  id,
  options,
  invalid = false,
  placeholder = "Select an option",
  className,
  describedBy,
  ariaLabel,
  labelledBy,
  compact = false,
  disabled = false,
  placement = "auto",
  floating = false,
  ...valueProps
}: SelectValueProps<T> & {
  id?: string;
  options: readonly SelectOption<T>[];
  /** where the list opens; "auto" flips above when there is no room below */
  placement?: "auto" | "above" | "below";
  floating?: boolean;
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
  const [flipUp, setFlipUp] = useState(false);
  const multiple = valueProps.multiple === true;
  const isSelected = (optionValue: T) => (valueProps.multiple ? valueProps.value.includes(optionValue) : valueProps.value === optionValue);
  const selectedIndex = valueProps.multiple ? options.findIndex((option) => isSelected(option.value)) : options.findIndex((option) => option.value === valueProps.value);
  const [active, setActive] = useState(Math.max(0, selectedIndex));
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const panelStyle = useFloatingFieldPanel(open && floating, buttonRef, 0, 240);
  const generatedId = useId();
  const listId = `${generatedId}-list`;

  useOutsideClose(open, () => setOpen(false), wrapRef);

  useEffect(() => {
    if (!open || !floating) return;
    const list = listRef.current;
    const option = list?.children.item(active);
    if (!list || !(option instanceof HTMLElement)) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    const bottom = option.offsetTop + option.offsetHeight;
    if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [active, floating, open]);

  function openList() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const need = Math.min(240, options.length * 38 + 8) + 90;
      const below = window.innerHeight - rect.bottom;
      setFlipUp(below < need && rect.top > below);
    }
    setActive(Math.max(0, selectedIndex));
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    if (valueProps.multiple) {
      valueProps.onChange(isSelected(option.value) ? valueProps.value.filter((entry) => entry !== option.value) : [...valueProps.value, option.value]);
      return;
    }
    valueProps.onChange(option.value);
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
  const display = valueProps.multiple ? (valueProps.value.length ? `${valueProps.value.length} selected` : undefined) : current?.label;

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
        <span className={cn("truncate", !display && "text-subtle")}>{display ?? placeholder}</span>
        <span className="flex shrink-0 items-center gap-3">
          {!multiple && current?.detail ? <span className="text-xs font-normal text-muted">{current.detail}</span> : null}
          <Icon name="chevron-down" className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          aria-labelledby={labelledBy ?? id}
          aria-multiselectable={multiple || undefined}
          style={panelStyle}
          className={cn("z-30 flex max-h-60 flex-col gap-0.5 overflow-auto rounded-lg border border-hairline bg-white p-1 shadow-popover", floating
            ? "overscroll-contain"
            : cn("absolute left-0 w-max min-w-full max-w-[min(20rem,calc(100vw-3rem))]", placement === "above" || (placement === "auto" && flipUp) ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]"))}
        >
          {options.map((option, index) => {
            const selected = isSelected(option.value);
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected}
                aria-disabled={option.disabled || undefined}
                onPointerEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                className={cn(
                  "flex min-h-9 cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm",
                  option.disabled && "cursor-default opacity-60",
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
          {options.length === 0 ? <li role="option" aria-disabled="true" aria-selected="false" className="px-3 py-2 text-sm text-muted">No options available</li> : null}
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
}: Omit<React.ComponentProps<typeof SelectField<string>>, "value" | "options" | "onChange" | "multiple"> & {
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
