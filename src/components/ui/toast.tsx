"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";

export interface ToastMessage {
  id: string;
  type: "error" | "success" | "warning" | "info";
  title: string;
  description?: string;
}

/**
 * Global Toast Listener Component.
 *
 * Automatically monitors URL query parameters specifically for toast events:
 * - `?toast=access_denied&toast_message=...`
 * - `?toast=success&toast_message=...`
 *
 * Page alerts (like ?error= and ?message=) are handled directly by page components.
 * Dedupes events with a ref and auto-dismisses after 4 seconds.
 */
export function ToastListener() {
  const searchParams = useSearchParams();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const toastType = searchParams.get("toast");
    const toastMsg = searchParams.get("toast_message");

    // Only trigger when an explicit ?toast= parameter is provided
    if (toastType) {
      const key = `${toastType}:${toastMsg || ""}`;
      if (handledRef.current === key) {
        return;
      }
      handledRef.current = key;

      const isDenied = toastType === "access_denied";
      const newId = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = {
        id: newId,
        type: isDenied ? "error" : toastType === "success" ? "success" : "info",
        title: isDenied
          ? "Access Denied"
          : toastType === "success"
            ? "Success"
            : "Notification",
        description:
          toastMsg ||
          (isDenied
            ? "You do not have permission to view this page."
            : undefined),
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newId));
      }, 4000);

      // Clean URL parameters without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete("toast");
      url.searchParams.delete("toast_message");
      window.history.replaceState(
        {},
        "",
        url.pathname + (url.search ? url.search : ""),
      );

      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-lg border text-sm transition-all animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === "error"
              ? "bg-red-950/90 border-red-800 text-red-100"
              : "bg-neutral-900/90 border-neutral-700 text-neutral-100"
          }`}
        >
          <div className="flex-1">
            <h4 className="font-semibold">{toast.title}</h4>
            {toast.description && (
              <p className="mt-1 text-xs opacity-90">{toast.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="text-xs opacity-60 hover:opacity-100 cursor-pointer p-1"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
