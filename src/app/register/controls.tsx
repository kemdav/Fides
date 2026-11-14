"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui";
import { FILE_LIMITS } from "@/lib/registration/options";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Shared bits                                                                */
/* -------------------------------------------------------------------------- */

export const controlClass = (invalid: boolean) =>
  cn(
    "flex h-11 w-full items-center justify-between gap-2 rounded-md border bg-white px-3.5 text-left text-sm text-ink focus-visible:outline-none focus-visible:ring-2",
    invalid ? "border-danger focus-visible:ring-danger/30" : "border-outline/60 hover:border-outline focus-visible:border-burnt focus-visible:ring-burnt/30"
  );

function Svg({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={cn("size-4 shrink-0", className)}>
      {children}
    </svg>
  );
}

export const ChevronDown = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);
const ChevronLeft = () => (
  <Svg>
    <path d="m15 6-6 6 6 6" />
  </Svg>
);
const ChevronRight = () => (
  <Svg>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);
const CalendarIcon = () => (
  <Svg className="size-5 text-glyph">
    <path d="M7 2v3M17 2v3M4 8h16M5 4h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
  </Svg>
);
export const FileIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </Svg>
);
export const UploadIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M12 16V5m0 0-4 4m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
  </Svg>
);
export const CheckCircle = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={cn("size-4 shrink-0", className)}>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.2-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7Z" fill="currentColor" />
  </svg>
);
export const ShieldIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={cn("size-5 shrink-0", className)}>
    <path d="M12 2.5 4.5 5.5v5.8c0 4.4 3 8.4 7.5 10.2 4.5-1.8 7.5-5.8 7.5-10.2V5.5L12 2.5Zm-1.2 13.2-3-3 1.4-1.4 1.6 1.6 4-4 1.4 1.4-5.4 5.4Z" fill="currentColor" />
  </svg>
);

function useOutsideClose(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [open, close, ref]);
}

/* -------------------------------------------------------------------------- */
/* Select (dropdown)                                                          */
/* -------------------------------------------------------------------------- */

export type SelectOption = { value: string; label: string };

export function SelectField({
  id,
  value,
  options,
  onChange,
  invalid = false,
  placeholder = "Select an option",
  className,
  describedBy,
}: {
  id: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  invalid?: boolean;
  placeholder?: string;
  className?: string;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [active, setActive] = useState(Math.max(0, selectedIndex));
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useOutsideClose(open, () => setOpen(false), wrapRef);

  function openList() {
    setActive(Math.max(0, selectedIndex));
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((current) => Math.min(options.length - 1, current + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((current) => Math.max(0, current - 1));
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default: {
        if (event.key.length === 1) {
          const index = options.findIndex((option) => option.label.toLowerCase().startsWith(event.key.toLowerCase()));
          if (index >= 0) setActive(index);
        }
      }
    }
  }

  const current = options[selectedIndex];

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={controlClass(invalid)}
      >
        <span className={cn("truncate", !current && "text-subtle")}>{current?.label ?? placeholder}</span>
        <ChevronDown className={cn("size-5 text-ink transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-60 overflow-auto rounded-md border border-line bg-white py-1 shadow-[0_12px_28px_-10px_rgb(44_58_75/0.35)]"
        >
          {options.map((option, index) => {
            const selected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 px-3.5 py-2 text-sm text-ink",
                  index === active && "bg-mist",
                  selected && "font-semibold text-burnt"
                )}
              >
                {option.label}
                {selected ? <CheckCircle className="size-4 text-burnt" /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Date picker                                                                */
/* -------------------------------------------------------------------------- */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const pad = (value: number) => String(value).padStart(2, "0");
export const toIsoDate = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

function parseIso(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

export function formatDisplayDate(value: string): string {
  const parsed = parseIso(value);
  if (!parsed) return "";
  return `${parsed.d} ${MONTHS[parsed.m].slice(0, 3)} ${parsed.y}`;
}

export function DatePicker({
  id,
  value,
  onChange,
  max,
  minYear = 1900,
  invalid = false,
  placeholder = "Select date",
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Latest selectable date (ISO yyyy-mm-dd). */
  max: string;
  minYear?: number;
  invalid?: boolean;
  placeholder?: string;
  describedBy?: string;
}) {
  const maxParts = parseIso(max) ?? { y: new Date().getFullYear(), m: 11, d: 31 };
  const selected = parseIso(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"days" | "years">("days");
  const [cursor, setCursor] = useState<{ y: number; m: number }>(() => ({ y: (selected ?? maxParts).y, m: (selected ?? maxParts).m }));
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const yearRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = () => {
    setOpen(false);
    setView("days");
  };
  useOutsideClose(open, close, wrapRef);

  useEffect(() => {
    if (open && view === "years") yearRef.current?.scrollIntoView({ block: "center" });
  }, [open, view]);

  function toggle() {
    if (open) return close();
    const base = selected ?? maxParts;
    setCursor({ y: base.y, m: base.m });
    setView("days");
    setOpen(true);
  }

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1).getDay();
    const count = new Date(cursor.y, cursor.m + 1, 0).getDate();
    return [...Array.from({ length: first }, () => null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [cursor]);

  const afterMax = (y: number, m: number, d: number) => y > maxParts.y || (y === maxParts.y && (m > maxParts.m || (m === maxParts.m && d > maxParts.d)));
  const canGoNext = cursor.y < maxParts.y || (cursor.y === maxParts.y && cursor.m < maxParts.m);
  const canGoPrev = cursor.y > minYear || cursor.m > 0;

  function shift(delta: number) {
    setCursor((current) => {
      const date = new Date(current.y, current.m + delta, 1);
      return { y: date.getFullYear(), m: date.getMonth() };
    });
  }

  const years = Array.from({ length: maxParts.y - minYear + 1 }, (_, index) => maxParts.y - index);

  return (
    <div
      ref={wrapRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          close();
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onClick={toggle}
        className={controlClass(invalid)}
      >
        <span className={cn(!value && "text-subtle")}>{value ? formatDisplayDate(value) : placeholder}</span>
        <CalendarIcon />
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Choose date of birth"
          className="absolute left-0 top-[calc(100%+4px)] z-30 w-[288px] rounded-lg border border-line bg-white p-3 shadow-[0_12px_28px_-10px_rgb(44_58_75/0.35)] max-sm:right-0 max-sm:w-auto"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setView((current) => (current === "days" ? "years" : "days"))}
              aria-live="polite"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-ink hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
            >
              {MONTHS[cursor.m]} {cursor.y}
              <ChevronDown className={cn("size-4 transition-transform", view === "years" && "rotate-180")} />
            </button>
            {view === "days" ? (
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Previous month" disabled={!canGoPrev} onClick={() => shift(-1)} className="flex size-8 items-center justify-center rounded-md text-ink hover:bg-mist disabled:opacity-30">
                  <ChevronLeft />
                </button>
                <button type="button" aria-label="Next month" disabled={!canGoNext} onClick={() => shift(1)} className="flex size-8 items-center justify-center rounded-md text-ink hover:bg-mist disabled:opacity-30">
                  <ChevronRight />
                </button>
              </div>
            ) : null}
          </div>

          {view === "years" ? (
            <div role="listbox" aria-label="Year" className="grid max-h-[232px] grid-cols-4 gap-1 overflow-auto pr-1">
              {years.map((year) => {
                const isCurrent = year === cursor.y;
                return (
                  <button
                    key={year}
                    ref={isCurrent ? yearRef : undefined}
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    onClick={() => {
                      setCursor((current) => ({ y: year, m: year === maxParts.y ? Math.min(current.m, maxParts.m) : current.m }));
                      setView("days");
                    }}
                    className={cn("h-9 rounded-md text-sm hover:bg-mist", isCurrent ? "bg-burnt font-semibold text-white hover:bg-burnt" : "text-ink")}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted">
                {WEEKDAYS.map((day) => (
                  <span key={day} className="py-1">
                    {day}
                  </span>
                ))}
              </div>
              <div role="grid" aria-label={`${MONTHS[cursor.m]} ${cursor.y}`} className="grid grid-cols-7 gap-y-0.5 text-center">
                {cells.map((day, index) => {
                  if (day === null) return <span key={`blank-${index}`} />;
                  const disabled = afterMax(cursor.y, cursor.m, day);
                  const isSelected = selected?.y === cursor.y && selected.m === cursor.m && selected.d === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      role="gridcell"
                      disabled={disabled}
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(toIsoDate(cursor.y, cursor.m, day));
                        close();
                        buttonRef.current?.focus();
                      }}
                      className={cn(
                        "mx-auto flex size-9 items-center justify-center rounded-full text-sm",
                        isSelected ? "bg-burnt font-semibold text-white" : "text-ink hover:bg-mist",
                        disabled && "cursor-not-allowed text-line hover:bg-transparent"
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                onChange("");
                close();
              }}
              className="rounded px-2 py-1 text-burnt hover:bg-burnt/10"
            >
              Clear
            </button>
            <button type="button" onClick={close} className="rounded px-2 py-1 text-muted hover:bg-mist">
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

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
        <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide", required ? "bg-danger-bg text-danger" : "bg-mist text-muted")}>
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
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-[#eceff6] px-3 py-2.5">
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
        <span className="text-[11px] text-subtle">PDF, JPG or PNG · max 5 MB</span>
      </button>
      {message ? (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {message}
        </p>
      ) : null}
    </div>
  );
}
