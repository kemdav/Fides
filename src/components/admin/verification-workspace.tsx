"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { approveAction, deleteAction, rejectAction } from "@/app/(admin)/admin/actions";
import {
  daysWaiting,
  formatDateTime,
  formatSubmittedOn,
  isOverdue,
  isReviewedToday,
  REVIEW_TARGET_DAYS,
  reviewChecks,
  sortSubmissions,
  type Submission,
  statusLabels,
} from "@/lib/admin/verification";
import { cn } from "@/lib/utils";
import { AdminButton } from "./admin-button";
import { AdminModal } from "./admin-modal";
import { Icon } from "./icon";
import { SubmittedDocuments } from "./document-viewer";
import { MetricCard } from "./metric-card";
import { Checkbox, PageContent, PageHeading, StatusPill, Surface } from "./primitives";
import { ReviewQueue, statusTones } from "./review-queue";
import { ApproveDialog, DeleteApplicationDialog, RejectDialog, ResultDialog } from "./verification-dialogs";

type DialogState =
  | { type: "approve" }
  | { type: "reject" }
  | { type: "delete" }
  | { type: "result"; title: string; message: string; failed?: boolean };

const noChecks = reviewChecks.map(() => false);

function firstPending(items: Submission[]) {
  return sortSubmissions(
    items.filter((item) => item.status === "pending"),
    "oldest"
  )[0];
}

export function VerificationWorkspace({
  submissions,
  now,
  initialSelectedId,
}: {
  submissions: Submission[];
  now: number;
  initialSelectedId?: string;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const requested = submissions.find((item) => item.id === initialSelectedId);
    return (requested ?? firstPending(submissions))?.id ?? null;
  });
  const [checks, setChecks] = useState<boolean[]>(noChecks);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = submissions.find((item) => item.id === selectedId) ?? null;
  const pending = submissions.filter((item) => item.status === "pending");
  const overdue = pending.filter((item) => isOverdue(item, now));
  const completed = checks.filter(Boolean).length;
  const allChecked = completed === reviewChecks.length;

  const metrics = useMemo(
    () => ({
      pending: pending.length,
      overdue: overdue.length,
      reviewed: submissions.filter((item) => isReviewedToday(item, now)).length,
    }),
    [pending.length, overdue.length, submissions, now]
  );

  function select(submission: Submission) {
    setSelectedId(submission.id);
    setChecks(noChecks);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  function perform(
    title: string,
    task: () => Promise<{ ok: true; message: string; warning?: string } | { ok: false; error: string }>
  ) {
    startTransition(async () => {
      const result = await task();
      if (result.ok) {
        setChecks(noChecks);
        setDialog({
          type: "result",
          title,
          message: [result.message, result.warning].filter(Boolean).join(" "),
        });
        router.refresh();
      } else {
        setDialog({ type: "result", title: "Action failed", message: result.error, failed: true });
      }
    });
  }

  const close = () => setDialog(null);

  return (
    <PageContent>
      <PageHeading
        eyebrow="TRUST & SAFETY"
        title="Merchant verification"
        description="Review applications, complete checks, and make a clear decision."
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
          label="Reviewed today"
          value={metrics.reviewed}
          caption="Verification completed"
          icon="verified"
          progress={46}
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-2">
        <ReviewQueue title="Review queue" submissions={submissions} selectedId={selectedId} onSelect={select} now={now} />

        <div ref={panelRef} className="scroll-mt-20">
          {selected ? (
            <EvidencePanel
              submission={selected}
              now={now}
              checks={checks}
              onCheck={(index, value) => setChecks((current) => current.map((item, i) => (i === index ? value : item)))}
              allChecked={allChecked}
              completed={completed}
              onApprove={() => setDialog({ type: "approve" })}
              onReject={() => setDialog({ type: "reject" })}
              onDelete={() => setDialog({ type: "delete" })}
            />
          ) : (
            <Surface className="flex flex-col gap-2 py-10 text-center">
              <h2 className="text-lg font-semibold leading-[27px]">
                {submissions.length === 0 ? "No applications yet" : "You are all caught up"}
              </h2>
              <p className="text-sm leading-[21px] text-muted">
                {submissions.length === 0
                  ? "New account applications will appear here as soon as they are submitted."
                  : "There are no submissions waiting for review."}
              </p>
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
                busy={busy}
                onCancel={close}
                onConfirm={() => perform("Merchant approved", () => approveAction(selected.id))}
              />
            )}
            {dialog.type === "reject" && (
              <RejectDialog
                business={selected.business}
                email={selected.email}
                busy={busy}
                onCancel={close}
                onConfirm={(reasons, custom) => perform("Submission rejected", () => rejectAction(selected.id, reasons, custom))}
              />
            )}
            {dialog.type === "delete" && (
              <DeleteApplicationDialog
                business={selected.business}
                busy={busy}
                onCancel={close}
                onConfirm={() => perform("Record deleted", () => deleteAction(selected.id))}
              />
            )}
          </>
        ) : null}
        {dialog?.type === "result" && (
          <ResultDialog title={dialog.title} message={dialog.message} failed={dialog.failed} onDone={close} />
        )}
      </AdminModal>
    </PageContent>
  );
}

function EvidencePanel({
  submission,
  now,
  checks,
  onCheck,
  allChecked,
  completed,
  onApprove,
  onReject,
  onDelete,
}: {
  submission: Submission;
  now: number;
  checks: boolean[];
  onCheck: (index: number, value: boolean) => void;
  allChecked: boolean;
  completed: number;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  return (
    <Surface className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-xs leading-[18px] text-muted">
          {submission.reference} · Submitted {formatSubmittedOn(submission)}
        </p>
        <StatusPill tone={statusTones[submission.status]}>{statusLabels[submission.status]}</StatusPill>
      </div>

      <div className="flex items-center gap-3">
        <span className="rounded-md bg-sky px-2 py-1 text-xs font-semibold leading-[18px]">{submission.initials}</span>
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
        <div className="flex flex-col gap-[3px]">
          <dt className="text-xs leading-[18px] text-muted">ID type</dt>
          <dd className="text-sm leading-[21px]">{submission.idType}</dd>
        </div>
        <div className="flex flex-col gap-[3px]">
          <dt className="text-xs leading-[18px] text-muted">Phone</dt>
          <dd className="text-sm leading-[21px]">{submission.phone}</dd>
        </div>
        <div className="flex flex-col gap-[3px]">
          <dt className="text-xs leading-[18px] text-muted">Selected plan</dt>
          <dd className="text-sm leading-[21px]">{submission.plan}</dd>
        </div>
        <div className="col-span-2 flex flex-col gap-[3px]">
          <dt className="text-xs leading-[18px] text-muted">Contact email</dt>
          <dd className="break-all text-sm font-semibold leading-[21px]">{submission.email}</dd>
        </div>
      </dl>

      <DecisionBanner submission={submission} now={now} />

      {submission.previousRejections?.length && submission.status === "pending" ? (
        <div className="flex items-start gap-[10px] rounded-lg bg-warn-bg p-3 text-xs leading-[18px] text-warn-fg">
          <Icon name="alert" className="mt-px size-[18px]" />
          <div className="flex flex-col gap-1">
            <p className="font-semibold">
              This email was rejected before ({submission.previousRejections.length}×). Check that the earlier issue is fixed.
            </p>
            {submission.previousRejections.slice(0, 3).map((item) => (
              <p key={item.rejectedAt}>
                {formatDateTime(item.rejectedAt)} — {item.reason}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {submission.archived ? (
        <p className="rounded-lg bg-mist p-3 text-xs leading-[18px] text-muted">
          This is a permanent rejection record. The submitted documents, images and login were deleted when the account was rejected, so the applicant can register again.
        </p>
      ) : (
        <SubmittedDocuments key={submission.id} documents={submission.documents} />
      )}

      {submission.status === "pending" ? (
        <>
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold leading-6">Review checklist</h3>
            <p className="text-xs leading-[18px] text-muted">
              {completed}/{reviewChecks.length} complete
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {reviewChecks.map((label, index) => (
              <Checkbox key={label} checked={checks[index]} onChange={(value) => onCheck(index, value)} label={label} />
            ))}
          </div>
          <p id="approval-hint" className="text-xs leading-[18px] text-muted">
            Complete all checks to approve this merchant.
          </p>
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {submission.status === "pending" ? (
          <>
            <AdminButton disabled={!allChecked} aria-describedby="approval-hint" onClick={onApprove}>
              Approve merchant
            </AdminButton>
            <AdminButton variant="outline" onClick={onReject}>
              Reject
            </AdminButton>
          </>
        ) : null}
        {submission.archived ? null : (
          <AdminButton variant="danger" onClick={onDelete}>
            Delete
          </AdminButton>
        )}
      </div>
    </Surface>
  );
}

const bannerTones = {
  pending: "bg-mist text-muted",
  overdue: "bg-warn-bg text-warn-fg",
  approved: "bg-wash text-success",
  suspended: "bg-danger-bg text-danger-dark",
  rejected: "bg-danger-bg text-danger-dark",
} as const;

function DecisionBanner({ submission, now }: { submission: Submission; now: number }) {
  const { status, note = [] } = submission;
  const overdue = isOverdue(submission, now);
  const tone = status === "pending" ? (overdue ? "overdue" : "pending") : status;
  const waiting = daysWaiting(submission, now);

  return (
    <div className={cn("flex items-start gap-[10px] rounded-lg p-3 text-xs leading-[18px]", bannerTones[tone])}>
      <Icon name="alert" className="mt-px size-[18px]" />
      {status === "pending" ? (
        <p>
          {overdue
            ? `Waiting ${waiting} days. Past the ${REVIEW_TARGET_DAYS}-day review target.`
            : `Waiting ${waiting} ${waiting === 1 ? "day" : "days"}. Within the ${REVIEW_TARGET_DAYS}-day review target.`}
        </p>
      ) : (
        <p>
          {status === "rejected" ? "Rejected" : status === "approved" || status === "suspended" ? "Approved" : statusLabels[status]}
          {submission.decidedAt ? ` on ${formatDateTime(submission.decidedAt)}` : ""}
          {status === "suspended" ? " (currently suspended)" : ""} — {note.join(" ") || "Decision recorded."}
        </p>
      )}
    </div>
  );
}
