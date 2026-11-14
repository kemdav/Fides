"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { PendingSummary } from "@/lib/applications/service";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

const SEEN_KEY = "fides-admin-seen-pending";
const REFRESH_MS = 30_000;

function readSeen(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-200)));
  } catch {
    // Storage can be unavailable; the dot then simply reappears on the next visit.
  }
}

function ago(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

/**
 * Top-right bell. The dot shows while there are pending accounts the admin has not yet looked at;
 * opening the list marks them as seen. Clicking an entry opens it in the verification (approve/reject) page.
 */
export function NotificationBell({ pending, poll = false }: { pending: PendingSummary; poll?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string[] | null>(null);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSeen(readSeen());
  }, []);

  // Pick up newly submitted accounts without a manual reload.
  useEffect(() => {
    if (!poll) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [poll, router]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const onClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const hasNew = seen !== null && pending.items.some((item) => !seen.includes(item.id));

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && pending.items.length) {
      const merged = [...new Set([...(seen ?? []), ...pending.items.map((item) => item.id)])];
      setSeen(merged);
      writeSeen(merged);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={hasNew ? `Notifications, ${pending.count} pending` : "Notifications"}
        className="relative flex size-11 items-center justify-center rounded-lg text-burnt transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
      >
        <Icon name="bell" weight="fill" className="size-6" />
        {hasNew ? <span aria-hidden className="absolute right-2.5 top-2.5 size-2.5 rounded-full bg-danger ring-2 ring-white" /> : null}
      </button>

      <div
        id={panelId}
        role="region"
        aria-label="Pending accounts"
        hidden={!open}
        className="absolute right-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-[10px] border border-line bg-white shadow-[0_8px_30px_rgb(44_58_75/0.16)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p className="text-sm font-semibold">Pending review</p>
          <span className="rounded-full bg-wash px-2.5 py-0.5 text-[11px] font-semibold">{pending.count}</span>
        </div>
        {pending.items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">No accounts are waiting for review.</p>
        ) : (
          <ul className="max-h-[320px] overflow-y-auto">
            {pending.items.map((item) => (
              <li key={item.id} className="border-b border-line last:border-b-0">
                <Link
                  href={`/admin/verification?submission=${item.id}`}
                  onClick={() => setOpen(false)}
                  className={cn("flex flex-col gap-0.5 px-4 py-3 transition-colors hover:bg-mist focus-visible:bg-mist focus-visible:outline-none")}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold">{item.business}</span>
                    <span className="shrink-0 text-[11px] text-muted">{ago(item.submittedAt)}</span>
                  </span>
                  <span className="truncate text-xs text-muted">
                    {item.owner} · {item.plan} plan
                  </span>
                  <span className="text-xs font-semibold text-burnt">Review &amp; approve →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {pending.count > pending.items.length ? (
          <Link
            href="/admin/verification"
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-3 text-center text-sm font-semibold text-burnt hover:bg-mist"
          >
            View all {pending.count} pending
          </Link>
        ) : null}
      </div>
    </div>
  );
}
