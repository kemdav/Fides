"use client";

import { formatEventTime, type ActivityEvent } from "@/lib/admin/activity";
import { cn } from "@/lib/utils";
import { AdminButton } from "./admin-button";
import { DIALOG_TITLE_ID, dialogSurface } from "./verification-dialogs";

export function ActivityDetailsDialog({ event, onClose }: { event: ActivityEvent; onClose: () => void }) {
  return (
    <div className={cn(dialogSurface, "flex flex-col gap-4 p-5 sm:p-7")}>
      <h2 id={DIALOG_TITLE_ID} className="font-display text-[26px] leading-[38px]">
        Activity details
      </h2>
      <p className="text-xl font-semibold leading-[29px]">{event.title}</p>
      <p className="text-sm font-semibold leading-[21px]">{event.business}</p>
      <p className="text-xs leading-[18px]">{formatEventTime(event)}</p>
      <div className="flex flex-col gap-4 rounded-lg bg-mist p-4 font-semibold sm:flex-row">
        <div className="flex flex-1 flex-col gap-1.5">
          <p className="text-[11px] leading-4">BEFORE</p>
          <p className="text-base leading-6">{event.before}</p>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <p className="text-[11px] leading-4">AFTER</p>
          <p className="text-base leading-6">{event.after}</p>
        </div>
      </div>
      <p className="text-[13px] font-semibold leading-[19px]">Reason / details</p>
      <p className="text-sm leading-[21px]">{event.reason}</p>
      <p className="text-xs leading-[18px]">
        {event.actor} · {event.action}
      </p>
      <div className="flex justify-end">
        <AdminButton variant="outline" size="md" className="min-w-[100px]" onClick={onClose} autoFocus>
          Close
        </AdminButton>
      </div>
    </div>
  );
}
