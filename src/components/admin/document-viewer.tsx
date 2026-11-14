"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { documentLinkAction } from "@/app/(admin)/admin/actions";
import type { SubmissionDocument } from "@/lib/admin/verification";
import { cn } from "@/lib/utils";
import { AdminButton } from "./admin-button";
import { AdminModal } from "./admin-modal";
import { Icon } from "./icon";
import { StatusPill } from "./primitives";
import { DIALOG_TITLE_ID, dialogSurface } from "./verification-dialogs";

type Viewer = { index: number };
type LinkState =
  | { status: "loading" }
  | { status: "ready"; url: string; mimeType: string; fileName: string }
  | { status: "error"; message: string };

function formatUploaded(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * "Submitted documents" section of the verification panel.
 * Lists all required documents (uploaded or missing) and lets the administrator
 * preview each file in a viewer, open it in a new tab, or download it.
 * Files live in a private bucket; every action requests a fresh 5-minute signed link.
 */
export function SubmittedDocuments({ documents }: { documents: SubmissionDocument[] }) {
  const uploaded = useMemo(() => documents.filter((doc) => doc.status === "uploaded" && doc.id), [documents]);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [link, setLink] = useState<LinkState>({ status: "loading" });
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const requestRef = useRef(0);

  const current = viewer ? uploaded[viewer.index] : null;
  const missing = documents.filter((doc) => doc.required && doc.status === "missing").length;

  const load = useCallback(async (doc: SubmissionDocument) => {
    const request = ++requestRef.current;
    setLink({ status: "loading" });
    const result = await documentLinkAction(doc.id as string, false);
    if (request !== requestRef.current) return;
    setLink(result.ok ? { status: "ready", url: result.url, mimeType: result.mimeType, fileName: result.fileName } : { status: "error", message: result.error });
  }, []);

  useEffect(() => {
    if (current) void load(current);
  }, [current, load]);

  function open(doc: SubmissionDocument) {
    const index = uploaded.findIndex((item) => item.id === doc.id);
    if (index >= 0) setViewer({ index });
  }

  function close() {
    requestRef.current += 1;
    setViewer(null);
  }

  async function download(doc: SubmissionDocument) {
    if (!doc.id) return;
    setDownloadError(null);
    setBusyId(doc.id);
    const result = await documentLinkAction(doc.id, true);
    setBusyId(null);
    if (!result.ok) {
      setDownloadError(`${doc.label}: ${result.error}`);
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = result.url;
    anchor.download = result.fileName;
    anchor.rel = "noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-base font-semibold leading-6">Submitted documents</h3>
        <p className="text-xs leading-[18px] text-muted">
          {uploaded.length} of {documents.filter((doc) => doc.required).length} required uploaded
        </p>
        {missing > 0 ? <StatusPill tone="danger">{missing} missing</StatusPill> : null}
      </div>

      {downloadError ? (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger-dark">
          {downloadError}
        </p>
      ) : null}

      <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line">
        {documents.map((doc) => {
          const isUploaded = doc.status === "uploaded" && !!doc.id;
          return (
            <li key={doc.key} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md", isUploaded ? "bg-wash text-success" : "bg-danger-bg text-danger-dark")}>
                  <Icon name="alert" className="size-4" />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold leading-5">
                    {doc.label}
                    {doc.required ? <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted">REQUIRED</span> : null}
                  </p>
                  {isUploaded ? (
                    <>
                      <p className="truncate text-xs leading-[18px] text-body" title={doc.fileName ?? undefined}>
                        {doc.fileName}
                      </p>
                      <p className="text-xs leading-[18px] text-muted">
                        {doc.meta}
                        {doc.uploadedAt ? ` · Uploaded ${formatUploaded(doc.uploadedAt)}` : ""}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs leading-[18px] text-danger-dark">Not uploaded by the applicant.</p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                <StatusPill tone={isUploaded ? "success" : "danger"}>{isUploaded ? "Uploaded" : "Missing"}</StatusPill>
                <AdminButton variant="outline" size="xs" disabled={!isUploaded} onClick={() => open(doc)} aria-label={`View ${doc.label}`}>
                  View
                </AdminButton>
                <AdminButton variant="outline" size="xs" disabled={!isUploaded || busyId === doc.id} onClick={() => download(doc)} aria-label={`Download ${doc.label}`}>
                  {busyId === doc.id ? "Preparing…" : "Download"}
                </AdminButton>
              </div>
            </li>
          );
        })}
      </ul>

      <AdminModal xwide open={viewer !== null} onClose={close}>
        {current ? (
          <div className={cn(dialogSurface, "flex flex-col")}>
            <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <h2 id={DIALOG_TITLE_ID} className="truncate text-lg font-semibold leading-[27px]">
                  {current.label}
                </h2>
                <p className="truncate text-xs leading-[18px] text-muted">
                  {current.fileName} · {current.meta}
                  {current.uploadedAt ? ` · Uploaded ${formatUploaded(current.uploadedAt)}` : ""}
                </p>
              </div>
              <AdminButton variant="outline" size="xs" onClick={close}>
                Close
              </AdminButton>
            </header>

            <div className="min-h-[320px] bg-mist p-3">
              {link.status === "loading" ? (
                <p role="status" className="flex h-[320px] items-center justify-center text-sm text-muted">
                  Loading document…
                </p>
              ) : link.status === "error" ? (
                <div role="alert" className="flex h-[320px] flex-col items-center justify-center gap-3 text-center">
                  <p className="text-sm text-danger-dark">{link.message}</p>
                  <AdminButton variant="outline" size="xs" onClick={() => void load(current)}>
                    Try again
                  </AdminButton>
                </div>
              ) : link.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={link.url} alt={`${current.label}: ${link.fileName}`} className="mx-auto max-h-[68dvh] w-auto max-w-full rounded-md bg-white object-contain" />
              ) : (
                <iframe src={link.url} title={`${current.label}: ${link.fileName}`} className="h-[68dvh] w-full rounded-md bg-white" />
              )}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
              <div className="flex items-center gap-2">
                <AdminButton variant="outline" size="xs" disabled={viewer!.index === 0} onClick={() => setViewer({ index: viewer!.index - 1 })}>
                  ← Previous
                </AdminButton>
                <span className="text-xs text-muted" aria-live="polite">
                  {viewer!.index + 1} of {uploaded.length}
                </span>
                <AdminButton variant="outline" size="xs" disabled={viewer!.index >= uploaded.length - 1} onClick={() => setViewer({ index: viewer!.index + 1 })}>
                  Next →
                </AdminButton>
              </div>
              <div className="flex items-center gap-3 text-sm font-semibold">
                {link.status === "ready" ? (
                  <a href={link.url} target="_blank" rel="noreferrer" className="text-burnt hover:underline">
                    Open in new tab
                  </a>
                ) : null}
                <AdminButton size="xs" disabled={busyId === current.id} onClick={() => download(current)}>
                  {busyId === current.id ? "Preparing…" : "Download"}
                </AdminButton>
              </div>
            </footer>
          </div>
        ) : null}
      </AdminModal>
    </>
  );
}
