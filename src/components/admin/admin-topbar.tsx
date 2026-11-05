"use client";

import { useEffect, useId, useState } from "react";
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

export function AdminTopbar({ identity }: { identity: AdminIdentity }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white lg:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <p className="font-display text-4xl leading-[1.2] text-burnt">Fides.</p>
        <div className="hidden min-w-0 md:block">
          <Identity identity={identity} />
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
          className="flex size-11 flex-col items-center justify-center gap-1.5 rounded-lg text-burnt transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 md:hidden"
        >
          <span
            className={cn(
              "h-0.5 w-6 rounded bg-current transition-[translate,rotate,opacity] duration-300",
              open && "translate-y-2 rotate-45"
            )}
          />
          <span className={cn("h-0.5 w-6 rounded bg-current transition-opacity duration-300", open && "opacity-0")} />
          <span
            className={cn(
              "h-0.5 w-6 rounded bg-current transition-[translate,rotate,opacity] duration-300",
              open && "-translate-y-2 -rotate-45"
            )}
          />
        </button>
      </div>

      <div className="hidden px-4 pb-2 sm:px-6 md:block">
        <AdminNav orientation="horizontal" />
      </div>

      <div
        id={menuId}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out md:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-4 border-t border-line px-4 pb-4 pt-3 sm:px-6">
            <AdminNav orientation="vertical" onNavigate={() => setOpen(false)} />
            <div className="border-t border-line pt-4">
              <Identity identity={identity} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
