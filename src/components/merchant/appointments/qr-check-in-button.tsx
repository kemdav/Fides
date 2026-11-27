"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import { checkInAppointmentAction } from "@/app/actions/check-in";
import { Icon } from "@/components/admin/icon";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { checkInCodeSchema } from "@/features/check-in/schema";
import { QrCamera } from "./qr-camera";

export function QrCheckInButton({ tenantId }: { tenantId: string }): ReactElement {
  const [open, setOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<"scanning" | "manual">("scanning");
  const [code, setCode] = useState("");
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const titleId = useId();
  const codeId = useId();
  const hintId = useId();
  const codeInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open && cameraMode === "manual") codeInput.current?.focus();
  }, [open, cameraMode]);

  const handleScan = useCallback((raw: string) => {
    if (codeInput.current?.value.trim()) return;

    const parsed = checkInCodeSchema.safeParse(raw);
    if (parsed.success) {
      setCameraMode("manual");
      setCode(parsed.data);
      setScanned(true);
      setError("");
    } else {
      setError("This QR code does not contain an appointment check-in code.");
    }
  }, []);

  function reset() {
    setCameraMode("scanning");
    setCode("");
    setScanned(false);
    setError("");
    setSuccess("");
  }

  async function submit() {
    const parsed = checkInCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError("Enter the full appointment check-in code.");
      return;
    }

    setPending(true);
    setError("");
    try {
      const result = await checkInAppointmentAction({ tenantId, code: parsed.data });
      if (result.success) {
        setSuccess(result.message);
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError("The appointment could not be checked in. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="brand-outline" size="form" aria-haspopup="dialog" onClick={() => { reset(); setOpen(true); }}>
        <Icon name="qr-code" className="size-5" />
        QR Check In
      </Button>
      {open && (
        <Modal open onClose={() => { if (!pending) setOpen(false); }} labelledBy={titleId} className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <header className="mb-4 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-[26px] leading-[34px] text-ink">QR Check In</h2>
              {!success && <p className="mt-1 text-xs text-muted">Scan the QR code or type the check-in code.</p>}
            </div>
            <Button variant="ghost" size="md" className="shrink-0" disabled={pending} onClick={() => setOpen(false)} aria-label="Close QR check-in">
              <Icon name="close" className="size-5" />
            </Button>
          </header>
          {success ? (
            <div className="space-y-4">
              <p role="status" className="rounded-lg bg-success/10 p-3 text-sm text-success">{success}</p>
              <Button variant="brand" size="form" onClick={reset}>Check in another appointment</Button>
            </div>
          ) : (
            <form className="space-y-4" aria-busy={pending} onSubmit={(event) => { event.preventDefault(); if (!pending) void submit(); }}>
              {cameraMode === "scanning" && <QrCamera onScan={handleScan} />}
              {scanned && <p role="status" className="rounded-lg bg-success/10 p-3 text-sm text-ink">QR code scanned. Select Check In to confirm.</p>}
              <div className="space-y-2">
                <label htmlFor={codeId} className="block text-sm font-semibold">Appointment check-in code</label>
                <input
                  ref={codeInput}
                  id={codeId}
                  className={inputClasses(Boolean(error))}
                  aria-invalid={Boolean(error)}
                  aria-describedby={hintId}
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value);
                    setScanned(false);
                    setError("");
                  }}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={pending}
                />
                <p id={hintId} className="text-sm text-muted">You can find the full code in Appointment Details.</p>
              </div>
              {error && <p role="alert" className="text-sm text-danger-dark">{error}</p>}
              <Button type="submit" variant="brand" size="form" disabled={pending || !code.trim()}>
                {pending ? "Checking in…" : "Check In"}
              </Button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
