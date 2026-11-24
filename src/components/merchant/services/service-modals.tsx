"use client";

import * as React from "react";
import { AdminButton } from "@/components/admin/admin-button";
import { CheckboxDropdown } from "@/components/admin/checkbox-dropdown";
import { fieldOutlineClasses } from "@/components/admin/fields";
import { Icon } from "@/components/admin/icon";
import { Listbox } from "@/components/admin/listbox";
import type {
  AddonDTO,
  PackageDTO,
  ServiceCategoryDTO,
  ServiceDTO,
  StaffOptionDTO,
} from "@/types/services";

const fieldLabelClass = "mb-1.5 block text-sm font-semibold text-ink";
const fieldClass = `${fieldOutlineClasses} h-11 w-full text-sm text-ink placeholder:text-glyph`;
const textareaClass = `${fieldOutlineClasses} w-full resize-none px-3 py-2.5 text-sm text-ink placeholder:text-glyph`;

function CatalogFormDialog({
  title,
  description,
  submitLabel,
  error,
  isLoading,
  onClose,
  onSubmit,
  onDelete,
  children,
}: {
  title: string;
  description: string;
  submitLabel: string;
  error: string | null;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  const titleId = React.useId();
  const descriptionId = React.useId();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 backdrop-blur-xs sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[14px] border border-line bg-white text-ink shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-hairline px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-[26px] leading-[34px] text-ink">{title}</h2>
            <p id={descriptionId} className="mt-1 text-sm text-muted">{description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 shrink-0 items-center justify-center rounded-lg text-glyph transition-colors hover:bg-mist hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40">
            <Icon name="close" className="size-5" />
          </button>
        </header>

        <form onSubmit={onSubmit} aria-busy={isLoading} className="flex min-h-0 flex-1 flex-col">
          <div data-checkbox-dropdown-boundary className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
            {error && <p role="alert" className="rounded-lg bg-danger-bg p-3 text-sm text-danger-dark">{error}</p>}
            {children}
          </div>
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-hairline px-4 py-4 sm:px-6">
            {onDelete && (
              <AdminButton variant="danger" size="sm" className="order-last w-full sm:order-none sm:mr-auto sm:w-auto" disabled={isLoading} onClick={onDelete}>
                Delete
              </AdminButton>
            )}
            <AdminButton variant="outline" size="sm" disabled={isLoading} onClick={onClose}>
              Cancel
            </AdminButton>
            <AdminButton variant="primary" size="sm" type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : submitLabel}
            </AdminButton>
          </footer>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Form Modal (Add / Edit)
// ─────────────────────────────────────────────────────────────────────────────

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    id?: string;
    name: string;
    description: string;
    durationMinutes: number;
    bufferMinutes: number;
    priceCents: number;
    categoryId: string | null;
    staffIds: string[];
    active: boolean;
  }) => Promise<void>;
  onArchive?: (service: ServiceDTO) => void;
  onDelete?: (service: ServiceDTO) => void;
  initialService?: ServiceDTO | null;
  categories: ServiceCategoryDTO[];
  staff: StaffOptionDTO[];
  isLoading?: boolean;
}

export function ServiceFormModal({
  isOpen,
  onClose,
  onSubmit,
  onArchive,
  onDelete,
  initialService,
  categories,
  staff,
  isLoading = false,
}: ServiceFormModalProps) {
  const isEdit = Boolean(initialService);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [durationMinutes, setDurationMinutes] = React.useState(60);
  const [bufferMinutes, setBufferMinutes] = React.useState(0);
  const [pricePesos, setPricePesos] = React.useState(850);
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [selectedStaffIds, setSelectedStaffIds] = React.useState<string[]>([]);
  const [active, setActive] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialService) {
      setName(initialService.name);
      setDescription(initialService.description || "");
      setDurationMinutes(initialService.durationMinutes);
      setBufferMinutes(initialService.bufferMinutes);
      setPricePesos(initialService.priceCents / 100);
      setCategoryId(initialService.categoryId);
      setSelectedStaffIds(initialService.assignedStaffIds || []);
      setActive(initialService.active);
    } else {
      setName("");
      setDescription("");
      setDurationMinutes(60);
      setBufferMinutes(0);
      setPricePesos(850);
      setCategoryId(categories[0]?.id || null);
      setSelectedStaffIds(staff.map((s) => s.id));
      setActive(true);
    }
    setError(null);
  }, [initialService, isOpen, categories, staff]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a service title.");
      return;
    }
    if (durationMinutes <= 0) {
      setError("Duration must be greater than 0 minutes.");
      return;
    }
    if (pricePesos < 0 || isNaN(pricePesos)) {
      setError("Please enter a valid price.");
      return;
    }

    setError(null);
    await onSubmit({
      id: initialService?.id,
      name: name.trim(),
      description: description.trim(),
      durationMinutes: Number(durationMinutes),
      bufferMinutes: Number(bufferMinutes) || 0,
      priceCents: Math.round(pricePesos * 100),
      categoryId,
      staffIds: selectedStaffIds,
      active,
    });
  };

  const allStaffSelected = staff.every((member) => selectedStaffIds.includes(member.id));

  return (
    <CatalogFormDialog
      title={isEdit ? "Edit Service" : "Add Service"}
      description={
        isEdit
          ? "Update pricing, duration, and staff assignments."
          : "Create a new bookable service for your catalog."
      }
      submitLabel={isEdit ? "Save changes" : "Add Service"}
      error={error}
      isLoading={isLoading}
      onClose={onClose}
      onSubmit={handleSubmit}
      onDelete={initialService && onDelete ? () => onDelete(initialService) : undefined}
    >
      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <div className={categories.length === 0 ? "sm:col-span-2" : undefined}>
          <label htmlFor="service-name" className={fieldLabelClass}>
            Service Title <span className="text-burnt">*</span>
          </label>
          <input
            id="service-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Signature Haircut, Balayage, Manicure"
            className={`${fieldClass} px-3`}
          />
        </div>
        {categories.length > 0 && (
          <Listbox
            id="service-category"
            label="Category"
            value={categoryId ?? ""}
            onChange={(id) => setCategoryId(id || null)}
            options={[
              { value: "", label: "Uncategorized" },
              ...categories.map((category) => ({ value: category.id, label: category.name })),
            ]}
          />
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="service-description" className={fieldLabelClass}>
          Description
        </label>
        <textarea
          id="service-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what is included in this service..."
          className={textareaClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
        <div>
          <label htmlFor="service-duration" className={fieldLabelClass}>
            Duration (minutes) <span className="text-burnt">*</span>
          </label>
          <input
            id="service-duration"
            type="number"
            min="5"
            step="5"
            required
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className={`${fieldClass} px-3`}
          />
        </div>
        <div>
          <label htmlFor="service-price" className={fieldLabelClass}>
            Base Price (₱ PHP) <span className="text-burnt">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-glyph">
              ₱
            </span>
            <input
              id="service-price"
              type="number"
              min="0"
              step="1"
              required
              value={pricePesos}
              onChange={(e) => setPricePesos(Number(e.target.value))}
              className={`${fieldClass} pl-8 pr-3`}
            />
          </div>
        </div>
        <div>
          <label htmlFor="service-buffer" className={fieldLabelClass}>
            Buffer Time (minutes)
          </label>
          <input
            id="service-buffer"
            type="number"
            min="0"
            step="5"
            value={bufferMinutes}
            onChange={(e) => setBufferMinutes(Number(e.target.value))}
            placeholder="Between bookings"
            className={`${fieldClass} px-3`}
          />
        </div>
      </div>

      <CheckboxDropdown
        label="Eligible Staff Members"
        description="Choose staff who can provide this service."
        options={staff.map((member) => ({ id: member.id, name: member.fullName, description: member.title ?? undefined }))}
        value={selectedStaffIds}
        onChange={setSelectedStaffIds}
        disabled={isLoading}
        selectionSummary={(count) => count ? `${count} staff ${count === 1 ? "member" : "members"} selected` : "Select staff members"}
        selectedLabel="Selected staff members"
        emptyMessage="No active staff members available."
        bulkAction={staff.length > 0 ? {
          label: allStaffSelected ? "Deselect all" : "Select all",
          onClick: () => setSelectedStaffIds(allStaffSelected ? [] : staff.map((member) => member.id)),
        } : undefined}
      />

      {/* Active Toggle Switch */}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-white p-4">
        <div>
          <span className="text-sm font-semibold text-ink block">
            Active on booking menu
          </span>
          <span className="text-xs text-muted block">
            When enabled, clients can browse and book this service online.
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-label="Active on booking menu"
          aria-checked={active}
          onClick={() => setActive(!active)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
            active ? "bg-burnt" : "bg-neutral-200"
          }`}
        >
          <span
            className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              active ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </CatalogFormDialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Package Form Modal (Add / Edit)
// ─────────────────────────────────────────────────────────────────────────────

interface PackageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    id?: string;
    name: string;
    description: string;
    priceCents: number;
    durationMinutes: number;
    serviceIds: string[];
    active: boolean;
  }) => Promise<void>;
  onArchive?: (pkg: PackageDTO) => void;
  onDelete?: (pkg: PackageDTO) => void;
  initialPackage?: PackageDTO | null;
  availableServices: ServiceDTO[];
  isLoading?: boolean;
}

export function PackageFormModal({
  isOpen,
  onClose,
  onSubmit,
  onArchive,
  onDelete,
  initialPackage,
  availableServices,
  isLoading = false,
}: PackageFormModalProps) {
  const isEdit = Boolean(initialPackage);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [pricePesos, setPricePesos] = React.useState(1200);
  const [durationMinutes, setDurationMinutes] = React.useState(90);
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<string[]>([]);
  const [active, setActive] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialPackage) {
      setName(initialPackage.name);
      setDescription(initialPackage.description || "");
      setPricePesos(initialPackage.priceCents / 100);
      setDurationMinutes(initialPackage.durationMinutes);
      setSelectedServiceIds(initialPackage.bundledServiceIds || []);
      setActive(initialPackage.active);
    } else {
      setName("");
      setDescription("");
      setPricePesos(1200);
      const defaultTwo = availableServices.slice(0, 2).map((s) => s.id);
      setSelectedServiceIds(defaultTwo);
      const defaultDuration = availableServices
        .slice(0, 2)
        .reduce((sum, s) => sum + s.durationMinutes, 0);
      setDurationMinutes(defaultDuration || 90);
      setActive(true);
    }
    setError(null);
  }, [initialPackage, isOpen, availableServices]);

  if (!isOpen) return null;

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) => {
      const next = prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId];

      // Auto update duration if adding/removing
      const totalDur = availableServices
        .filter((s) => next.includes(s.id))
        .reduce((sum, s) => sum + s.durationMinutes, 0);
      if (totalDur > 0) {
        setDurationMinutes(totalDur);
      }
      return next;
    });
  };

  const regularTotalPrice = availableServices
    .filter((s) => selectedServiceIds.includes(s.id))
    .reduce((sum, s) => sum + s.priceCents, 0) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a package title.");
      return;
    }
    if (selectedServiceIds.length === 0) {
      setError("Please select at least one bundled service.");
      return;
    }
    if (pricePesos < 0 || isNaN(pricePesos)) {
      setError("Please enter a valid package price.");
      return;
    }

    setError(null);
    await onSubmit({
      id: initialPackage?.id,
      name: name.trim(),
      description: description.trim(),
      priceCents: Math.round(pricePesos * 100),
      durationMinutes: Number(durationMinutes) || 0,
      serviceIds: selectedServiceIds,
      active,
    });
  };

  return (
    <CatalogFormDialog
      title={isEdit ? "Edit Package" : "Add Package"}
      description="Bundle multiple services together at a special bundle price."
      submitLabel={isEdit ? "Save changes" : "Create Package"}
      error={error}
      isLoading={isLoading}
      onClose={onClose}
      onSubmit={handleSubmit}
      onDelete={initialPackage && onDelete ? () => onDelete(initialPackage) : undefined}
    >
      <div>
        <label htmlFor="package-name" className={fieldLabelClass}>
          Package Title <span className="text-burnt">*</span>
        </label>
        <input
          id="package-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Total Glow Makeover, Bridal Package"
          className={`${fieldClass} px-3`}
        />
      </div>

      <div>
        <label htmlFor="package-description" className={fieldLabelClass}>
          Description
        </label>
        <textarea
          id="package-description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the benefits or inclusions of this package..."
          className={textareaClass}
        />
      </div>

      {/* Bundled Services Selection */}
      <div className="rounded-lg border border-hairline bg-mist p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-ink">
            Bundled Services <span className="text-burnt">*</span>
          </span>
          <span className="text-[11px] font-medium text-muted">
            {selectedServiceIds.length} selected
            {regularTotalPrice > 0 && ` (Regular: ₱${regularTotalPrice.toLocaleString("en-PH")})`}
          </span>
        </div>

        {availableServices.length === 0 ? (
          <p className="text-xs text-glyph italic py-2">
            No active services available to bundle. Create services first.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {availableServices.map((srv) => {
              const checked = selectedServiceIds.includes(srv.id);
              return (
                <label
                  key={srv.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-white px-3 py-2 text-xs transition cursor-pointer hover:bg-mist"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleService(srv.id)}
                      className="size-4 rounded accent-burnt focus-visible:ring-2 focus-visible:ring-burnt/40"
                    />
                    <span className="font-medium text-ink truncate">
                      {srv.name}
                    </span>
                  </div>
                  <div className="text-right shrink-0 text-muted text-[11px]">
                    <span>{srv.durationMinutes} min</span> •{" "}
                    <span className="font-semibold text-body">
                      {srv.priceFormatted}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="package-duration" className={fieldLabelClass}>
            Package Duration (mins) <span className="text-burnt">*</span>
          </label>
          <input
            id="package-duration"
            type="number"
            min="10"
            step="5"
            required
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className={`${fieldClass} px-3`}
          />
        </div>
        <div>
          <label htmlFor="package-price" className={fieldLabelClass}>
            Bundle Price (₱ PHP) <span className="text-burnt">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-glyph">
              ₱
            </span>
            <input
              id="package-price"
              type="number"
              min="0"
              step="1"
              required
              value={pricePesos}
              onChange={(e) => setPricePesos(Number(e.target.value))}
              className={`${fieldClass} pl-8 pr-3`}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-white p-4">
        <div>
          <span className="text-sm font-semibold text-ink block">
            Active on booking menu
          </span>
          <span className="text-xs text-muted block">
            Make this package available for clients to book online.
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-label="Active on booking menu"
          aria-checked={active}
          onClick={() => setActive(!active)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
            active ? "bg-burnt" : "bg-neutral-200"
          }`}
        >
          <span
            className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              active ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </CatalogFormDialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add-on Form Modal (Add / Edit)
// ─────────────────────────────────────────────────────────────────────────────

interface AddonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    id?: string;
    name: string;
    description: string;
    priceCents: number;
    durationMinutes: number;
    applicableServiceIds?: string[];
    active: boolean;
  }) => Promise<void>;
  onArchive?: (addon: AddonDTO) => void;
  onDelete?: (addon: AddonDTO) => void;
  initialAddon?: AddonDTO | null;
  availableServices: ServiceDTO[];
  isLoading?: boolean;
}

export function AddonFormModal({
  isOpen,
  onClose,
  onSubmit,
  onArchive,
  onDelete,
  initialAddon,
  availableServices,
  isLoading = false,
}: AddonFormModalProps) {
  const isEdit = Boolean(initialAddon);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [pricePesos, setPricePesos] = React.useState(250);
  const [durationMinutes, setDurationMinutes] = React.useState(15);
  const [applyToAll, setApplyToAll] = React.useState(true);
  const [applicableServiceIds, setApplicableServiceIds] = React.useState<string[]>([]);
  const [active, setActive] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialAddon) {
      setName(initialAddon.name);
      setDescription(initialAddon.description || "");
      setPricePesos(initialAddon.priceCents / 100);
      setDurationMinutes(initialAddon.durationMinutes);
      setActive(initialAddon.active);
      if (initialAddon.linkedServiceIds.length > 0) {
        setApplyToAll(false);
        setApplicableServiceIds(initialAddon.linkedServiceIds);
      } else {
        setApplyToAll(true);
        setApplicableServiceIds([]);
      }
    } else {
      setName("");
      setDescription("");
      setPricePesos(250);
      setDurationMinutes(15);
      setApplyToAll(true);
      setApplicableServiceIds([]);
      setActive(true);
    }
    setError(null);
  }, [initialAddon, isOpen]);

  if (!isOpen) return null;

  const toggleService = (serviceId: string) => {
    setApplicableServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide an add-on title.");
      return;
    }
    if (pricePesos < 0 || isNaN(pricePesos)) {
      setError("Please enter a valid extra price.");
      return;
    }

    setError(null);
    await onSubmit({
      id: initialAddon?.id,
      name: name.trim(),
      description: description.trim(),
      priceCents: Math.round(pricePesos * 100),
      durationMinutes: Number(durationMinutes) || 0,
      applicableServiceIds: applyToAll ? [] : applicableServiceIds,
      active,
    });
  };

  return (
    <CatalogFormDialog
      title={isEdit ? "Edit Add-on" : "Add Add-on"}
      description="Optional upgrades or extras clients can attach to their appointment."
      submitLabel={isEdit ? "Save changes" : "Add Add-on"}
      error={error}
      isLoading={isLoading}
      onClose={onClose}
      onSubmit={handleSubmit}
      onDelete={initialAddon && onDelete ? () => onDelete(initialAddon) : undefined}
    >
      <div>
        <label htmlFor="addon-name" className={fieldLabelClass}>
          Add-on Name <span className="text-burnt">*</span>
        </label>
        <input
          id="addon-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Scalp Massage, Deep Conditioning, Beard Oil"
          className={`${fieldClass} px-3`}
        />
      </div>

      <div>
        <label htmlFor="addon-description" className={fieldLabelClass}>
          Description
        </label>
        <textarea
          id="addon-description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Explain the add-on treatment or extra..."
          className={textareaClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="addon-duration" className={fieldLabelClass}>
            Extra Duration (mins)
          </label>
          <input
            id="addon-duration"
            type="number"
            min="0"
            step="5"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className={`${fieldClass} px-3`}
          />
        </div>
        <div>
          <label htmlFor="addon-price" className={fieldLabelClass}>
            Extra Price (₱ PHP) <span className="text-burnt">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-glyph">
              +₱
            </span>
            <input
              id="addon-price"
              type="number"
              min="0"
              step="1"
              required
              value={pricePesos}
              onChange={(e) => setPricePesos(Number(e.target.value))}
              className={`${fieldClass} pl-8 pr-3`}
            />
          </div>
        </div>
      </div>

      {/* Applicable Services */}
      <div className="rounded-lg border border-hairline bg-mist p-4">
        <span className="text-sm font-semibold text-ink block mb-2">
          Service Applicability
        </span>
        <div className="mb-2.5 flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="applicability"
              checked={applyToAll}
              onChange={() => setApplyToAll(true)}
              className="accent-burnt focus-visible:ring-2 focus-visible:ring-burnt/40"
            />
            <span className="text-ink font-medium">All services</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="applicability"
              checked={!applyToAll}
              onChange={() => setApplyToAll(false)}
              className="accent-burnt focus-visible:ring-2 focus-visible:ring-burnt/40"
            />
            <span className="text-ink font-medium">Specific services only</span>
          </label>
        </div>

        {!applyToAll && (
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 pt-1 border-t border-hairline">
            {availableServices.map((srv) => (
              <label
                key={srv.id}
                className="flex items-center gap-2 rounded-lg border border-hairline bg-white px-2.5 py-1.5 text-xs transition cursor-pointer hover:bg-mist"
              >
                <input
                  type="checkbox"
                  checked={applicableServiceIds.includes(srv.id)}
                  onChange={() => toggleService(srv.id)}
                  className="size-3.5 rounded accent-burnt focus-visible:ring-2 focus-visible:ring-burnt/40"
                />
                <span className="font-medium text-ink truncate">{srv.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-white p-4">
        <div>
          <span className="text-sm font-semibold text-ink block">
            Active on booking menu
          </span>
          <span className="text-xs text-muted block">
            Enable clients to select this add-on during booking.
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-label="Active on booking menu"
          aria-checked={active}
          onClick={() => setActive(!active)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
            active ? "bg-burnt" : "bg-neutral-200"
          }`}
        >
          <span
            className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              active ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </CatalogFormDialog>
  );
}
