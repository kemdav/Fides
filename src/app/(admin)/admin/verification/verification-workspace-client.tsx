"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AdminButton } from "@/components/admin/admin-button";
import { AdminModal } from "@/components/admin/admin-modal";
import { Icon } from "@/components/admin/icon";
import { MetricCard } from "@/components/admin/metric-card";
import { Checkbox, PageContent, PageHeading, StatusPill, Surface } from "@/components/admin/primitives";
import { ReviewQueue, statusTones } from "@/components/admin/review-queue";
import {
  ApproveDialog,
  DocumentDialog,
  RejectDialog,
  RequestChangesDialog,
  ResultDialog,
} from "@/components/admin/verification-dialogs";

type DialogState =
  | { type: "approve" }
  | { type: "request" }
  | { type: "reject" }
  | { type: "document"; document: any }
  | { type: "result"; title: string; message: string };

export interface Submission {
  id: string;
  reference: string;
  initials: string;
  business: string;
  category: string;
  owner: string;
  location: string;
  email: string;
  submittedOn: string;
  status: "pending" | "approved" | "changes_requested" | "rejected";
  documents: { key: string; label: string; meta: string }[];
  note?: string[];
}

const reviewChecks = [
  "Business name matches the permit",
  "Permit is valid and legible",
  "Owner identity matches the registration",
] as const;

const changeRequirements = [
  {
    id: "permit",
    label: "Business permit is missing, expired or unreadable.",
    message: "Please upload a current, readable copy of your business permit.",
  },
  {
    id: "identification",
    label: "Owner identification is missing or does not match.",
    message: "Please upload a valid owner identification that matches your registration.",
  },
  {
    id: "details",
    label: "Business details do not match the submitted documents.",
    message: "Please correct your business details so they match the submitted documents.",
  },
  {
    id: "others",
    label: "Others",
    message: "Our review team needs additional information to complete verification.",
  },
] as const;

const REVIEW_TARGET_DAYS = 3;
const REASON_MIN = 10;
const REASON_MAX = 500;
const SAMPLE_TODAY = new Date();

function daysWaiting(submission: Submission): number {
  const submitted = new Date(`${submission.submittedOn}T00:00:00`);
  return Math.max(0, Math.round((SAMPLE_TODAY.getTime() - submitted.getTime()) / (24 * 60 * 60 * 1000)));
}

function formatWaiting(days: number): string {
  if (days === 0) return "Today";
  return days === 1 ? "1 day" : `${days} days`;
}

function formatSubmittedOn(submission: Submission): string {
  return new Date(`${submission.submittedOn}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isOverdue(submission: Submission): boolean {
  return submission.status === "pending" && daysWaiting(submission) > REVIEW_TARGET_DAYS;
}

function sortSubmissions(
  items: Submission[],
  sort: "oldest" | "newest"
): Submission[] {
  const direction = sort === "oldest" ? 1 : -1;
  return [...items].sort(
    (a, b) =>
      direction *
      (a.submittedOn.localeCompare(b.submittedOn) || a.reference.localeCompare(b.reference))
  );
}

function matchesQuery(submission: Submission, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    submission.business.toLowerCase().includes(needle) ||
    submission.reference.toLowerCase().includes(needle)
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function mapAccountRequestToSubmission(req: any): Submission {
  return {
    id: req.id,
    reference: req.reference_code || req.referenceCode,
    initials: getInitials(req.business_name || req.businessName),
    business: req.business_name || req.businessName,
    category: req.category,
    owner: req.owner_name || req.ownerName,
    location: req.address || "",
    email: req.owner_email || req.ownerEmail,
    submittedOn: req.created_at || req.createdAt,
    status: req.status === "pending" ? "pending" : req.status === "active" ? "approved" : "rejected",
    documents: [
      { key: "permit", label: "Business Permit", meta: "PDF · View" },
      { key: "identification", label: "Owner ID", meta: "PDF · View" },
    ],
    note: req.reviewer_notes ? [req.reviewer_notes] : [],
  };
}

function firstPending(items: Submission[]) {
  return sortSubmissions(
    items.filter((item) => item.status === "pending"),
    "oldest"
  )[0];
}

export function VerificationWorkspaceClient({ initialSelectedId }: { initialSelectedId?: string }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checks, setChecks] = useState<boolean[]>([false, false, false]);
  const [decidedThisSession, setDecidedThisSession] = useState(0);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch submissions on mount
  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const res = await fetch("/api/account-requests?status=all");
        if (res.ok) {
          const data = await res.json();
          const mapped = (data.requests || []).map(mapAccountRequestToSubmission);
          setSubmissions(mapped);

          // Set initial selection
          const requested = mapped.find(
            (item) => item.id === initialSelectedId && item.status === "pending"
          );
          setSelectedId((requested ?? firstPending(mapped))?.id ?? null);
        }
      } catch (error) {
        console.error("Failed to fetch submissions:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSubmissions();
  }, [initialSelectedId]);

  const selected = submissions.find((item) => item.id === selectedId) ?? null;
  const pending = submissions.filter((item) => item.status === "pending");
  const overdue = pending.filter(isOverdue);
  const completed = checks.filter(Boolean).length;
  const allChecked = completed === reviewChecks.length;

  const metrics = useMemo(
    () => ({
      pending: pending.length,
      overdue: overdue.length,
      reviewed: decidedThisSession,
    }),
    [pending.length, overdue.length, decidedThisSession]
  );

  function select(submission: Submission) {
    setSelectedId(submission.id);
    setChecks([false, false, false]);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  function record(status: "approved" | "changes_requested" | "rejected", note: string[], result: { title: string; message: string }) {
    if (!selected) return;
    setSubmissions((current) =>
      current.map((item) =>
        item.id === selected.id ? { ...item, status, note } : item
      )
    );
    setDecidedThisSession((count) => count + 1);
    setChecks([false, false, false]);
    setDialog({ type: "result", ...result });
  }

  const close = () => setDialog(null);

  if (loading) {
    return (
      <PageContent>
        <PageHeading
          eyebrow="TRUST & SAFETY"
          title="Verification Queue"
          description="Loading submissions..."
        />
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-burnt border-t-transparent" />
        </div>
      </PageContent>
    );
  }

  return (
    <PageContent>
      <PageHeading
        eyebrow="TRUST & SAFETY"
        title="Verification Queue"
        description="Review evidence, complete checks, and make a clear decision."
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-3">
        <MetricCard
          featured
          label="Pending submissions"
          value={metrics.pending}
          caption="Ready for review"
          icon="verified"
          progress={46}
        />
        <MetricCard
          label="Past review target"
          value={metrics.overdue}
          caption={`Waiting longer than ${REVIEW_TARGET_DAYS} days`}
          icon="clock"
          progress={46}
        />
        <MetricCard
          label="Reviewed this session"
          value={metrics.reviewed}
          caption="Verification completed"
          icon="verified"
          progress={46}
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-2">
        <ReviewQueue title="Review queue" submissions={submissions} selectedId={selectedId} onSelect={select} />

        <div ref={panelRef} className="scroll-mt-20">
        {selected ? (
          <EvidencePanel
            submission={selected}
            checks={checks}
            onCheck={(index, value) => setChecks((current) => current.map((item, i) => (i === index ? value : item)))}
            allChecked={allChecked}
            completed={completed}
            onOpenDocument={(document) => setDialog({ type: "document", document })}
            onApprove={() => setDialog({ type: "approve" })}
            onRequest={() => setDialog({ type: "request" })}
            onReject={() => setDialog({ type: "reject" })}
          />
        ) : (
          <Surface className="flex flex-col gap-2 py-10 text-center">
            <h2 className="text-lg font-semibold leading-[27px]">You are all caught up</h2>
            <p className="text-sm leading-[21px] text-muted">There are no submissions waiting for review.</p>
          </Surface>
        )}
        </div>
      </div>

      <AdminModal open={dialog !== null} onClose={close}>
        {dialog && selected ? (
          <>
            {dialog.type === "approve" && (
              <ApproveDialog
                business={selected.business}
                onCancel={close}
                onConfirm={() =>
                  record("approved", ["All verification checks were completed."], {
                    title: "Merchant approved",
                    message: `${selected.business} has been approved.`,
                  })
                }
              />
            )}
            {dialog.type === "request" && (
              <RequestChangesDialog
                submission={selected}
                onClose={close}
                onSend={(ids) =>
                  record(
                    "changes_requested",
                    changeRequirements.filter((item) => ids.includes(item.id)).map((item) => item.message),
                    {
                      title: "Update request sent",
                      message: "The selected requirements have been sent to the tenant for updating.",
                    }
                  )
                }
              />
            )}
            {dialog.type === "reject" && (
              <RejectDialog
                business={selected.business}
                onCancel={close}
                onConfirm={(reason) =>
                  record("rejected", [reason], {
                    title: "Submission rejected",
                    message: `${selected.business} has been rejected.`,
                  })
                }
              />
            )}
            {dialog.type === "document" && (
              <DocumentDialog submission={selected} document={dialog.document} onClose={close} />
            )}
          </>
        ) : null}
        {dialog?.type === "result" && (
          <ResultDialog title={dialog.title} message={dialog.message} onDone={close} />
        )}
      </AdminModal>
    </PageContent>
  );
}

function EvidencePanel({
  submission,
  checks,
  onCheck,
  allChecked,
  completed,
  onOpenDocument,
  onApprove,
  onRequest,
  onReject,
}: {
  submission: Submission;
  checks: boolean[];
  onCheck: (index: number, value: boolean) => void;
  allChecked: boolean;
  completed: number;
  onOpenDocument: (document: any) => void;
  onApprove: () => void;
  onRequest: () => void;
  onReject: () => void;
}) {
  return (
    <Surface className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-xs leading-[18px] text-muted">
          {submission.reference} · Submitted {formatSubmittedOn(submission)}
        </p>
        <StatusPill tone={statusTones[submission.status]}>{submission.status === "pending" ? "Pending" : submission.status === "approved" ? "Approved" : submission.status === "changes_requested" ? "Changes requested" : "Rejected"}</StatusPill>
      </div>

      <div className="flex items-center gap-3">
        <span className="rounded-md bg-sky px-2 py-1 text-xs font-semibold leading-[18px]">
          {submission.initials}
        </span>
        <div className="flex min-w-0 flex-col gap-[3px]">
          <h2 className="text-lg font-semibold leading-[27px]">{submission.business}</h2>
          <p className="text-sm leading-[21px] text-muted">{submission.category}</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:max-w-[533px]">
        <div className="flex flex-col gap-[3px]">
          <dt className="text-xs leading-[18px] text-muted">Business owner</dt>
          <dd className="text-sm leading-[21px]">{submission.owner}</dd>
        </div>
        <div className="flex flex-col gap-[3px]">
          <dt className="text-xs leading-[18px] text-muted">Location</dt>
          <dd className="text-sm leading-[21px]">{submission.location}</dd>
        </div>
        <div className="col-span-2 flex flex-col gap-[3px]">
          <dt className="text-xs leading-[18px] text-muted">Contact email</dt>
          <dd className="break-all text-sm font-semibold leading-[21px]">{submission.email}</dd>
        </div>
      </dl>

      <DecisionBanner submission={submission} />

      <h3 className="text-base font-semibold leading-6">Submitted documents</h3>
      <div className="flex flex-wrap gap-[10px]">
        {submission.documents.map((document) => (
          <button
            key={document.key}
            type="button"
            onClick={() => onOpenDocument(document)}
            className="flex w-[261px] max-w-full flex-col items-start gap-1.5 rounded-[14px] border border-line bg-white p-3 text-left shadow-[0_8px_12px_rgb(31_46_33/0.04)] transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
          >
            <span className="flex items-center gap-[10px] text-xs font-semibold leading-[18px]">
              <Icon name="file" className="size-5" />
              {document.label}
            </span>
            <span className="text-xs leading-[18px] text-muted">{document.meta}</span>
          </button>
        ))}
      </div>

      {submission.status === "pending" ? (
        <>
      <div className="flex items-center gap-3">
        <h3 className="text-base font-semibold leading-6">Review checklist</h3>
        <p className="text-xs leading-[18px] text-muted">{completed}/3 complete</p>
      </div>
      <div className="flex flex-col gap-3">
        {reviewChecks.map((label, index) => (
          <Checkbox
            key={label}
            checked={checks[index]}
            onChange={(value) => onCheck(index, value)}
            label={label}
          />
        ))}
      </div>
      <p id="approval-hint" className="text-xs leading-[18px] text-muted">
        Complete all three checks to approve this merchant.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <AdminButton disabled={!allChecked} aria-describedby="approval-hint" onClick={onApprove}>
          Approve merchant
        </AdminButton>
        <AdminButton variant="outline" onClick={onRequest}>
          Request changes
        </AdminButton>
        <AdminButton variant="danger" onClick={onReject}>
          Reject
        </AdminButton>
      </div>
        </>
      ) : null}
    </Surface>
  );
}

const bannerTones = {
  pending: "bg-mist text-muted",
  overdue: "bg-warn-bg text-warn-fg",
  approved: "bg-wash text-success",
  changes_requested: "bg-info-bg text-info",
  rejected: "bg-danger-bg text-danger-dark",
} as const;

function DecisionBanner({ submission }: { submission: Submission }) {
  const { status, note = [] } = submission;
  const tone = status === "pending" ? (isOverdue(submission) ? "overdue" : "pending") : status;
  const waiting = daysWaiting(submission);

  return (
    <div className={`flex items-start gap-[10px] rounded-lg p-3 text-xs leading-[18px] ${bannerTones[tone]}`}>
      <Icon name="alert" className="mt-px size-[18px]" />
      {status === "pending" ? (
        <p>
          {isOverdue(submission)
            ? `Waiting ${waiting} days. Past the ${REVIEW_TARGET_DAYS}-day review target.`
            : `Waiting ${waiting} days. Within the ${REVIEW_TARGET_DAYS}-day review target.`}
        </p>
      ) : status === "changes_requested" ? (
        <div className="flex flex-col gap-0.5">
          <p>Changes requested</p>
          <ul className="flex flex-col gap-0.5">
            {note.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p>
          {status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending"} — {note.join(" ") || "Decision recorded."}
        </p>
      )}
    </div>
  );
}