"use client";

import Link from "next/link";
import { useState } from "react";
import { activityEvents, formatEventTime, type ActivityEvent } from "@/lib/admin/activity";
import { ActivityDetailsDialog } from "../activity-details-dialog";
import { AdminModal } from "../admin-modal";
import { Icon } from "../icon";
import { Surface } from "../primitives";

export function RecentDecisions() {
  const [selected, setSelected] = useState<ActivityEvent | null>(null);

  return (
    <Surface className="flex flex-col gap-4 overflow-hidden">
      <div className="flex h-16 items-center justify-between border-b border-line px-[22px]">
        <h2 className="text-[17px] font-bold leading-[27px]">Recent decisions</h2>
        <Link
          href="/admin/activity"
          className="rounded text-sm font-semibold leading-6 text-burnt underline underline-offset-2 hover:text-burnt-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
        >
          View log →
        </Link>
      </div>
      <ul className="flex flex-col">
        {activityEvents.map((event) => (
          <li key={event.id} className="border-b border-line py-1.5 last:border-b-0">
            <button
              type="button"
              onClick={() => setSelected(event)}
              className="flex w-full gap-[14px] rounded-lg px-[22px] py-4 text-left transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
            >
              <Icon name="clock" className="size-5 text-ink" />
              <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
                <span className="truncate text-sm font-bold leading-[21px]">{event.title}</span>
                <span className="truncate text-sm leading-[21px] text-muted">
                  {event.actor} · {event.action}
                </span>
                <span className="truncate text-xs leading-[18px] text-muted">{formatEventTime(event)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <AdminModal open={selected !== null} onClose={() => setSelected(null)}>
        {selected ? <ActivityDetailsDialog event={selected} onClose={() => setSelected(null)} /> : null}
      </AdminModal>
    </Surface>
  );
}
