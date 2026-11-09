"use client";

import { useId, useMemo, useState } from "react";
import {
  categoryOptions,
  dateOptions,
  eventsToCsv,
  filterEvents,
  formatEventTime,
  type ActivityEvent,
  type CategoryFilter,
  type DateFilter,
} from "@/lib/admin/activity";
import { AdminButton } from "./admin-button";
import { ActivityDetailsDialog } from "./activity-details-dialog";
import { AdminModal } from "./admin-modal";
import { Icon } from "./icon";
import { PageContent, PageHeading, StatusPill, Surface } from "./primitives";
import { Select } from "./select";
import { ResultDialog } from "./verification-dialogs";

type DialogState = { type: "event"; event: ActivityEvent } | { type: "exported" } | null;

const filterLabel = "text-xs font-semibold leading-[18px]";

export function ActivityLog({ events: allEvents, now }: { events: ActivityEvent[]; now: number }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [date, setDate] = useState<DateFilter>("all");
  const [dialog, setDialog] = useState<DialogState>(null);
  const searchId = useId();

  const events = useMemo(
    () => filterEvents(allEvents, { query, category, date }, now),
    [allEvents, query, category, date, now]
  );

  function exportLog() {
    const blob = new Blob([eventsToCsv(events, now)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fides-activity-log.csv";
    link.click();
    URL.revokeObjectURL(url);
    setDialog({ type: "exported" });
  }

  const close = () => setDialog(null);

  return (
    <PageContent>
      <PageHeading
        eyebrow="ACCOUNTABILITY"
        title="Activity log"
        description="A clear record of verification, account, and pricing decisions."
        actions={
          <AdminButton variant="outline" onClick={exportLog} disabled={events.length === 0}>
            Export log
          </AdminButton>
        }
      />

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-[240px] flex-[3] flex-col gap-1.5">
          <label htmlFor={searchId} className={filterLabel}>
            Search activity
          </label>
          <div className="relative">
            <Icon
              name="search"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-glyph"
            />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search business or action"
              className="h-11 w-full rounded-lg border border-hairline bg-white pl-11 pr-4 text-sm text-body transition-colors placeholder:text-subtle hover:border-outline focus-visible:border-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
            />
          </div>
        </div>
        <Select
          label="Action type"
          labelClassName={filterLabel}
          value={category}
          onChange={setCategory}
          options={[...categoryOptions]}
          className="min-w-[180px] flex-1 gap-1.5"
        />
        <Select
          label="Date range"
          labelClassName={filterLabel}
          value={date}
          onChange={setDate}
          options={[...dateOptions]}
          className="min-w-[180px] flex-1 gap-1.5"
        />
      </div>

      <Surface className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold leading-[27px]">Recent activity</h2>
          <StatusPill>
            {events.length} {events.length === 1 ? "event" : "events"}
          </StatusPill>
        </div>
        {events.length === 0 ? (
          <p role="status" className="py-6 text-sm text-muted">
            {allEvents.length === 0 ? "No activity has been recorded yet." : "No activity matches your filters."}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {events.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => setDialog({ type: "event", event })}
                  className="flex w-full items-center gap-4 rounded-lg p-[18px] text-left transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
                >
                  <Icon name="clock" className="size-6 text-ink" />
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span className="text-sm font-semibold leading-[21px]">{event.title}</span>
                    <span className="text-sm leading-[21px] text-muted">
                      {event.actor} · {event.action}
                    </span>
                    <span className="text-xs leading-[18px] text-muted">{formatEventTime(event, now)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Surface>

      <AdminModal open={dialog !== null} onClose={close}>
        {dialog?.type === "event" ? <ActivityDetailsDialog event={dialog.event} now={now} onClose={close} /> : null}
        {dialog?.type === "exported" ? (
          <ResultDialog
            title="Export requested"
            message="The activity log has been exported as a CSV file."
            onDone={close}
          />
        ) : null}
      </AdminModal>
    </PageContent>
  );
}
