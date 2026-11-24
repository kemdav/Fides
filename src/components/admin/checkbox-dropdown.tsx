"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { fieldOutlineClasses } from "@/components/admin/fields";
import { Icon } from "@/components/admin/icon";
import { cn } from "@/lib/utils";

type CheckboxDropdownOption = { id: string; name: string; description?: string };

const optionsMaxHeight = 208;

export function CheckboxDropdown({
  label,
  description,
  options,
  value,
  onChange,
  selectionSummary,
  selectedLabel,
  emptyMessage,
  disabled,
  bulkAction,
}: {
  label: string;
  description?: string;
  options: CheckboxDropdownOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  selectionSummary: (count: number) => string;
  selectedLabel: string;
  emptyMessage: string;
  disabled?: boolean;
  bulkAction?: { label: string; onClick: () => void };
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.filter((option) => value.includes(option.id));

  useLayoutEffect(() => {
    const anchor = trigger.current;
    const dropdown = panel.current;
    if (!open || !anchor || !dropdown) return;

    const position = (event?: Event) => {
      if (event?.target instanceof Node && dropdown.contains(event.target)) return;
      const rect = anchor.getBoundingClientRect();
      const gap = 6;
      const edge = 8;
      const viewportHeight = document.documentElement.clientHeight;
      const boundary = anchor.closest("[data-checkbox-dropdown-boundary]")?.getBoundingClientRect();
      const top = Math.max(0, boundary?.top ?? 0);
      const bottom = Math.min(viewportHeight, boundary?.bottom ?? viewportHeight);
      const above = rect.top - top - gap - edge;
      const below = bottom - rect.bottom - gap - edge;
      const scrollArea = dropdown.querySelector("fieldset");
      const naturalHeight = dropdown.offsetHeight + (scrollArea
        ? Math.min(scrollArea.scrollHeight, optionsMaxHeight) - scrollArea.offsetHeight
        : 0);
      const opensAbove = below < naturalHeight && above > below;

      Object.assign(dropdown.style, {
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        top: opensAbove ? "auto" : `${rect.bottom + gap}px`,
        bottom: opensAbove ? `${viewportHeight - rect.top + gap}px` : "auto",
        maxHeight: `${Math.max(0, opensAbove ? above : below)}px`,
        visibility: "visible",
      });
    };

    position();
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    return () => {
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
      dropdown.style.visibility = "hidden";
    };
  }, [open, options.length, selected.length]);

  function remove(optionId: string) {
    onChange(value.filter((selectedId) => selectedId !== optionId));
  }

  return (
    <div className="space-y-2">
      <div>
        <p id={`${id}-label`} className="text-sm font-semibold text-ink">{label}</p>
        {description && <p id={`${id}-description`} className="mt-1 text-xs text-muted">{description}</p>}
      </div>
      <button ref={trigger} type="button" disabled={disabled}
        aria-expanded={open} aria-controls={`${id}-options`} aria-labelledby={`${id}-label ${id}-summary`}
        aria-describedby={description ? `${id}-description` : undefined}
        className={cn(fieldOutlineClasses, "flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-sm aria-expanded:border-burnt disabled:opacity-50")}
        popoverTarget={`${id}-options`}>
        <span id={`${id}-summary`}>{selectionSummary(selected.length)}</span>
        <Icon name="chevron-down" className={cn("size-4 shrink-0 text-burnt", open && "rotate-180")} />
      </button>
      <div ref={panel} id={`${id}-options`} popover="auto" style={{ visibility: "hidden" }}
        onToggle={(event) => setOpen(event.newState === "open")}
        className="fixed inset-auto m-0 flex-col overflow-hidden rounded-lg border border-hairline bg-white p-0 shadow-lg [&:popover-open]:flex">
        <fieldset disabled={disabled} aria-labelledby={`${id}-label`} className="max-h-52 min-h-0 min-w-0 overflow-y-auto overscroll-contain px-2 py-2">
          {bulkAction && (
            <button type="button" onClick={bulkAction.onClick} className="mb-1 rounded-md px-2 py-1 text-xs font-semibold text-burnt hover:bg-mist">
              {bulkAction.label}
            </button>
          )}
          {options.length === 0 && <p className="p-3 text-sm text-muted">{emptyMessage}</p>}
          {options.map((option) => {
            const checked = value.includes(option.id);
            return (
              <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-mist">
                <input type="checkbox" checked={checked} className="mt-1 size-4 shrink-0 accent-burnt"
                  onChange={() => checked ? remove(option.id) : onChange([...value, option.id])} />
                <span className="min-w-0">
                  <span className="block break-words text-sm text-ink">{option.name}</span>
                  {option.description && <span className="block text-xs text-muted">{option.description}</span>}
                </span>
              </label>
            );
          })}
        </fieldset>
        <button type="button" onClick={() => { panel.current?.hidePopover(); trigger.current?.focus(); }}
          className="min-h-10 w-full shrink-0 border-t border-hairline bg-mist px-3 text-sm font-semibold text-burnt-dark transition-colors hover:bg-burnt/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-burnt">
          Done
        </button>
      </div>
      {selected.length > 0 && (
        <ul aria-label={selectedLabel} className="flex flex-wrap gap-2">
          {selected.map((option) => (
            <li key={option.id} className="inline-flex max-w-full items-center gap-2 rounded-md border border-hairline bg-white pl-2 text-xs text-ink">
              <span className="min-w-0 break-words">{option.name}</span>
              <button type="button" disabled={disabled} aria-label={`Remove ${option.name}`}
                className="shrink-0 rounded-md px-2 py-2 font-medium text-burnt-dark hover:bg-burnt/10"
                onClick={() => { remove(option.id); trigger.current?.focus(); }}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
