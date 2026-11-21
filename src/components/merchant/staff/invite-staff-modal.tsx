"use client";

import { useState } from "react";
import { AdminButton } from "@/components/admin/admin-button";
import { TextField } from "@/components/admin/fields";
import { Icon } from "@/components/admin/icon";
import { Modal } from "@/components/ui/modal";
import { Listbox } from "../new-appointment-modal";

interface InviteStaffModalProps {
  onClose: () => void;
  seatsUsed: number;
  staffLimit?: number | null;
  services: { id: string; name: string }[];
}

export function InviteStaffModal({ onClose, seatsUsed, staffLimit, services }: InviteStaffModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("staff");
  const [commission, setCommission] = useState("none");
  const [commissionValue, setCommissionValue] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  return (
    <Modal
      open
      unstyled
      onClose={onClose}
      labelledBy="invite-staff-title"
      className="m-auto w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-[14px] border border-line bg-white p-0 text-ink shadow-2xl backdrop:backdrop-blur-xs"
    >
      <div className="flex max-h-[min(92dvh,calc(100dvh-2rem))] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-hairline bg-powder px-4 py-4 sm:px-6">
          <div>
            <h2 id="invite-staff-title" className="font-display text-[26px] leading-[34px] text-ink">
              Invite staff member
            </h2>
            <p className="mt-1 text-sm text-muted">Set a role, service eligibility, and commission for your teammate.</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-burnt/10 focus-visible:outline-burnt"
          >
            <Icon name="close" className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
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
            onChange={setRole}
            options={[
              { value: "staff", label: "Service Staff" },
              { value: "receptionist", label: "Receptionist" },
              { value: "admin", label: "Admin" },
            ]}
          />

          <div className="space-y-1.5">
            <TextField label="Public Title" name="title" placeholder="Hair Stylist" aria-describedby="invite-title-help" value={title} onChange={setTitle} />
            <p id="invite-title-help" className="text-xs text-muted">Shown on the website. Service eligibility is set below.</p>
          </div>

          <h3 className="border-t border-hairline pt-4 text-base font-semibold">Services and commission</h3>
          <div className="space-y-1.5">
            <Listbox
              id="invite-staff-services"
              label="Services this person can perform"
              describedBy="invite-services-help"
              placeholder="Select services"
              placement="above"
              multiple
              value={selectedServices}
              onChange={setSelectedServices}
              options={services.map(({ id, name }) => ({ value: id, label: name }))}
            />
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
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-hairline bg-mist px-4 py-4 sm:px-6">
          <p className="mr-auto text-xs text-muted">Invitation sending is unavailable.</p>
          <AdminButton variant="outline" size="xs" onClick={onClose}>Cancel</AdminButton>
          <AdminButton variant="primary" size="xs" disabled>Send invitation</AdminButton>
        </footer>
      </div>
    </Modal>
  );
}
