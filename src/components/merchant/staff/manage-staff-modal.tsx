"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { saveStaffProfileAction } from "@/app/actions/staff";
import { AdminButton, AdminLinkButton } from "@/components/admin/admin-button";
import { fieldOutlineClasses, TextField } from "@/components/admin/fields";
import { Icon } from "@/components/admin/icon";
import { StatusPill } from "@/components/admin/primitives";
import { Modal } from "@/components/ui/modal";
import type { AppRole } from "@/types/database.types";
import { Listbox } from "../new-appointment-modal";
import { ServiceCheckboxDropdown } from "./service-checkbox-dropdown";
import { StaffAvailabilityDialog, StaffEmailChangeDialog } from "./staff-edit-dialogs";

export interface ManagedStaff {
  id: string;
  fullName: string;
  title: string;
  active: boolean;
  phone: string;
  email: string;
  bio: string;
  imageUrl: string | null;
  role: AppRole;
  roleLabel: string;
  canChangeRole: boolean;
  services: { value: string; label: string }[];
  serviceIds: string[];
  commissionType: "fixed" | "percentage";
  commissionValue: number;
  earnings: string;
  availability: string;
  availabilityHref?: string;
  upcomingCount: number;
}

function editablePhone(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length === 12 && digits.startsWith("63")) return `0${digits.slice(2)}`;
  return digits.length <= 11 ? digits : "";
}

export function ManageStaffModal({ staff, tenantId, basePath, onClose, onSaved }: {
  staff: ManagedStaff;
  tenantId: string;
  basePath: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(staff.fullName);
  const [title, setTitle] = useState(staff.title);
  const [phone, setPhone] = useState(() => editablePhone(staff.phone));
  const [phoneEdited, setPhoneEdited] = useState(false);
  const [bio, setBio] = useState(staff.bio);
  const [role, setRole] = useState(staff.role);
  const isServiceStaff = role === "staff";
  const [selectedServices, setSelectedServices] = useState(staff.serviceIds);
  const services = staff.services.map(({ value, label }) => ({ id: value, name: label }));
  const [commission, setCommission] = useState(staff.commissionValue ? staff.commissionType : "none");
  const [value, setValue] = useState(staff.commissionValue ? String(staff.commissionValue) : "");
  const [selectedPhoto, setSelectedPhoto] = useState<{ name: string; url: string } | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<"availability" | "email" | null>(null);
  const previewUrl = selectedPhoto?.url;
  const photoUrl = previewUrl ?? staff.imageUrl;

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  async function save(form: FormData) {
    setSaving(true);
    setError("");
    form.set("tenantId", tenantId);
    form.set("staffId", staff.id);
    if (!phoneEdited) form.delete("phone");
    form.set("role", role);
    if (isServiceStaff) {
      form.set("commissionType", commission === "none" ? "fixed" : commission);
      form.set("commissionValue", commission === "none" ? "0" : value);
      selectedServices.forEach((id) => form.append("serviceIds", id));
    }
    try {
      const result = await saveStaffProfileAction(form);
      if (result.success) onSaved();
      else setError(result.error ?? "Staff changes could not be saved.");
    } catch {
      setError("Staff changes could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Modal open unstyled onClose={() => { if (!saving) onClose(); }} labelledBy="manage-staff-title"
        className="m-auto w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-[14px] border border-line bg-white p-0 text-ink shadow-2xl backdrop:backdrop-blur-xs">
        <form onSubmit={(event) => {
          event.preventDefault();
          if (!saving) void save(new FormData(event.currentTarget));
        }} className="flex max-h-[min(92dvh,calc(100dvh-2rem))] flex-col">
          <header className="flex shrink-0 items-start justify-between gap-3 px-4 py-4 sm:px-6">
            <div>
              <h2 id="manage-staff-title" className="font-display text-[26px] leading-[34px] text-ink">Manage staff member</h2>
              <p className="mt-1 text-sm text-muted">{staff.fullName} · {staff.roleLabel}</p>
            </div>
            <button type="button" aria-label="Close" disabled={saving} onClick={onClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-burnt/10 focus-visible:outline-burnt">
              <Icon name="close" className="size-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-mist px-3 py-2.5">
              <StatusPill tone={staff.active ? "success" : "neutral"}>{staff.active ? "Active" : "Inactive"}</StatusPill>
              <p className="text-sm text-body">{staff.upcomingCount} upcoming {staff.upcomingCount === 1 ? "appointment" : "appointments"}</p>
            </div>
            <h3 className="text-base font-semibold">Profile and access</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Full Name" name="fullName" required maxLength={150} value={name} onChange={setName} />
              <TextField label="Title" name="title" maxLength={150} value={title} onChange={setTitle} />
              <div className="space-y-1.5">
                <TextField label="Phone Number" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national"
                  maxLength={11} pattern="[0-9]{6,11}" aria-describedby="manage-staff-phone-help" value={phone}
                  onChange={(entry) => {
                    setPhone(entry.replace(/[^0-9]/g, "").slice(0, 11));
                    setPhoneEdited(true);
                  }}
                  onPaste={(event) => {
                    event.preventDefault();
                    const input = event.currentTarget;
                    const start = input.selectionStart ?? phone.length;
                    const end = input.selectionEnd ?? start;
                    const digits = event.clipboardData.getData("text").replace(/[^0-9]/g, "");
                    if (!digits) return;
                    const pasted = digits.length === 12 && digits.startsWith("63") ? `0${digits.slice(2)}` : digits;
                    setPhone(`${phone.slice(0, start)}${pasted}${phone.slice(end)}`.slice(0, 11));
                    setPhoneEdited(true);
                  }}
                />
                <p id="manage-staff-phone-help" className="text-xs text-muted">Use 6–11 digits, without spaces or a country code.</p>
              </div>
              <Listbox id="manage-staff-role" label="Dashboard Role" required value={role}
                onChange={(entry) => setRole(entry === "receptionist" ? "receptionist" : "staff")}
                options={staff.canChangeRole
                  ? [{ value: "staff", label: "Service Staff" }, { value: "receptionist", label: "Receptionist" }]
                  : [{ value: staff.role, label: staff.roleLabel, disabled: true }]} />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-0 grow space-y-2">
                  <p className="text-sm font-semibold">Email Address</p>
                  <p className="pointer-events-none flex min-h-11 items-center break-all rounded-lg border border-outline bg-mist px-3 text-sm text-muted">
                    {staff.email || "Not provided"}
                  </p>
                </div>
                <AdminButton variant="outline-accent" size="xs" className="h-11" aria-haspopup="dialog" onClick={() => setDialog("email")} disabled={saving}>Request Email Change</AdminButton>
              </div>
              <p className="text-xs text-muted">Email changes require identity confirmation and verification.</p>
            </div>
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Bio
              <textarea name="bio" rows={2} maxLength={2000} value={bio} onChange={(event) => setBio(event.target.value)}
                className={`${fieldOutlineClasses} px-3 py-2 text-sm font-normal text-ink`} />
            </label>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Profile photo</p>
              <label className="flex cursor-pointer flex-wrap items-center gap-4 rounded-lg border border-dashed border-outline bg-mist p-4 text-sm hover:bg-burnt/5 focus-within:ring-2 focus-within:ring-burnt/40">
                <input type="file" name="image" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={saving}
                  aria-label={photoUrl ? "Change profile photo" : "Upload profile photo"}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setSelectedPhoto(file ? { name: file.name, url: URL.createObjectURL(file) } : null);
                  }} />
                {photoUrl ? (
                  <Image src={photoUrl} width={80} height={80} alt={previewUrl ? "New photo preview" : "Current profile photo"}
                    unoptimized className="size-20 shrink-0 rounded-full object-cover ring-2 ring-white" />
                ) : (
                  <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white text-burnt">
                    <Icon name="upload" className="size-5" />
                  </span>
                )}
                <span className="min-w-0 space-y-1">
                  <span className="block font-semibold text-burnt">{photoUrl ? "Change profile photo" : "Upload a profile photo"}</span>
                  <span className="block break-all text-xs text-muted">{selectedPhoto?.name ?? (staff.imageUrl ? "Current photo" : "Choose a file")}</span>
                </span>
              </label>
              <p className="text-xs text-muted">JPG, PNG, or WebP up to 750 KB.</p>
            </div>
            {isServiceStaff && <section className="space-y-4 border-t border-hairline pt-4" aria-labelledby="manage-staff-services-heading">
              <h3 id="manage-staff-services-heading" className="text-base font-semibold">Services and commission</h3>
              <div className="space-y-1.5">
                {role === "staff" ? (
                  <ServiceCheckboxDropdown
                    services={services}
                    value={selectedServices}
                    onChange={setSelectedServices}
                    disabled={saving}
                  />
                ) : (
                  <Listbox
                    id="manage-staff-services"
                    label="Services this person can perform"
                    describedBy="manage-staff-services-help"
                    placeholder="Select services"
                    placement="above"
                    multiple
                    value={selectedServices}
                    onChange={setSelectedServices}
                    options={staff.services}
                    disabled={saving}
                  />
                )}
                <p id="manage-staff-services-help" className="text-xs text-muted">
                  The Services page displays these assignments.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Listbox id="manage-staff-commission" label="Commission Arrangement" required placement="above"
                  value={commission} onChange={(entry) => {
                    setCommission(entry === "percentage" || entry === "fixed" ? entry : "none");
                    setValue("");
                  }}
                  options={[
                    { value: "none", label: "No Commission" },
                    { value: "fixed", label: "Fixed Amount per Service" },
                    { value: "percentage", label: "Percentage of Service Price" },
                  ]} />
                {commission === "none" ? (
                  <TextField label="Commission Value" value="No Commission" onChange={() => {}} readOnly />
                ) : (
                  <TextField label={commission === "fixed" ? "Commission Value (₱)" : "Commission Value (%)"}
                    required type="number" min="0.01" max={commission === "percentage" ? 100 : 9999999999.99}
                    step="0.01" value={value} onChange={setValue} />
                )}
              </div>
            </section>}
            <div className="rounded-lg border border-hairline bg-mist p-3 text-sm">
              <p className="font-medium">{isServiceStaff ? "Availability and earnings" : "Availability"}</p>
              <p className="mt-1 text-sm text-body">{staff.availability}</p>
              {isServiceStaff && <p className="mt-1 text-xs text-muted">Commission this month {staff.earnings}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminLinkButton href={`${basePath}/dashboard/appointments?staff=${staff.id}`} variant="outline-accent" size="xs">View Schedule</AdminLinkButton>
              <AdminButton variant="outline" size="xs" aria-haspopup="dialog" onClick={() => setDialog("availability")} disabled={saving}>View shifts</AdminButton>
            </div>
          </div>

          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-hairline bg-mist px-4 py-4 sm:px-6">
            {error && <p role="alert" className="w-full rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger-dark">{error}</p>}
            <AdminButton variant="outline" size="xs" onClick={onClose} disabled={saving}>Cancel</AdminButton>
            <AdminButton type="submit" variant="primary" size="xs" disabled={saving}>{saving ? "Saving…" : "Save changes"}</AdminButton>
          </footer>
        </form>
      </Modal>
      {dialog === "availability" && (
        <StaffAvailabilityDialog name={staff.fullName} availability={staff.availability} href={staff.availabilityHref} onClose={() => setDialog(null)} />
      )}
      {dialog === "email" && (
        <StaffEmailChangeDialog name={staff.fullName} tenantId={tenantId} staffId={staff.id} currentEmail={staff.email} onClose={() => setDialog(null)} />
      )}
    </>
  );
}
