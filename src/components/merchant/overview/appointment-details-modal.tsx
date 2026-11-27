"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { loadAppointmentDetailsAction, rescheduleAppointmentAction, updateAppointmentStatusAction } from "@/app/actions/appointments";
import { Icon } from "@/components/admin/icon";
import { AppointmentCheckInCode } from "@/components/merchant/appointments/appointment-check-in-code";
import { StatusPill } from "@/components/admin/primitives";
import { StaffSuccessDialog, type StaffSuccessDetails } from "@/components/merchant/staff/staff-confirmation-dialog";
import { DatePicker, SelectField, type SelectOption } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { getInitials } from "@/lib/utils";

type AppointmentDetails = NonNullable<Awaited<ReturnType<typeof loadAppointmentDetailsAction>>>;
const pesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 });

function timeLabel(value: string): string {
  const [h = 0, m = 0] = value.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const quarterHours: SelectOption[] = Array.from({ length: 96 }, (_, index) => {
  const value = `${String(Math.floor(index / 4)).padStart(2, "0")}:${String((index % 4) * 15).padStart(2, "0")}`;
  return { value, label: timeLabel(value) };
});

/** 15-minute choices, plus the current time when it falls between them */
function timeOptionsFor(current: string): SelectOption[] {
  return current && !quarterHours.some((option) => option.value === current) ? [...quarterHours, { value: current, label: timeLabel(current) }].sort((a, b) => a.value.localeCompare(b.value)) : quarterHours;
}

export function AppointmentDetailsModal({ tenantId, appointmentId, onClose, onUpdated }: {
  tenantId: string;
  appointmentId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [details, setDetails] = useState<AppointmentDetails | null>();
  const [mode, setMode] = useState<"details" | "cancel" | "reschedule">("details");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [success, setSuccess] = useState<StaffSuccessDetails | null>(null);

  useEffect(() => {
    let current = true;
    loadAppointmentDetailsAction(tenantId, appointmentId).then(
      (result) => { if (current) setDetails(result); },
      () => { if (current) setDetails(null); },
    );
    return () => { current = false; };
  }, [tenantId, appointmentId, retry]);

  const timezone = details?.timezone ?? "Asia/Manila";
  const dateKey = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone, dateStyle: "short" });
  const timeKey = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const dateLabel = new Intl.DateTimeFormat("en-PH", { timeZone: timezone, month: "short", day: "numeric" });
  const timeLabel = new Intl.DateTimeFormat("en-PH", { timeZone: timezone, hour: "numeric", minute: "2-digit", hour12: true });
  const start = details ? new Date(details.starts_at) : null;
  const canReschedule = details?.status === "confirmed" || details?.status === "pending_approval";
  const canCancel = canReschedule || details?.status === "checked_in";
  const status = details?.status;
  const statusText = status ? status[0].toUpperCase() + status.slice(1).replaceAll("_", " ") : "";
  const statusTone = status === "confirmed" ? "success" : status === "pending_approval" ? "warning"
    : status === "checked_in" || status === "in_service" ? "info" : status === "cancelled" ? "danger" : "neutral";

  async function submit(nextStatus?: "Check In" | "Confirmed" | "Cancelled") {
    if (busy || !details) return;
    setBusy(true);
    setError("");
    try {
      const result = nextStatus
        ? await updateAppointmentStatusAction({ appointmentId, tenantIdParam: tenantId, newStatus: nextStatus, expectedStatus: details.status })
        : await rescheduleAppointmentAction({ appointmentId, tenantId, date, time, expectedStart: details.starts_at });
      if (!result.success) {
        setError(result.error);
        return;
      }
      const confirmation = {
        "Check In": { title: "Customer checked in", description: `${details.customerName} is checked in for this appointment.` },
        Confirmed: { title: "Appointment confirmed", description: `${details.customerName}’s appointment is confirmed.` },
        Cancelled: { title: "Appointment cancelled", description: `${details.customerName}’s appointment was cancelled.` },
      };
      setSuccess(nextStatus ? confirmation[nextStatus] : {
        title: "Appointment rescheduled",
        description: `The new date and time were saved for ${details.customerName}’s appointment.`,
      });
      onUpdated();
    } catch {
      setError("The appointment could not be updated. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const fields: [string, string][] = details && start ? [
    ["Service", details.appointment_services.map(({ services }) => services?.name).filter(Boolean).join(", ") || "Not assigned"],
    ["Schedule", `${dateLabel.format(start)} · ${timeLabel.format(start)}`],
    ["Staff", details.staff_members?.full_name || "Unassigned"],
    ["Duration", `${Math.round((Date.parse(details.ends_at) - start.getTime()) / 60_000)} minutes`],
    ["Resource / chair", details.resource_allocations.map(({ resources }) => resources?.name).filter(Boolean).join(", ") || "Not assigned"],
    ["Amount due", pesos.format(details.amountDue / 100)],
  ] : [];

  function changeMode(next: typeof mode) {
    setMode(next);
    setError("");
    if (next === "reschedule" && start) {
      setDate(dateKey.format(start));
      setTime(timeKey.format(start));
    }
  }

  if (success) return <StaffSuccessDialog {...success} onClose={onClose} />;

  return (
    <Modal open unstyled onClose={() => { if (!busy) onClose(); }} labelledBy="appointment-details-title"
      className="m-auto w-[calc(100%-1rem)] max-w-2xl overflow-hidden rounded-xl border border-hairline bg-white text-ink shadow-2xl sm:w-[calc(100%-2rem)]">
      <form onSubmit={(event) => { event.preventDefault(); if (mode === "reschedule") void submit(); }}
        className="flex max-h-[92dvh] flex-col" aria-busy={busy}>
        <header className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-5 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 id="appointment-details-title" className="font-display text-2xl leading-tight sm:text-[30px]">
                {mode === "reschedule" ? "Reschedule appointment" : mode === "cancel" ? "Cancel appointment" : "Appointment Details"}
              </h2>
              {details && <StatusPill tone={statusTone}>{statusText}</StatusPill>}
            </div>
            {details && <p className="mt-1 text-sm text-muted">
              {details.id.slice(0, 8).toUpperCase()} · {details.source === "walk_in" ? "Walk-in booking" : details.source === "phone" ? "Phone booking" : "Online booking"}
            </p>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close appointment details" className="shrink-0 rounded-md p-1.5 text-muted hover:bg-mist">
            <Icon name="close" className="size-4" />
          </button>
        </header>

        <div className="min-h-0 space-y-5 overflow-y-auto px-4 pb-3 pt-2 sm:px-6">
          {details === undefined && <p role="status" className="text-sm text-muted">Loading appointment…</p>}
          {details === null && (
            <div className="rounded-lg bg-mist p-4">
              <p role="alert" className="text-sm text-danger-dark">This appointment could not be loaded.</p>
              <Button variant="secondary" size="xs" className="mt-3" onClick={() => { setDetails(undefined); setRetry(retry + 1); }}>Try again</Button>
            </div>
          )}
          {details && (
            <>
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-burnt/10 text-sm font-semibold text-burnt-dark">
                  {getInitials(details.customerName)}
                </span>
                <div className="min-w-0">
                  <h3 className="break-words text-base font-semibold">{details.customerName}</h3>
                  {(details.customers?.phone || details.customers?.email) && (
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
                      {details.customers.phone && <a className="break-all underline-offset-2 hover:underline" href={`tel:${details.customers.phone}`}>{details.customers.phone}</a>}
                      {details.customers.email && <a className="break-all underline-offset-2 hover:underline" href={`mailto:${details.customers.email}`}>{details.customers.email}</a>}
                    </div>
                  )}
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-4 rounded-xl bg-mist p-4 sm:grid-cols-3 sm:gap-x-5">
                {fields.map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs text-muted">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              {status === "confirmed" && mode === "details" && (
                <AppointmentCheckInCode code={details.id} />
              )}
              {mode === "cancel" && <p className="rounded-lg bg-danger-bg p-3 text-sm text-danger-dark">Cancel this appointment for {details.customerName}?</p>}
              {mode === "reschedule" && (
                <div className="space-y-2">
                  <p className="text-sm text-muted">Choose a new date and time in {timezone}.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="reschedule-date" className="text-sm font-semibold text-ink">New date</label>
                      <DatePicker id="reschedule-date" value={date} min={dateKey.format(new Date())} onChange={setDate} disabled={busy} ariaLabel="Choose new date" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label htmlFor="reschedule-time" className="text-sm font-semibold text-ink">New time</label>
                      <SelectField id="reschedule-time" value={time} options={timeOptionsFor(time)} onChange={setTime} disabled={busy} placeholder="Select a time" />
                    </div>
                  </div>
                </div>
              )}
              {error && <p role="alert" className="rounded-lg bg-danger-bg p-3 text-sm text-danger-dark">{error}</p>}
            </>
          )}
        </div>

        <footer className="mt-2 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-hairline px-4 py-4 sm:px-6">
          {details && mode === "details" && (
            <>
              {canCancel && <Button variant="danger" size="xs" className="order-last w-full sm:order-none sm:mr-auto sm:w-auto" disabled={busy} onClick={() => changeMode("cancel")}>Cancel Appointment</Button>}
              {canReschedule && <Button variant="secondary" size="xs" disabled={busy} onClick={() => changeMode("reschedule")}>Reschedule</Button>}
              {status === "confirmed" && <Button variant="brand" size="xs" disabled={busy} onClick={() => void submit("Check In")}>Check In</Button>}
              {status === "pending_approval" && <Button variant="brand" size="xs" disabled={busy} onClick={() => void submit("Confirmed")}>Confirm</Button>}
            </>
          )}
          {mode !== "details" && <Button variant="secondary" size="xs" disabled={busy} onClick={() => changeMode("details")}>Back</Button>}
          {mode === "cancel" && <Button variant="danger" size="xs" disabled={busy} onClick={() => void submit("Cancelled")}>Confirm cancellation</Button>}
          {mode === "reschedule" && <Button variant="brand" size="xs" type="submit" disabled={busy}>Save schedule</Button>}
        </footer>
      </form>
    </Modal>
  );
}
