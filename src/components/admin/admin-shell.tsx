import type { ReactNode } from "react";
import { AdminNav } from "./admin-nav";
import type { PendingSummary } from "@/lib/applications/service";
import { AdminTopbar } from "./admin-topbar";
import { NotificationBell } from "./notification-bell";

type AdminIdentity = {
  name: string;
  role: string;
};

export function AdminShell({ identity, pending, children }: { identity: AdminIdentity; pending: PendingSummary; children: ReactNode }) {
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

      <AdminTopbar identity={identity} pending={pending} />

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-40 hidden items-center justify-end gap-1 bg-powder px-6 py-2 lg:flex">
          <NotificationBell pending={pending} poll />
        </div>
        {children}
      </div>
    </div>
  );
}
