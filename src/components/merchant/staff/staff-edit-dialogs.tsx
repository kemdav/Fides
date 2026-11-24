"use client";

import { useState, type ReactNode } from "react";
import { requestStaffEmailChangeAction } from "@/app/actions/staff-email-change";
import { AdminButton, AdminLinkButton } from "@/components/admin/admin-button";
import { TextField } from "@/components/admin/fields";
import { Icon } from "@/components/admin/icon";
import { Modal } from "@/components/ui/modal";
import { StaffSuccessDialog } from "./staff-confirmation-dialog";

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
      else setError(result.error);
    } catch {
      setError("The verification email could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return <StaffSuccessDialog title="Verification email sent"
      description={`A link was sent to ${email.trim()}. The staff member can open it and use their current Fides password to verify the new email and open their dashboard.`}
      onClose={onClose} />;
  }

  return (
    <StaffEditDialog title="Request email change" onClose={onClose} busy={busy}>
      <form className="space-y-4" onSubmit={(event) => {
        event.preventDefault();
        if (currentEmail && !busy) void send();
      }}>
        <p className="text-sm leading-relaxed text-body">Enter the new sign-in email for <strong className="font-semibold">{name}</strong>.</p>
        <div className="rounded-lg border border-hairline bg-mist px-4 py-3">
          <p className="text-xs font-medium text-muted">Current sign-in email</p>
          <p className="mt-1 break-all text-sm font-semibold text-ink">{currentEmail || "No email linked"}</p>
        </div>
        <TextField label="New email address" type="email" autoComplete="email" maxLength={254} required
          placeholder="name@example.com" value={email} onChange={setEmail} disabled={busy || !currentEmail} />
        {currentEmail ? (
          <div className="space-y-2 rounded-lg bg-powder px-4 py-3 text-sm text-body">
            <p className="font-semibold text-ink">What happens next</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>We’ll send a verification link to the new address.</li>
              <li>{name} will open the link and enter their current Fides password to verify the new address and open their dashboard.</li>
            </ol>
            <p className="text-muted">The current email will stay active until verification succeeds.</p>
          </div>
        ) : (
          <p className="text-sm text-muted">A linked sign-in email is required to request a change.</p>
        )}
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <AdminButton variant="outline" size="xs" onClick={onClose} disabled={busy}>Cancel</AdminButton>
          <AdminButton variant="primary" size="xs" type="submit" disabled={busy || !currentEmail || !email.trim()}>
            {busy ? "Sending…" : "Send verification email"}
          </AdminButton>
        </div>
      </form>
    </StaffEditDialog>
  );
}
