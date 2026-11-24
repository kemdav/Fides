"use client";

import * as React from "react";
import { fieldOutlineClasses } from "@/components/admin/fields";
import { cn } from "@/lib/utils";

// ─── Chevron SVG ─────────────────────────────────────────────────────────────

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

// ─── Listbox (contact-page dropdown pattern) ─────────────────────────────────

interface BaseListboxProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  describedBy?: string;
  placement?: "above" | "below";
  options: readonly { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
  size?: "default" | "large";
  searchPlaceholder?: string;
}

type ListboxProps = BaseListboxProps & (
  | { multiple?: false; value: string; onChange: (value: string) => void }
  | { multiple: true; value: string[]; onChange: (value: string[]) => void }
);

export function Listbox(props: ListboxProps) {
  const { id, label, required, value, options, placeholder, describedBy, placement = "below", error, className, size, searchPlaceholder } = props;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const listId = React.useId();
  const errorId = `${id}-error`;
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
  const enabledOptions = () => Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('button[role="option"]:not(:disabled)') ?? []);
  const visibleOptions = query.trim()
    ? options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  function openWithFocus(fromEnd: boolean) {
    setQuery("");
    setOpen(true);
    requestAnimationFrame(() => {
      if (searchRef.current) {
        searchRef.current.focus();
        return;
      }
      const choices = enabledOptions();
      const target = choices.find((choice) => choice.getAttribute("aria-selected") === "true")
        ?? (fromEnd ? choices.at(-1) : choices[0]);
      target?.focus();
    });
  }

  return (
    <div className={className}>
      <label htmlFor={id} className={cn("block font-semibold text-ink", size === "large" ? "mb-1.5 text-base leading-6" : "mb-2 text-sm leading-5")}>
        {label}{required && <span className="text-burnt"> *</span>}
      </label>
      <div ref={ref} className="relative" onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }} onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
          return;
        }
        const { key } = event;
        if (event.target === searchRef.current && key !== "ArrowDown" && key !== "ArrowUp") {
          if (key === "Enter") {
            event.preventDefault();
            enabledOptions()[0]?.focus();
          }
          return;
        }
        if (open && key.trim().length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const match = enabledOptions().find((choice) => choice.textContent?.trim().toLowerCase().startsWith(key.toLowerCase()));
          if (match) {
            event.preventDefault();
            match.focus();
          }
          return;
        }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(key)) return;
        if (!open && key !== "ArrowDown" && key !== "ArrowUp") return;
        event.preventDefault();
        if (!open) return openWithFocus(key === "ArrowUp");
        const choices = enabledOptions();
        if (!choices.length) return;
        const currentIndex = choices.findIndex((choice) => choice === document.activeElement);
        const index = key === "Home" ? 0 : key === "End" ? choices.length - 1
          : currentIndex < 0 ? (key === "ArrowDown" ? 0 : choices.length - 1)
            : (currentIndex + (key === "ArrowDown" ? 1 : -1) + choices.length) % choices.length;
        choices[index].focus();
      }}>
        <button ref={triggerRef} id={id} type="button" aria-haspopup="listbox" aria-expanded={open}
          aria-controls={open ? listId : undefined} data-invalid={error ? "true" : undefined}
          aria-describedby={[describedBy, error ? errorId : undefined].filter(Boolean).join(" ") || undefined}
          onClick={(event) => {
            if (open) setOpen(false);
            else if (searchPlaceholder || event.detail === 0) openWithFocus(false);
            else setOpen(true);
          }}
          className={cn(fieldOutlineClasses, "flex w-full items-center justify-between text-left data-[invalid=true]:border-danger", size === "large" ? "h-12 gap-2 px-4 text-base" : "h-11 px-3 text-sm")}
        >
          <span className={cn(size === "large" && "truncate", selected ? "text-ink" : "text-glyph")}>
            {selected ?? placeholder ?? "Select an option"}
          </span>
          <ChevronSvg open={open} />
        </button>
        {open && (
          <div className={cn("absolute inset-x-0 z-30 rounded-lg border border-outline bg-white shadow-md", placement === "above" ? "bottom-full mb-1" : "top-full mt-1", searchPlaceholder && "sm:min-w-64")}>
            {searchPlaceholder && (
              <div className="border-b border-line p-2">
                <input ref={searchRef} type="search" aria-label={searchPlaceholder} placeholder={searchPlaceholder}
                  aria-controls={listId} autoComplete="off" value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className={cn(fieldOutlineClasses, "h-10 w-full px-3 text-sm")}
                />
              </div>
            )}
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={label}
              aria-multiselectable={props.multiple || undefined}
              className="max-h-56 overflow-y-auto rounded-lg py-1"
            >
              {visibleOptions.map((option) => {
                const isSelected = props.multiple
                  ? props.value.includes(option.value)
                  : value === option.value;

                return (
                  <li key={option.value} role="presentation">
                    <button type="button" role="option" aria-selected={isSelected} disabled={option.disabled}
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
                      className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-mist focus-visible:bg-mist focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-burnt disabled:cursor-default disabled:opacity-60 ${isSelected ? "text-burnt font-semibold" : "text-ink"}`}
                    >
                      {option.label}
                      {props.multiple && isSelected && <span aria-hidden="true">✓</span>}
                    </button>
                  </li>
                );
              })}
              {visibleOptions.length === 0 && <li role="option" aria-disabled="true" aria-selected="false" className="px-4 py-2.5 text-sm text-muted">{query.trim() ? "No matching options" : "No options available"}</li>}
            </ul>
          </div>
        )}
      </div>
      {error && <p id={errorId} role="alert" className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}
