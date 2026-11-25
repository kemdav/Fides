"use client";

import { useId, useRef, useState } from "react";
import { Icon } from "@/components/admin/icon";
import { Modal } from "@/components/ui";
import { FILE_LIMITS } from "@/lib/registration/options";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* File helpers                                                               */
/* -------------------------------------------------------------------------- */

const urlCache = new WeakMap<File, string>();

/** One object URL per File, created lazily and released when the file is dropped. */
export function getObjectUrl(file: File): string {
  let url = urlCache.get(file);
  if (!url) {
    url = URL.createObjectURL(file);
    urlCache.set(file, url);
  }
  return url;
}

export function releaseObjectUrl(file: File | null | undefined) {
  if (!file) return;
  const url = urlCache.get(file);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(file);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileKind(file: { type: string; name?: string }): string {
  if (file.type === "application/pdf") return "PDF";
  if (file.type === "image/png") return "PNG";
  if (file.type === "image/jpeg") return "JPG";
  return (file.name?.split(".").pop() ?? "FILE").toUpperCase();
}

/** Returns a user-facing error message, or null when the file is acceptable. */
export function documentFileProblem(file: File, label: string, maxBytes: number = FILE_LIMITS.documentBytes): string | null {
  if (!(FILE_LIMITS.documentTypes as readonly string[]).includes(file.type)) {
    return `${label}: only PDF, JPG or PNG files are accepted.`;
  }
  if (file.size === 0) return `${label}: this file is empty. Please choose another file.`;
  if (file.size > maxBytes) {
    return `${label}: the file is ${formatBytes(file.size)}. The maximum size is ${Math.round(maxBytes / (1024 * 1024))} MB.`;
  }
  return null;
}

const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

/** Hidden file input + a trigger function. Re-picking the same file works. */
function useFileInput(onPick: (file: File) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const input = (label: string) => (
    <input
      ref={ref}
      type="file"
      accept={ACCEPT}
      className="sr-only"
      tabIndex={-1}
      aria-label={label}
      onChange={(event) => {
        const picked = event.target.files?.[0];
        event.target.value = "";
        if (picked) onPick(picked);
      }}
    />
  );
  return { input, open: () => ref.current?.click() };
}

/* -------------------------------------------------------------------------- */
/* Preview dialog                                                             */
/* -------------------------------------------------------------------------- */

export function FilePreviewDialog({ file, title, onClose }: { file: File | null; title: string; onClose: () => void }) {
  const open = file !== null;
  const url = file ? getObjectUrl(file) : null;
  const isImage = file?.type.startsWith("image/");
  return (
    <Modal open={open} onClose={onClose} unstyled labelledBy="file-preview-title" className="fixed inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[min(56rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-xl bg-white p-0 shadow-2xl">
      {file && url ? (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 id="file-preview-title" className="truncate text-base font-semibold text-ink">
                {title}
              </h2>
              <p className="truncate text-sm text-muted">
                {file.name} · {formatBytes(file.size)} · {fileKind(file)}
              </p>
            </div>
            <button type="button" onClick={onClose} className="shrink-0 rounded-md border border-outline/60 px-3 py-1.5 text-base font-semibold text-ink hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40">
              <Icon name="close" className="size-4" />
              <span className="sr-only">Close preview</span>
            </button>
          </header>
          <div className="grid min-h-0 flex-1 place-items-center overflow-auto bg-mist p-3">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={`Preview of ${file.name}`} className="mx-auto max-h-[70dvh] w-auto max-w-full rounded-md object-contain" />
            ) : (
              <iframe src={url} title={`Preview of ${file.name}`} className="h-[70dvh] w-full rounded-md bg-white" />
            )}
          </div>
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm text-muted">
            <span>Preview shown on this device only.</span>
            <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-burnt hover:underline">
              Open in new tab
            </a>
          </footer>
        </div>
      ) : null}
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Document card (Document Requirements step)                                 */
/* -------------------------------------------------------------------------- */

export function DocumentCard({
  title,
  hint,
  file,
  error,
  uploaded,
  progress,
  onFile,
  onRemove,
  onPreview,
}: {
  title: string;
  hint: string;
  file: File | null;
  error?: string;
  uploaded: boolean;
  progress?: number;
  /** Called with a validated file; returns an error message when it is rejected. */
  onFile: (file: File) => string | null;
  onRemove: () => void;
  onPreview: (file: File) => void;
}) {
  const [localError, setLocalError] = useState<string | null>(null);
  const message = localError ?? error;
  const picker = useFileInput((picked) => setLocalError(onFile(picked)));
  const errorId = useId();

  const added = !!file && !message;
  const fileAction = "grid size-11 shrink-0 place-items-center rounded-md text-muted hover:bg-white focus-visible:outline-2 focus-visible:outline-burnt";

  return (
    <div
      className={cn(
        "group flex min-w-0 flex-col gap-4 rounded-[20px] border-2 bg-white p-5 transition-colors motion-reduce:transition-none",
        message ? "border-danger" : added ? "border-success" : "border-line hover:border-burnt/50",
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn("grid h-14 w-10 shrink-0 place-items-center rounded-md transition-colors", added
          ? "bg-wash text-success"
          : "bg-mist text-glyph group-hover:bg-burnt/15 group-hover:text-burnt")}>
          <Icon name="file" weight="fill" className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-ink">{title}</p>
          <p className="text-sm text-subtle">{hint}</p>
        </div>
      </div>

      {picker.input(`Upload ${title}`)}

      {file ? (
        <div className="mt-auto flex h-14 min-w-0 shrink-0 items-center gap-1 rounded-lg border border-line bg-hairline p-1">
          <button type="button" onClick={() => onPreview(file)} aria-label={`Preview ${file.name}`}
            title={`Preview ${file.name}`}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left hover:bg-white focus-visible:outline-2 focus-visible:outline-burnt">
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-wash text-success">
              <Icon name="eye" className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{file.name}</span>
              <span className={cn("block truncate text-xs", uploaded ? "text-success-deep" : "text-muted")}>
                {uploaded ? "Uploaded ? " : ""}{formatBytes(file.size)}
              </span>
            </span>
          </button>
          <button type="button" onClick={picker.open} aria-label={`Replace ${title}`} title="Replace file" className={fileAction}>
            <Icon name="upload" className="size-4" />
          </button>
          <button type="button" aria-label={`Remove ${title}`} title="Remove file"
            onClick={() => {
              setLocalError(null);
              onRemove();
            }}
            className={cn(fileAction, "hover:text-danger")}>
            <Icon name="trash" className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={picker.open}
          aria-describedby={message ? errorId : undefined}
          data-invalid={message ? "true" : undefined}
          className={cn(
            "mt-auto flex h-14 w-full shrink-0 items-center justify-center gap-2 rounded-lg border bg-white text-base font-semibold transition-colors group-hover:border-burnt group-hover:bg-burnt group-hover:text-white focus-visible:border-burnt focus-visible:bg-burnt focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40",
            message ? "border-danger text-danger" : "border-outline/50 text-muted",
          )}
        >
          <Icon name="upload" className="size-5" />
          Upload File
        </button>
      )}

      {progress !== undefined && (
        <progress aria-label={`${title} upload progress`} value={progress} max={100} className="h-2 w-full accent-burnt" />
      )}

      {message ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {message}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Government ID upload (Identity step, Figma "uploaded" row + dashed box)    */
/* -------------------------------------------------------------------------- */

export function IdUpload({
  label, side, file, error, onFile, onRemove, onPreview,
}: {
  label: string;
  side: "Front" | "Back";
  file: File | null;
  error?: string;
  onFile: (file: File) => string | null;
  onRemove: () => void;
  onPreview: (file: File) => void;
}) {
  const [localError, setLocalError] = useState<string | null>(null);
  const message = localError ?? error;
  const picker = useFileInput((picked) => setLocalError(onFile(picked)));
  const labelId = useId();
  const errorId = useId();
  const url = file ? getObjectUrl(file) : null;
  const focusClasses = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40";

  return (
    <section aria-labelledby={labelId} className="grid gap-2">
      <h2 id={labelId} className="text-sm font-semibold text-body">
        {label} <span className="text-danger" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
      </h2>
      <div className="grid items-start gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          {picker.input("Choose file for " + label)}
          {file ? (
            <div className="flex items-center gap-3 rounded-lg border border-line bg-mist p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-wash text-success">
                <Icon name="file" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink" title={file.name}>{file.name}</p>
                <p className="flex items-center gap-1 text-xs text-success-deep">
                  <Icon name="check" weight="bold" className="size-3.5" /> Selected &middot; {formatBytes(file.size)}
                </p>
              </div>
              <button type="button" aria-label={"Remove " + label} onClick={() => { setLocalError(null); onRemove(); }}
                className={cn("min-h-9 rounded-md px-1.5 text-sm font-semibold text-burnt hover:underline", focusClasses)}>
                Remove
              </button>
            </div>
          ) : (
            <button type="button" onClick={picker.open} aria-label={"Choose file for " + label}
              aria-describedby={message ? errorId : undefined} data-invalid={message ? "true" : undefined}
              className={cn("flex min-h-[220px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-white p-4 text-sm text-muted hover:border-burnt hover:bg-burnt/5",
                message ? "border-danger" : "border-outline", focusClasses)}>
              <span className="rounded-full bg-burnt px-4 py-2 font-semibold text-white">Choose File</span>
              <span>PDF, JPG or PNG &middot; max {FILE_LIMITS.identityDocumentBytes / (1024 * 1024)} MB</span>
            </button>
          )}
          {message && <p id={errorId} role="alert" className="mt-2 text-sm text-danger">{message}</p>}
        </div>

        <div className="min-w-0 rounded-lg bg-[#d9dee4] p-3 text-center">
          <p className="mb-2 text-xs font-semibold text-body">ID {side.toLowerCase()} preview</p>
          <div className="relative grid aspect-[16/9] place-items-center overflow-hidden rounded-lg border border-outline bg-mist">
            {file && url ? (file.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={label + " preview"} className="absolute inset-0 size-full object-contain object-center" />
            ) : (
              <iframe src={url + "#toolbar=0&navpanes=0&view=Fit"} title={label + " preview"} tabIndex={-1} className="pointer-events-none absolute inset-0 size-full bg-white" />
            )) : <span className="text-sm text-muted">No file selected</span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
            {!file && <span className="text-body">Choose an ID file</span>}
            {file && <button type="button" onClick={() => onPreview(file)}
              aria-label={"Open " + label + " preview"} className={cn("rounded font-semibold text-burnt-dark hover:underline", focusClasses)}>Open preview</button>}
          </div>
        </div>
      </div>
    </section>
  );
}
