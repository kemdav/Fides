"use client";

import { useId, useRef, useState } from "react";
import { inputClasses, Modal } from "@/components/ui";
import { FILE_LIMITS } from "@/lib/registration/options";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/admin/icon";

/* -------------------------------------------------------------------------- */
/* Shared bits                                                                */
/* -------------------------------------------------------------------------- */

export const controlClass = (invalid: boolean) => cn(inputClasses(invalid), "flex items-center justify-between gap-2 text-left");

export const ChevronDown = ({ className }: { className?: string }) => <Icon name="chevron-down" className={className ?? "size-5"} />;
export const FileIcon = ({ className }: { className?: string }) => <Icon name="document" className={className ?? "size-5"} />;
export const UploadIcon = ({ className }: { className?: string }) => <Icon name="upload" className={className ?? "size-5"} />;
export const CheckCircle = ({ className }: { className?: string }) => <Icon name="check-circle" weight="fill" className={cn("size-4 shrink-0", className)} />;
export const ShieldIcon = ({ className }: { className?: string }) => <Icon name="shield-check" weight="fill" className={cn("size-5 shrink-0", className)} />;

/* -------------------------------------------------------------------------- */
/* Select (dropdown)                                                          */
/* -------------------------------------------------------------------------- */

export { SelectField, type SelectOption } from "@/components/ui/select-field";

export { DatePicker, formatDisplayDate, toIsoDate } from "@/components/ui/date-picker";

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
export function documentFileProblem(file: File, label: string): string | null {
  if (!(FILE_LIMITS.documentTypes as readonly string[]).includes(file.type)) {
    return `${label}: only PDF, JPG or PNG files are accepted.`;
  }
  if (file.size === 0) return `${label}: this file is empty. Please choose another file.`;
  if (file.size > FILE_LIMITS.documentBytes) {
    return `${label}: the file is ${formatBytes(file.size)}. The maximum size is ${Math.round(FILE_LIMITS.documentBytes / (1024 * 1024))} MB.`;
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
    <Modal open={open} onClose={onClose} unstyled labelledBy="file-preview-title" className="w-[min(56rem,calc(100vw-2rem))] max-w-none rounded-xl bg-white p-0 shadow-2xl">
      {file && url ? (
        <div className="flex max-h-[88dvh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 id="file-preview-title" className="truncate text-base font-semibold text-ink">
                {title}
              </h2>
              <p className="truncate text-xs text-muted">
                {file.name} · {formatBytes(file.size)} · {fileKind(file)}
              </p>
            </div>
            <button type="button" onClick={onClose} className="shrink-0 rounded-md border border-outline/60 px-3 py-1.5 text-sm font-semibold text-ink hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40">
              Close
            </button>
          </header>
          <div className="min-h-[300px] flex-1 overflow-auto bg-mist p-3">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={`Preview of ${file.name}`} className="mx-auto max-h-[70dvh] w-auto max-w-full rounded-md object-contain" />
            ) : (
              <iframe src={url} title={`Preview of ${file.name}`} className="h-[70dvh] w-full rounded-md bg-white" />
            )}
          </div>
          <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs text-muted">
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
  required,
  file,
  error,
  onFile,
  onRemove,
  onPreview,
}: {
  title: string;
  hint: string;
  required: boolean;
  file: File | null;
  error?: string;
  /** Called with a validated file; returns an error message when it is rejected. */
  onFile: (file: File) => string | null;
  onRemove: () => void;
  onPreview: (file: File) => void;
}) {
  const [localError, setLocalError] = useState<string | null>(null);
  const message = localError ?? error;
  const picker = useFileInput((picked) => setLocalError(onFile(picked)));
  const errorId = useId();

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-[0_8px_24px_-12px_rgb(44_58_75/0.15)]",
        message ? "border-danger" : file ? "border-success/40" : "border-line"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("flex size-9 items-center justify-center rounded-lg", file ? "bg-wash text-success" : "bg-mist text-glyph")}>
          <FileIcon className="size-5" />
        </span>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide", required ? "bg-danger-bg text-danger" : "bg-mist text-muted")}>
          {required ? "REQUIRED" : "OPTIONAL"}
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-subtle">{hint}</p>
      </div>

      {picker.input(`Upload ${title}`)}

      {file ? (
        <div className="rounded-lg border border-success/60 bg-wash p-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle className="mt-0.5 size-5 text-success" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-success-deep" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-success">
                {formatBytes(file.size)} · {fileKind(file)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => onPreview(file)} className="h-8 rounded-md border border-success/50 bg-white px-3 text-xs font-semibold text-success-deep hover:bg-success/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/40">
              Preview
            </button>
            <button type="button" onClick={picker.open} className="h-8 rounded-md border border-ink/60 bg-white px-3 text-xs font-semibold text-ink hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40">
              Replace
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalError(null);
                onRemove();
              }}
              className="h-8 rounded-md px-2 text-xs font-semibold text-danger hover:bg-danger-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={picker.open}
          aria-describedby={message ? errorId : undefined}
          data-invalid={message ? "true" : undefined}
          className={cn(
            "flex h-11 w-full items-center justify-center gap-2 rounded-lg border bg-white text-sm font-semibold transition-colors hover:border-burnt hover:bg-burnt/5 hover:text-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40",
            message ? "border-danger text-danger" : "border-outline/50 text-muted"
          )}
        >
          <UploadIcon />
          Upload File
        </button>
      )}

      {message ? (
        <p id={errorId} role="alert" className="text-xs text-danger">
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
  label,
  file,
  error,
  onFile,
  onRemove,
  onPreview,
}: {
  label: string;
  file: File | null;
  error?: string;
  onFile: (file: File) => string | null;
  onRemove: () => void;
  onPreview: (file: File) => void;
}) {
  const [localError, setLocalError] = useState<string | null>(null);
  const message = localError ?? error;
  const picker = useFileInput((picked) => setLocalError(onFile(picked)));
  const errorId = useId();

  return (
    <div className="flex flex-col gap-2">
      {picker.input(label)}
      {file ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-mist px-3 py-2.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-wash text-success">
            <ShieldIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink" title={file.name}>
              {file.name}
            </p>
            <p className="flex items-center gap-1 text-xs text-success">
              <CheckCircle className="size-3.5" /> Uploaded · {formatBytes(file.size)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs font-semibold">
            <button type="button" onClick={() => onPreview(file)} className="text-ink hover:underline">
              Preview
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalError(null);
                onRemove();
              }}
              className="text-burnt hover:underline"
            >
              Remove
            </button>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={picker.open}
        aria-describedby={message ? errorId : undefined}
        data-invalid={message ? "true" : undefined}
        className={cn(
          "flex w-full flex-col items-center gap-0.5 rounded-lg border border-dashed px-4 py-4 text-sm text-muted transition-colors hover:border-burnt hover:bg-burnt/5 hover:text-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40",
          message ? "border-danger" : "border-outline/60"
        )}
      >
        <span className="font-medium">{file ? "Upload a different file" : "Upload File"}</span>
        <span className="text-xs text-subtle">PDF, JPG or PNG · max 5 MB</span>
      </button>
      {message ? (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {message}
        </p>
      ) : null}
    </div>
  );
}
