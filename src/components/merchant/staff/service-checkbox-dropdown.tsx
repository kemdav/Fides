"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { fieldOutlineClasses } from "@/components/admin/fields";
import { Icon } from "@/components/admin/icon";
import { cn } from "@/lib/utils";

export type StaffServiceOption = {
  id: string;
  name: string;
  duration_minutes?: number;
  price_cents?: number;
};

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 });

export function ServiceCheckboxDropdown({ services, value, onChange, disabled }: {
  services: StaffServiceOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = services.filter(({ id }) => value.includes(id));
  const summary = selected.length ? `${selected.length} ${selected.length === 1 ? "service" : "services"} selected` : "Select services";

  useLayoutEffect(() => {
    const anchor = trigger.current;
    const options = panel.current;
    if (!open || !anchor || !options) return;

    function position(event?: Event) {
      if (!anchor || !options || (event?.target instanceof Node && options.contains(event.target))) return;
      const rect = anchor.getBoundingClientRect();
      const gap = 6;
      const edge = 8;
      const viewportHeight = document.documentElement.clientHeight;
      const above = rect.top - gap - edge;
      const below = viewportHeight - rect.bottom - gap - edge;
      const scrollArea = options.querySelector("fieldset");
      const naturalHeight = options.offsetHeight + (scrollArea
        ? Math.min(scrollArea.scrollHeight, 208) - scrollArea.offsetHeight
        : 0);
      const opensAbove = below < naturalHeight && above > below;

      Object.assign(options.style, {
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        top: opensAbove ? "auto" : `${rect.bottom + gap}px`,
        bottom: opensAbove ? `${viewportHeight - rect.top + gap}px` : "auto",
        maxHeight: `${Math.max(0, opensAbove ? above : below)}px`,
        visibility: "visible",
      });
    }

    position();
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    return () => {
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
      options.style.visibility = "hidden";
    };
  }, [open, services.length]);

  function close() {
    panel.current?.hidePopover();
    trigger.current?.focus();
  }

  function remove(serviceId: string) {
    onChange(value.filter((id) => id !== serviceId));
  }

  return (
    <div className="space-y-2">
      <p id={`${id}-label`} className="text-sm font-semibold text-ink">Services this person can perform</p>
      <button ref={trigger} type="button" disabled={disabled}
        aria-expanded={open} aria-controls={`${id}-options`} aria-labelledby={`${id}-label ${id}-summary`}
        className={cn(fieldOutlineClasses, "flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-sm disabled:opacity-50", open && "border-burnt")}
        popoverTarget={`${id}-options`}>
        <span id={`${id}-summary`}>{summary}</span>
        <Icon name="chevron-down" className={cn("size-4 shrink-0 text-burnt", open && "rotate-180")} />
      </button>
      <div ref={panel} id={`${id}-options`} popover="auto" style={{ visibility: "hidden" }}
        onToggle={(event) => setOpen(event.newState === "open")}
        className="fixed inset-auto m-0 flex-col overflow-hidden rounded-lg border border-hairline bg-white p-0 shadow-lg [&:popover-open]:flex">
        <fieldset disabled={disabled} aria-labelledby={`${id}-label`} className="max-h-52 min-h-0 min-w-0 overflow-y-auto overscroll-contain px-2 py-2">
          {services.length === 0 && <p className="p-3 text-sm text-muted">No active services available.</p>}
          {services.map((service) => {
            const checked = value.includes(service.id);
            return (
              <label key={service.id} className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-mist">
                <input type="checkbox" checked={checked} className="mt-1 size-4 shrink-0 accent-burnt"
                  onChange={() => checked ? remove(service.id) : onChange([...value, service.id])} />
                <span className="min-w-0">
                  <span className="block break-words text-sm text-ink">{service.name}</span>
                  {typeof service.duration_minutes === "number" && typeof service.price_cents === "number" && (
                    <span className="block text-xs text-muted">
                      {service.duration_minutes} min · {peso.format(service.price_cents / 100)}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </fieldset>
        <button type="button" onClick={close}
          className="min-h-10 w-full shrink-0 border-t border-hairline bg-mist px-3 text-sm font-semibold text-burnt-dark transition-colors hover:bg-burnt/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-burnt">
          Done
        </button>
      </div>
      {selected.length > 0 && (
        <ul aria-label="Selected services" className="flex flex-wrap gap-2">
          {selected.map((service) => (
            <li key={service.id} className="inline-flex max-w-full items-center gap-2 rounded-md border border-hairline bg-white pl-2 text-xs text-ink">
              <span className="min-w-0 break-words">{service.name}</span>
              <button type="button" disabled={disabled} aria-label={`Remove ${service.name}`}
                className="shrink-0 rounded-md px-2 py-2 font-medium text-burnt-dark hover:bg-burnt/10"
                onClick={() => { remove(service.id); trigger.current?.focus(); }}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
