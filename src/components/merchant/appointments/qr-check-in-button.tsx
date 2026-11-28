"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import { verifyCheckInCodeAction } from "@/app/actions/check-in";
import { Icon } from "@/components/admin/icon";
import { AppointmentDetailsModal } from "@/components/merchant/overview/appointment-details-modal";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { checkInCodeSchema } from "@/features/check-in/schema";
import { QrCamera } from "./qr-camera";

type Step = "code" | "confirm" | "done";

export function QrCheckInButton({
  tenantId,
}: {
  tenantId: string;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<"scanning" | "manual">(
    "scanning",
  );
  const [code, setCode] = useState("");
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<Step>("code");
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const titleId = useId();
  const codeId = useId();
  const hintId = useId();
  const codeInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    if (step === "code" && cameraMode === "manual") codeInput.current?.focus();
  }, [open, cameraMode, step]);

  const handleScan = useCallback((raw: string) => {
    if (codeInput.current?.value.trim()) return;

    const parsed = checkInCodeSchema.safeParse(raw);
    if (parsed.success) {
      setCameraMode("manual");
      setCode(parsed.data);
      setScanned(true);
      setError("");
    } else {
      setError(
        "This QR code does not contain an appointment check-in code.",
      );
    }
  }, []);

  function reset() {
    setCameraMode("scanning");
    setCode("");
    setScanned(false);
    setError("");
    setStep("code");
    setAppointmentId(null);
  }

  // step 1: verify code and fetch appointment details
  async function verifyCode() {
    const parsed = checkInCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError("Enter the full appointment check-in code.");
      return;
    }

    setPending(true);
    setError("");
    try {
      const result = await verifyCheckInCodeAction({
        tenantId,
        code: parsed.data,
      });
      if (result.success && result.data) {
        setAppointmentId(result.data.id);
        setStep("confirm");
      } else {
        setError(
          !result.success
            ? result.error
            : "No appointment found.",
        );
      }
    } catch {
      setError("Could not verify the check-in code. Try again.");
    } finally {
      setPending(false);
    }
  }

  function goBack() {
    setStep("code");
    setAppointmentId(null);
    setError("");
  }

  return (
    <>
      <Button
        variant="brand-outline"
        size="form"
        aria-haspopup="dialog"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <Icon name="qr-code" className="size-5" />
        QR Check In
      </Button>
      {open && step === "confirm" && appointmentId ? (
        <AppointmentDetailsModal
          tenantId={tenantId}
          appointmentId={appointmentId}
          onClose={() => setOpen(false)}
          onUpdated={() => router.refresh()}
          checkInFlow={{
            onBack: goBack,
            onCheckedIn: () => setStep("done"),
          }}
        />
      ) : open && (
        <Modal
          open
          onClose={() => {
            if (!pending) setOpen(false);
          }}
          labelledBy={titleId}
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        >
          <header className="mb-4 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="font-display text-[26px] leading-[34px] text-ink"
              >
                QR Check In
              </h2>
              {step === "code" && (
                <p className="mt-1 text-xs text-muted">
                  Scan the QR code or type the check-in code.
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="md"
              className="shrink-0"
              disabled={pending}
              onClick={() => setOpen(false)}
              aria-label="Close QR check-in"
            >
              <Icon name="close" className="size-5" />
            </Button>
          </header>

          {/* ── Step 1: Code entry ───────────────────────────────────── */}
          {step === "code" && (
            <form
              className="space-y-4"
              aria-busy={pending}
              onSubmit={(event) => {
                event.preventDefault();
                if (!pending) void verifyCode();
              }}
            >
              {cameraMode === "scanning" && <QrCamera onScan={handleScan} />}
              {scanned && (
                <p
                  role="status"
                  className="rounded-lg bg-success/10 p-3 text-sm text-ink"
                >
                  QR code scanned. Click Verify Code to continue.
                </p>
              )}
              {cameraMode === "scanning" && (
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-hairline" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    or enter manually
                  </span>
                  <span className="h-px flex-1 bg-hairline" />
                </div>
              )}
              <div className="space-y-2">
                <label
                  htmlFor={codeId}
                  className="block text-sm font-semibold"
                >
                  Appointment check-in code
                </label>
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
                <p id={hintId} className="text-sm text-muted">
                  You can find the full code in Appointment Details.
                </p>
              </div>
              {error && (
                <p role="alert" className="text-sm text-danger-dark">
                  {error}
                </p>
              )}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="brand"
                  size="form"
                  disabled={pending || !code.trim()}
                >
                  Verify Code
                </Button>
              </div>
            </form>
          )}

          {step === "done" && (
            <div className="space-y-4">
              <p
                role="status"
                className="rounded-lg bg-success/10 p-3 text-sm text-success"
              >
                Appointment checked in successfully.
              </p>
              <Button variant="brand" size="form" onClick={reset}>
                Check in another appointment
              </Button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
