"use client";

import { useCallback, useId, useState } from "react";
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
  const [scanning, setScanning] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const titleId = useId();
  const codeId = useId();
  const router = useRouter();

  const handleScan = useCallback((raw: string) => {
    const parsed = checkInCodeSchema.safeParse(raw);
    setScanning(false);
    if (parsed.success) {
      setCode(parsed.data);
      setError("");
    } else {
      setError("This QR code does not contain an appointment check-in code.");
    }
  }, []);

  function reset() {
    setScanning(true);
    setCode("");
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
    setScanning(false);
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
          <header className="mb-4 flex items-center justify-between gap-2">
            <h2 id={titleId} className="text-lg font-semibold">QR Check In</h2>
            <Button variant="ghost" size="md" disabled={pending} onClick={() => setOpen(false)} aria-label="Close QR check-in">
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
              {scanning ? <QrCamera onScan={handleScan} /> : (
                <Button variant="secondary" size="form" disabled={pending} onClick={reset}>Scan again</Button>
              )}
              <div className="space-y-2">
                <label htmlFor={codeId} className="block text-sm font-semibold">Appointment check-in code</label>
                <input
                  id={codeId}
                  className={inputClasses()}
                  value={code}
                  onChange={(event) => { setCode(event.target.value); setError(""); }}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={pending}
                />
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
