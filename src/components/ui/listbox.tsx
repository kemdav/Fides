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
  disabled?: boolean;
  resultLimit?: number;
}

type ListboxProps = BaseListboxProps & (
  | { multiple?: false; searchable?: boolean; value: string; onChange: (value: string) => void }
  | { multiple: true; searchable?: never; value: string[]; onChange: (value: string[]) => void }
);

export function Listbox(props: ListboxProps) {
  const { id, label, required, value, options, placeholder, describedBy, placement = "below", error, className, size, searchable, disabled, resultLimit } = props;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const ref = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
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
  const searchText = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
  const term = searchText(query);
  const matches = searchable && open && term
    ? options.filter((option) => searchText(option.label).includes(term))
    : options;
  const visibleOptions = resultLimit ? matches.slice(0, resultLimit) : matches;

  function openWithFocus(fromEnd: boolean) {
    setOpen(true);
    requestAnimationFrame(() => {
      const choices = enabledOptions();
      const target = choices.find((choice) => choice.getAttribute("aria-selected") === "true")
        ?? (fromEnd ? choices.at(-1) : choices[0]);
      target?.focus();
    });
  }

  const description = [describedBy, error ? errorId : undefined].filter(Boolean).join(" ") || undefined;
  const triggerClasses = cn(fieldOutlineClasses, "w-full text-left data-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:bg-mist", size === "large" ? "h-12 px-4 text-base" : "h-11 px-3 text-sm");

  return (
    <div className={className}>
      <label htmlFor={id} className={cn("block font-semibold text-ink", size === "large" ? "mb-1.5 text-base leading-6" : "mb-2 text-sm leading-5")}>
        {label}{required && <span className="text-burnt"> *</span>}
      </label>
      <div ref={ref} className="relative" onBlur={(event) => {
        if ((searchable || event.relatedTarget) && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }} onKeyDown={(event) => {
        if (searchable) return;
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
          return;
        }
        const { key } = event;
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
        {searchable ? (
          <>
            <input
              id={id} role="combobox" type="text" autoComplete="off" disabled={disabled}
              aria-expanded={open} aria-autocomplete="list" aria-controls={open ? listId : undefined}
              aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
              aria-required={required} aria-invalid={!!error} aria-describedby={description}
              data-invalid={error ? "true" : undefined}
              className={cn(triggerClasses, "pr-10 text-ink placeholder:text-glyph")}
              placeholder={placeholder} value={open ? query : selected ?? ""}
              onClick={(event) => {
                if (open) return;
                setQuery(selected ?? "");
                setActiveIndex(-1);
                setOpen(true);
                event.currentTarget.select();
              }}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(-1);
                setOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && open) {
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen(false);
                } else if (event.key === "Enter" && open) {
                  event.preventDefault();
                  const option = visibleOptions[activeIndex] ?? visibleOptions.find((entry) => !entry.disabled);
                  if (option && !option.disabled) {
                    props.onChange(option.value);
                    setOpen(false);
                  }
                } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  if (!open) {
                    setQuery("");
                    setActiveIndex(-1);
                    setOpen(true);
                  }
                  const direction = event.key === "ArrowDown" ? 1 : -1;
                  const start = open && activeIndex >= 0 ? activeIndex : direction === 1 ? -1 : visibleOptions.length;
                  for (let index = start + direction; index >= 0 && index < visibleOptions.length; index += direction) {
                    if (visibleOptions[index].disabled) continue;
                    setActiveIndex(index);
                    requestAnimationFrame(() => document.getElementById(`${listId}-${index}`)?.scrollIntoView({ block: "nearest" }));
                    break;
                  }
                }
              }}
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center"><ChevronSvg open={open} /></span>
          </>
        ) : (
          <button ref={triggerRef} id={id} type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open}
            aria-controls={open ? listId : undefined} data-invalid={error ? "true" : undefined}
            aria-describedby={description}
            onClick={(event) => {
              if (open) setOpen(false);
              else if (event.detail === 0) openWithFocus(false);
              else setOpen(true);
            }}
            className={cn(triggerClasses, "flex items-center justify-between gap-2")}
          >
            <span className={cn(size === "large" && "truncate", selected ? "text-ink" : "text-glyph")}>
              {selected ?? placeholder ?? "Select an option"}
            </span>
            <ChevronSvg open={open} />
          </button>
        )}
        {open && (
          <div className={cn("absolute inset-x-0 z-30 rounded-lg border border-outline bg-white shadow-md", placement === "above" ? "bottom-full mb-1" : "top-full mt-1", searchable && "sm:min-w-64")}>
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={label}
              aria-multiselectable={props.multiple || undefined}
              className="max-h-56 overflow-y-auto rounded-lg py-1"
            >
              {visibleOptions.map((option, index) => {
                const isSelected = props.multiple
                  ? props.value.includes(option.value)
                  : value === option.value;

                return (
                  <li key={option.value} role="presentation">
                    <button type="button" role="option" aria-selected={isSelected} disabled={option.disabled}
                      id={searchable ? `${listId}-${index}` : undefined}
                      tabIndex={searchable ? -1 : undefined}
                      onMouseDown={searchable ? (event) => event.preventDefault() : undefined}
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
                      className={cn("flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-mist focus-visible:bg-mist focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-burnt disabled:cursor-default disabled:opacity-60", isSelected ? "font-semibold text-burnt" : "text-ink", searchable && index === activeIndex && "bg-mist")}
                    >
                      {option.label}
                      {props.multiple && isSelected && <span aria-hidden="true">✓</span>}
                    </button>
                  </li>
                );
              })}
              {visibleOptions.length === 0 && <li role="option" aria-disabled="true" aria-selected="false" className="px-4 py-2.5 text-sm text-muted">{query.trim() ? "No matching options" : "No options available"}</li>}
            </ul>
            {matches.length > visibleOptions.length && (
              <p className="border-t border-line px-4 py-2 text-sm text-muted">Type to see more matches.</p>
            )}
          </div>
        )}
      </div>
      {error && <p id={errorId} role="alert" className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}
