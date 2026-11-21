"use client";

import { useState } from "react";
import { AdminButton } from "@/components/admin/admin-button";
import { Icon } from "@/components/admin/icon";
import { Modal } from "@/components/ui/modal";

interface InviteStaffModalProps {
  onClose: () => void;
  seatsUsed: number;
  staffLimit?: number | null;
  services: { id: string; name: string }[];
}

const fieldClass = "h-11 w-full rounded-lg border border-hairline bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/40";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-ink";

function RequiredMark() {
  return <span className="text-danger" aria-hidden="true">*</span>;
}

export function InviteStaffModal({ onClose, seatsUsed, staffLimit, services }: InviteStaffModalProps) {
  const [commission, setCommission] = useState("none");
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
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-hairline px-4 py-5 sm:px-6">
          <div>
            <h2 id="invite-staff-title" className="font-display text-[26px] leading-[34px] text-ink">
              Invite staff member
            </h2>
            <p className="mt-1 text-xs text-muted">Invite a teammate to this business. Role permissions are fixed.</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-glyph hover:bg-mist hover:text-ink"
          >
            <Icon name="close" className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          <p className="rounded-lg bg-mist px-3 py-3 text-xs text-body">
            {typeof staffLimit === "number"
              ? `${seatsUsed} of ${staffLimit} staff seats used · ${Math.max(0, staffLimit - seatsUsed)} available.`
              : `${seatsUsed} staff seats used.`}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              <span>Full Name<RequiredMark /></span>
              <input className={fieldClass} name="fullName" autoComplete="name" placeholder="Ari Mendoza" required />
            </label>
            <label className={labelClass}>
              <span>Email Address<RequiredMark /></span>
              <input className={fieldClass} name="email" type="email" autoComplete="email" placeholder="ari.mendoza@example.com" required />
            </label>
          </div>

          <label className={labelClass}>
            <span>Staff Role<RequiredMark /></span>
            <select className={fieldClass} name="role" defaultValue="staff" required>
              <option value="staff">Service Staff</option>
              <option value="receptionist">Receptionist</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <div className="space-y-1.5">
            <label className={labelClass}>
              Public Title
              <input className={fieldClass} name="title" placeholder="Hair Stylist" aria-describedby="invite-title-help" />
            </label>
            <p id="invite-title-help" className="text-xs text-muted">Shown on the website. Service eligibility is set below.</p>
          </div>

          <fieldset className="space-y-1.5" aria-describedby="invite-services-help">
            <legend className="mb-1.5 text-sm font-medium">Services this person can perform</legend>
            <details className="rounded-lg border border-hairline bg-white">
              <summary className="cursor-pointer px-3 py-2.5 text-sm text-muted">
                {selectedServices.length ? `${selectedServices.length} selected` : "Select services"}
              </summary>
              <div className="max-h-40 space-y-2 overflow-y-auto border-t border-hairline px-3 py-2.5">
                {services.map((service) => (
                  <label key={service.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-burnt"
                      checked={selectedServices.includes(service.id)}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setSelectedServices((current) => checked
                          ? [...current, service.id]
                          : current.filter((id) => id !== service.id));
                      }}
                    />
                    {service.name}
                  </label>
                ))}
                {services.length === 0 && <p className="text-xs text-muted">No active services available.</p>}
              </div>
            </details>
            <p id="invite-services-help" className="text-xs text-muted">The Services page displays these assignments.</p>
          </fieldset>

          <label className={labelClass}>
            <span>Commission Arrangement<RequiredMark /></span>
            <select className={fieldClass} name="commission" value={commission} onChange={(event) => setCommission(event.target.value)} required>
              <option value="none">No Commission</option>
              <option value="fixed">Fixed Amount per Service</option>
              <option value="percentage">Percentage of Service Price</option>
            </select>
          </label>

          {commission === "none" ? (
            <div className="rounded-lg bg-mist px-3 py-3 text-xs text-body">
              <p className="font-medium">No commission</p>
              <p className="mt-1 text-muted">Fixed ₱0 per completed service. This rule is excluded from commission accrual.</p>
            </div>
          ) : (
            <label className={labelClass}>
              <span>{commission === "fixed" ? "Amount per service (₱)" : "Percentage of service price"}<RequiredMark /></span>
              <input
                key={commission}
                className={fieldClass}
                name="commissionValue"
                type="number"
                min="0.01"
                max={commission === "percentage" ? 100 : undefined}
                step="0.01"
                required
              />
            </label>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-hairline px-4 py-4 sm:px-6">
          <p className="mr-auto text-xs text-muted">Invitation sending is unavailable.</p>
          <AdminButton variant="outline" size="xs" onClick={onClose}>Cancel</AdminButton>
          <AdminButton variant="primary" size="xs" disabled>Send invitation</AdminButton>
        </footer>
      </div>
    </Modal>
  );
}
