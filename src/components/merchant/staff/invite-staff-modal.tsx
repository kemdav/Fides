"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { sendStaffInvitationAction } from "@/app/actions/staff-invitations";
import { TextField } from "@/components/admin/fields";
import { Icon } from "@/components/admin/icon";
import { Modal } from "@/components/ui/modal";
import { Listbox } from "../new-appointment-modal";
import { ServiceCheckboxDropdown, type StaffServiceOption } from "./service-checkbox-dropdown";

interface InviteStaffModalProps {
  onClose: () => void;
  onSent: (email: string) => void;
  tenantId: string;
  canInviteAdmins: boolean;
  seatsUsed: number;
  staffLimit?: number | null;
  services: StaffServiceOption[];
}

export function InviteStaffModal({ onClose, onSent, tenantId, canInviteAdmins, seatsUsed, staffLimit, services }: InviteStaffModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("staff");
  const [commission, setCommission] = useState("none");
  const [commissionValue, setCommissionValue] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const atCapacity = typeof staffLimit === "number" && seatsUsed >= staffLimit;
  const isReceptionist = role === "receptionist";

  async function send() {
    if (sending || atCapacity) return;
    setSending(true);
    setError("");
    try {
      const result = await sendStaffInvitationAction({
        tenantId, name, email, title, role: role === "admin" || role === "receptionist" ? role : "staff",
        commission: !isReceptionist && (commission === "fixed" || commission === "percentage") ? commission : "none",
        commissionValue: isReceptionist ? "" : commissionValue,
        serviceIds: isReceptionist ? [] : selectedServices,
      });
      if (result.error) setError(result.error);
      else onSent(email.trim().toLowerCase());
    } catch {
      setError("The invitation could not be sent. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open
      unstyled
      onClose={() => { if (!sending) onClose(); }}
      labelledBy="invite-staff-title"
      className="m-auto w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-[14px] border border-line bg-white p-0 text-ink shadow-2xl backdrop:backdrop-blur-xs"
    >
      <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex max-h-[min(92dvh,calc(100dvh-2rem))] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <h2 id="invite-staff-title" className="font-display text-[26px] leading-[34px] text-ink">
              Invite staff member
            </h2>
            <p className="mt-1 text-sm text-muted">Invite a teammate to this workspace.</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={sending}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-burnt/10 focus-visible:outline-burnt"
          >
            <Icon name="close" className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-5 pt-1 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline bg-mist px-3 py-2.5 text-sm">
            <span className="font-medium">Staff seats</span>
            <span className="text-body">
              {typeof staffLimit === "number" ? `${seatsUsed} of ${staffLimit} used` : `${seatsUsed} used`}
              {typeof staffLimit === "number" && (
                <span className="ml-2 rounded-full bg-burnt/10 px-2 py-1 text-xs font-medium text-burnt-dark">
                  {Math.max(0, staffLimit - seatsUsed)} available
                </span>
              )}
            </span>
          </div>

          <h3 className="text-base font-semibold">Profile and access</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Full Name" name="fullName" autoComplete="name" placeholder="Juan Dela Cruz" required value={name} onChange={setName} />
            <TextField label="Email Address" name="email" type="email" autoComplete="email" placeholder="juan.delacruz@gmail.com" required value={email} onChange={setEmail} />
          </div>

          <Listbox
            id="invite-staff-role"
            label="Staff Role"
            required
            value={role}
            onChange={(value) => {
              setRole(value);
              if (value === "receptionist") {
                setSelectedServices([]);
                setCommission("none");
                setCommissionValue("");
              }
            }}
            options={[
              { value: "staff", label: "Service Staff" },
              { value: "receptionist", label: "Receptionist" },
              ...(canInviteAdmins ? [{ value: "admin", label: "Admin" }] : []),
            ]}
          />

          <div className="space-y-1.5">
            <TextField label="Public Title" name="title" placeholder="Hair Stylist" aria-describedby="invite-title-help" value={title} onChange={setTitle} />
            <p id="invite-title-help" className="text-xs text-muted">Shown on the website.</p>
          </div>

          {isReceptionist ? (
            <p className="rounded-lg bg-mist px-3 py-3 text-sm text-muted">Services and commission do not apply to receptionists.</p>
          ) : <>
          <h3 className="border-t border-hairline pt-4 text-base font-semibold">Services and commission</h3>
          <div className="space-y-1.5">
            {role === "staff" ? (
              <ServiceCheckboxDropdown services={services} value={selectedServices} onChange={setSelectedServices} disabled={sending} />
            ) : <Listbox
              id="invite-staff-services"
              label="Services this person can perform"
              describedBy="invite-services-help"
              placeholder="Select services"
              placement="above"
              multiple
              value={selectedServices}
              onChange={setSelectedServices}
              options={services.map(({ id, name }) => ({ value: id, label: name }))}
              disabled={sending}
            />}
            <p id="invite-services-help" className="text-xs text-muted">The Services page displays these assignments.</p>
          </div>

          <Listbox
            id="invite-staff-commission"
            label="Commission Arrangement"
            required
            placement="above"
            value={commission}
            onChange={(value) => {
              setCommission(value);
              setCommissionValue("");
            }}
            options={[
              { value: "none", label: "No Commission" },
              { value: "fixed", label: "Fixed Amount per Service" },
              { value: "percentage", label: "Percentage of Service Price" },
            ]}
          />

          {commission === "none" ? (
            <div className="rounded-lg border border-hairline bg-mist px-3 py-3 text-sm text-body">
              <p className="font-medium">No commission</p>
              <p className="mt-1 text-muted">Fixed ₱0 per completed service. This rule is excluded from commission accrual.</p>
            </div>
          ) : (
              <TextField
                label={commission === "fixed" ? "Amount per service (₱)" : "Percentage of service price"}
                name="commissionValue"
                type="number"
                min="0.01"
                max={commission === "percentage" ? 100 : undefined}
                step="0.01"
                required
                value={commissionValue}
                onChange={setCommissionValue}
              />
          )}
          </>}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-hairline bg-mist px-4 py-4 sm:px-6">
          {error && <p role="alert" className="w-full rounded-lg bg-danger-bg p-2 text-sm text-danger-dark">{error}</p>}
          <p className="mr-auto text-xs text-muted">{atCapacity ? "No staff seats are available." : "The invitation link expires in 7 days."}</p>
          <Button variant="secondary" size="xs" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button variant="brand" size="xs" type="submit" disabled={sending || atCapacity}>{sending ? "Sending…" : "Send invitation"}</Button>
        </footer>
      </form>
    </Modal>
  );
}
