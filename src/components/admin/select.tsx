"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AssetIcon } from "./asset-icon";

export type SelectOption<T extends string> = { value: T; label: string; detail?: string };

type SelectProps<T extends string> = {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  labelClassName?: string;
};

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  labelClassName,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const listId = useId();
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function openMenu() {
    setActive(selectedIndex);
    setOpen(true);
  }

  function choose(index: number) {
    onChange(options[index].value);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) return openMenu();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + step + options.length) % options.length);
    } else if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      choose(active);
    }
  }

  return (
    <div ref={rootRef} className={cn("flex flex-col gap-2", className)}>
      <span id={labelId} className={cn("text-sm leading-5", labelClassName)}>
        {label}
      </span>
      <div className="relative">
        <button
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={labelId}
          onClick={() => (open ? setOpen(false) : openMenu())}
          onKeyDown={onKeyDown}
          className={cn(
            "flex h-[42px] w-full items-center justify-between rounded-md border bg-white px-[14px] text-left text-sm text-body transition-colors",
            "focus-visible:border-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40",
            open ? "border-burnt" : "border-hairline hover:border-outline"
          )}
        >
          <span className="truncate">{options[selectedIndex].label}</span>
          <span className="flex shrink-0 items-center gap-3">
            {options[selectedIndex].detail ? (
              <span className="text-xs text-muted">{options[selectedIndex].detail}</span>
            ) : null}
            <AssetIcon
              name="icon-angle-down"
              className={cn("size-[14px] shrink-0 transition-transform", open && "rotate-180")}
            />
          </span>
        </button>
        {open ? (
          <ul
            id={listId}
            role="listbox"
            aria-labelledby={labelId}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 flex flex-col gap-0.5 rounded-lg border border-hairline bg-white p-1 shadow-[0_8px_24px_rgb(44_58_75/0.14)]"
          >
            {options.map((option, index) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                onPointerEnter={() => setActive(index)}
                onClick={() => choose(index)}
                className={cn(
                  "flex h-9 cursor-pointer items-center justify-between gap-2 rounded-md px-3 text-sm",
                  index === active ? "bg-burnt/10 text-burnt" : "text-body",
                  option.value === value && "font-semibold"
                )}
              >
                <span className="truncate">{option.label}</span>
                <span className="flex shrink-0 items-center gap-3">
                  {option.detail ? <span className="text-xs font-normal text-muted">{option.detail}</span> : null}
                  <span className="flex w-[11px] justify-center">
                    {option.value === value ? (
                      <AssetIcon name="check" className="h-[8.38px] w-[11.17px] text-burnt" />
                    ) : null}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
