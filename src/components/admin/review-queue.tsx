"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import {
  daysWaiting,
  formatWaiting,
  matchesQuery,
  sortSubmissions,
  type Submission,
  type SubmissionSort,
  type SubmissionStatus,
  statusLabels,
} from "@/lib/admin/verification";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import { StatusPill, Surface, type PillTone } from "./primitives";
import { Select } from "./select";

export const statusTones: Record<SubmissionStatus, PillTone> = {
  pending: "warning",
  approved: "success",
  changes_requested: "info",
  rejected: "danger",
};

const tabs: { status: SubmissionStatus; label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "approved", label: "Approved" },
  { status: "changes_requested", label: "Changes requested" },
  { status: "rejected", label: "Rejected" },
];

type ReviewQueueProps = {
  title: string;
  submissions: Submission[];
  selectedId?: string | null;
  onSelect?: (submission: Submission) => void;
  hrefFor?: (submission: Submission) => string;
  className?: string;
};

function QueueRow({
  submission,
  selected,
  onSelect,
  href,
}: {
  submission: Submission;
  selected: boolean;
  onSelect?: (submission: Submission) => void;
  href?: string;
}) {
  const className = cn(
    "flex h-16 w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left",
    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40",
    selected ? "bg-selected" : "hover:bg-mist"
  );
  const content = (
    <>
      <span className="flex w-[43px] shrink-0 items-center rounded-[10px] bg-wash p-[10px] text-base font-semibold leading-6">
        {submission.initials}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-semibold leading-[21px]">{submission.business}</span>
        <span className="truncate text-xs leading-[18px] text-muted">{submission.category}</span>
      </span>
      <span className="flex shrink-0 flex-col items-center gap-1 sm:min-w-[100px]">
        {submission.status === "pending" ? (
          <>
            <StatusPill tone="warning">
              {formatWaiting(daysWaiting(submission))}
            </StatusPill>
            <span className="text-xs leading-[18px] text-muted">Pending</span>
          </>
        ) : (
          <StatusPill
            tone={statusTones[submission.status]}
            className="max-w-[100px] whitespace-normal text-center sm:max-w-[130px]"
          >
            {statusLabels[submission.status]}
          </StatusPill>
        )}
      </span>
    </>
  );

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={() => onSelect?.(submission)} aria-pressed={selected} className={className}>
      {content}
    </button>
  );
}

export function ReviewQueue({ title, submissions, selectedId, onSelect, hrefFor, className }: ReviewQueueProps) {
  const [tab, setTab] = useState<SubmissionStatus>("pending");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SubmissionSort>("oldest");
  const searchId = useId();
  const panelId = useId();

  const pendingCount = submissions.filter((item) => item.status === "pending").length;
  const rows = useMemo(
    () =>
      sortSubmissions(
        submissions.filter((item) => item.status === tab && matchesQuery(item, query)),
        sort
      ),
    [submissions, tab, query, sort]
  );

  return (
    <Surface className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold leading-[27px]">{title}</h2>
        <StatusPill>{pendingCount} pending</StatusPill>
      </div>

      <div role="tablist" aria-label="Submission status" className="flex flex-wrap items-center gap-x-5 gap-y-1 py-1 text-xs">
        {tabs.map((item) => {
          const active = item.status === tab;
          return (
            <button
              key={item.status}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={panelId}
              onClick={() => setTab(item.status)}
              className={cn(
                "py-1.5 leading-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40",
                active ? "font-semibold text-burnt" : "text-muted hover:text-ink"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-[220px] flex-1 flex-col gap-2">
          <label htmlFor={searchId} className="text-sm font-semibold leading-6 opacity-80">
            Search submissions
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
              placeholder="Business name or merchant ID"
              className="h-11 w-full rounded-lg border border-hairline bg-white pl-11 pr-4 text-sm text-body transition-colors placeholder:text-subtle hover:border-outline focus-visible:border-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
            />
          </div>
        </div>
        <Select
          label="Sort by"
          value={sort}
          onChange={setSort}
          options={[
            { value: "oldest", label: "Oldest first" },
            { value: "newest", label: "Newest first" },
          ]}
          className="w-full sm:w-[163px]"
        />
      </div>

      <div id={panelId} role="tabpanel" className="flex flex-col gap-2">
        {rows.length === 0 ? (
          <p role="status" className="px-3 py-6 text-sm text-muted">
            {query.trim() ? "No submissions match your search." : "No submissions in this view."}
          </p>
        ) : (
          rows.map((submission) => (
            <QueueRow
              key={submission.id}
              submission={submission}
              selected={submission.id === selectedId}
              onSelect={onSelect}
              href={hrefFor?.(submission)}
            />
          ))
        )}
      </div>
    </Surface>
  );
}
