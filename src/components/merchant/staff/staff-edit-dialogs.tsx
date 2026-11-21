"use client";

import { useState, type ReactNode } from "react";
import { requestStaffEmailChangeAction } from "@/app/actions/staff";
import { AdminButton, AdminLinkButton } from "@/components/admin/admin-button";
import { TextField } from "@/components/admin/fields";
import { Icon } from "@/components/admin/icon";
import { Modal } from "@/components/ui/modal";

function StaffEditDialog({ title, children, onClose, busy = false }: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <Modal open unstyled onClose={() => { if (!busy) onClose(); }} labelledBy="staff-edit-dialog-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-auto rounded-[14px] border border-line bg-white p-5 text-ink shadow-2xl sm:p-6">
      <header className="mb-4 flex items-start justify-between gap-3">
        <h2 id="staff-edit-dialog-title" className="font-display text-[26px] leading-[34px]">{title}</h2>
        <button type="button" aria-label="Close" disabled={busy} onClick={onClose}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-glyph hover:bg-mist">
          <Icon name="close" className="size-5" />
        </button>
      </header>
      {children}
    </Modal>
  );
}

export function StaffAvailabilityDialog({ name, availability, href, onClose }: {
  name: string;
  availability: string;
  href?: string;
  onClose: () => void;
}) {
  return (
    <StaffEditDialog title="Staff availability handoff" onClose={onClose}>
      <p className="text-sm font-medium">{name} · {availability}</p>
      <p className="mt-3 text-sm text-body">
        Working hours, breaks, leave, and closures are managed in Availability. Assigned customer bookings belong in the appointment calendar.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        {href ? (
          <AdminLinkButton href={href} variant="primary" size="xs">Open Availability</AdminLinkButton>
        ) : (
          <>
            <p className="mr-auto text-xs text-muted">Availability is currently unavailable.</p>
            <AdminButton variant="primary" size="xs" disabled>Open Availability</AdminButton>
          </>
        )}
      </div>
    </StaffEditDialog>
  );
}

export function StaffEmailChangeDialog({ name, tenantId, staffId, currentEmail, onClose }: {
  name: string;
  tenantId: string;
  staffId: string;
  currentEmail: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function send() {
    setBusy(true);
    setError("");
    try {
      const result = await requestStaffEmailChangeAction({ tenantId, staffId, email });
      if (result.success) setSent(true);
      else setError(result.error ?? "Verification emails could not be sent.");
    } catch {
      setError("Verification emails could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <StaffEditDialog title="Request email change" onClose={onClose} busy={busy}>
      <form className="space-y-4" onSubmit={(event) => {
        event.preventDefault();
        if (currentEmail && !busy && !sent) void send();
      }}>
        <p className="text-sm text-body">
          {name}&apos;s current email stays active until the new email address is verified. A confirmation notice is sent to the new email address. The current address must also approve the change.
        </p>
        <TextField label="New Email Address" type="email" autoComplete="email" maxLength={254} required value={email} onChange={setEmail} disabled={busy || sent} />
        {!currentEmail && <p className="text-xs text-muted">This staff member needs a linked sign-in email to request a change.</p>}
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        {sent && <p role="status" className="text-sm text-success">Confirmation emails sent to the current and new addresses.</p>}
        <div className="flex justify-end gap-2">
          <AdminButton variant="outline" size="xs" onClick={onClose} disabled={busy}>{sent ? "Done" : "Cancel"}</AdminButton>
          {!sent && <AdminButton variant="primary" size="xs" type="submit" disabled={busy || !currentEmail}>
            {busy ? "Sending…" : "Send verification email"}
          </AdminButton>}
        </div>
      </form>
    </StaffEditDialog>
  );
}
