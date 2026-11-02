import type { ReactNode } from "react";
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

export function AdminShell({ identity, children }: { identity: AdminIdentity; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-powder text-ink lg:flex-row">
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col gap-3 border-r border-line bg-white p-5 lg:flex">
        <div className="flex flex-col pb-5">
          <p className="font-display text-[40px] leading-[58px] text-burnt">Fides.</p>
          <p className="text-xs font-semibold leading-[18px] tracking-[1.3px]">ADMINISTRATION</p>
        </div>
        <p className="text-xs leading-[18px] tracking-[1.3px] text-muted">WORKSPACE</p>
        <AdminNav orientation="vertical" />
        <div className="flex-1" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold leading-[21px]">{identity.name}</p>
          <p className="text-xs leading-[18px]">{identity.role}</p>
        </div>
      </aside>

      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line bg-white px-4 py-3 sm:px-6 lg:hidden">
        <p className="font-display text-4xl leading-[1.2] text-burnt">Fides.</p>
        <div className="order-last -mx-1 w-full overflow-x-auto px-1 pb-1 xl:order-none xl:mx-0 xl:w-auto xl:overflow-visible xl:p-0">
          <AdminNav orientation="horizontal" />
        </div>
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-10 items-center justify-center rounded-full bg-sky text-xs font-semibold"
          >
            {initialsOf(identity.name)}
          </span>
          <div className="flex flex-col">
            <p className="text-sm font-semibold leading-[21px]">{identity.name}</p>
            <p className="text-xs leading-[18px]">{identity.role}</p>
          </div>
        </div>
      </header>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
