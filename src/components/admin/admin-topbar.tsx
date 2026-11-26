"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AdminNav } from "./admin-nav";

type AdminIdentity = {
  name: string;
  role: string;
};

function initialsOf(name: string) {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Identity({ identity }: { identity: AdminIdentity }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky text-xs font-semibold"
      >
        {initialsOf(identity.name)}
      </span>
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-sm font-semibold leading-[21px]">{identity.name}</p>
        <p className="truncate text-xs leading-[18px]">{identity.role}</p>
      </div>
    </div>
  );
}

const iconButton =
  "flex size-11 flex-col items-center justify-center gap-1.5 rounded-lg text-burnt transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40";

export function AdminTopbar({ identity }: { identity: AdminIdentity }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) toggleRef.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    closeRef.current?.focus();

    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const wide = window.matchMedia("(min-width: 768px)");
    const onChange = () => wide.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onChange);

    return () => {
      root.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onChange);
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-white lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <p className="font-display text-4xl leading-[1.2] text-burnt">Fides.</p>
          <div className="hidden min-w-0 md:block">
            <Identity identity={identity} />
          </div>
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className={cn(iconButton, "md:hidden")}
          >
            <span className="h-0.5 w-6 rounded bg-current" />
            <span className="h-0.5 w-6 rounded bg-current" />
            <span className="h-0.5 w-6 rounded bg-current" />
          </button>
        </div>

        <div className="hidden px-4 pb-2 sm:px-6 md:block">
          <AdminNav orientation="horizontal" />
        </div>
      </header>

      <div
        id={menuId}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!open}
        className={cn(
          "fixed inset-0 z-50 flex flex-col bg-white transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none md:hidden",
          open ? "visible translate-x-0" : "invisible translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-2 sm:px-6">
          <p className="font-display text-4xl leading-[1.2] text-burnt">Fides.</p>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className={iconButton}
          >
            <span className="h-0.5 w-6 translate-y-1 rotate-45 rounded bg-current" />
            <span className="h-0.5 w-6 -translate-y-1 -rotate-45 rounded bg-current" />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-6 pt-4 sm:px-6">
          <p className="text-xs leading-[18px] tracking-[1.3px] text-muted">WORKSPACE</p>
          <AdminNav orientation="vertical" onNavigate={() => setOpen(false)} />
          <div className="mt-auto border-t border-line pt-4">
            <Identity identity={identity} />
          </div>
        </div>
      </div>
    </>
  );
}
