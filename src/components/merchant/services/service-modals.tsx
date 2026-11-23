"use client";

import * as React from "react";
import { Icon } from "@/components/admin/icon";
import type {
  AddonDTO,
  PackageDTO,
  ServiceCategoryDTO,
  ServiceDTO,
  StaffOptionDTO,
} from "@/types/services";

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

  const toggleStaff = (staffId: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId]
    );
  };

  const toggleAllStaff = () => {
    if (selectedStaffIds.length === staff.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(staff.map((s) => s.id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        className="relative my-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <div>
            <h2 id="service-modal-title" className="text-base font-semibold text-neutral-900">
              {isEdit ? "Edit Service" : "Add Service"}
            </h2>
            <p className="text-xs text-neutral-500">
              {isEdit
                ? "Update pricing, duration, and staff assignments."
                : "Create a new bookable service for your catalog."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition"
            aria-label="Close"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Service Photo Dropzone (Figma aligned) */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Service Photo <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50/50 p-4 text-center hover:bg-neutral-50 transition cursor-pointer group">
              <div className="flex size-9 items-center justify-center rounded-full bg-white text-neutral-500 shadow-2xs mb-1.5 group-hover:text-[#C84B00] group-hover:scale-105 transition">
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <p className="text-xs font-medium text-neutral-700">
                Click to upload or drag & drop photo
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                PNG, JPG, or WEBP up to 5MB (1:1 aspect ratio recommended)
              </p>
            </div>
          </div>

          {/* Service Title */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Service Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Signature Haircut, Balayage, Manicure"
              className="w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#C84B00] focus:ring-2 focus:ring-[#C84B00]/20 focus:outline-none transition"
            />
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Category
              </label>
              <select
                value={categoryId || ""}
                onChange={(e) => setCategoryId(e.target.value || null)}
                className="w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-[#C84B00] focus:ring-2 focus:ring-[#C84B00]/20 focus:outline-none transition bg-white"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what is included in this service..."
              className="w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#C84B00] focus:ring-2 focus:ring-[#C84B00]/20 focus:outline-none transition resize-none"
            />
          </div>

          {/* Duration & Price Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Duration (minutes) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="5"
                step="5"
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-[#C84B00] focus:ring-2 focus:ring-[#C84B00]/20 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Base Price (₱ PHP) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2 text-sm font-medium text-neutral-400">
                  ₱
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={pricePesos}
                  onChange={(e) => setPricePesos(Number(e.target.value))}
                  className="w-full rounded-xl border border-neutral-300 pl-8 pr-3.5 py-2 text-sm text-neutral-900 focus:border-[#C84B00] focus:ring-2 focus:ring-[#C84B00]/20 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Buffer Minutes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Buffer Time (minutes between bookings)
            </label>
            <input
              type="number"
              min="0"
              step="5"
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(Number(e.target.value))}
              placeholder="e.g. 10 mins clean-up"
              className="w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-[#C84B00] focus:ring-2 focus:ring-[#C84B00]/20 focus:outline-none transition"
            />
          </div>

          {/* Staff Eligibility */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <span className="text-xs font-semibold text-neutral-800">
                  Eligible Staff Members
                </span>
                <p className="text-[11px] text-neutral-500">
                  Assign stylists or staff who can provide this service.
                </p>
              </div>
              {staff.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAllStaff}
                  className="text-xs font-semibold text-[#C84B00] hover:underline"
                >
                  {selectedStaffIds.length === staff.length
                    ? "Deselect all"
                    : "Select all"}
                </button>
              )}
            </div>

            {staff.length === 0 ? (
              <p className="text-xs text-neutral-400 italic py-2">
                No active staff members registered yet.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {staff.map((member) => {
                  const checked = selectedStaffIds.includes(member.id);
                  const initials = member.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();
                  return (
                    <label
                      key={member.id}
                      className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs transition cursor-pointer hover:bg-neutral-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStaff(member.id)}
                        className="size-4 rounded text-[#C84B00] focus:ring-[#C84B00]"
                      />
                      <div className="flex size-6 items-center justify-center rounded-full bg-[#C84B00]/15 text-[10px] font-bold text-[#C84B00]">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-neutral-900 block truncate">
                          {member.fullName}
                        </span>
                        {member.title && (
                          <span className="text-[10px] text-neutral-400 block truncate">
                            {member.title}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Toggle Switch */}
          <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3.5">
            <div>
              <span className="text-xs font-semibold text-neutral-900 block">
                Active on booking menu
              </span>
              <span className="text-[11px] text-neutral-500 block">
                When enabled, clients can browse and book this service online.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => setActive(!active)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                active ? "bg-[#C84B00]" : "bg-neutral-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  active ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
            <div>
              {isEdit && initialService && onDelete && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onDelete(initialService)}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-xl transition shadow-2xs disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#C84B00] hover:bg-[#A94400] rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {isLoading ? "Saving..." : isEdit ? "Save changes" : "Add Service"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        className="relative my-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-modal-title"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <div>
            <h2 id="package-modal-title" className="text-base font-semibold text-neutral-900">
              {isEdit ? "Edit Package" : "Add Package"}
            </h2>
            <p className="text-xs text-neutral-500">
              Bundle multiple services together at a special bundle price.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition"
            aria-label="Close"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Package Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Total Glow Makeover, Bridal Package"
              className="w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#C84B00] focus:ring-2 focus:ring-[#C84B00]/20 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the benefits or inclusions of this package..."
              className="w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#C84B00] focus:ring-2 focus:ring-[#C84B00]/20 focus:outline-none transition resize-none"
            />
          </div>

          {/* Bundled Services Selection */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-800">
                Bundled Services <span className="text-red-500">*</span>
              </span>
              <span className="text-[11px] font-medium text-neutral-500">
                {selectedServiceIds.length} selected
                {regularTotalPrice > 0 && ` (Regular: ₱${regularTotalPrice.toLocaleString("en-PH")})`}
              </span>
            </div>

            {availableServices.length === 0 ? (
              <p className="text-xs text-neutral-400 italic py-2">
                No active services available to bundle. Create services first.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {availableServices.map((srv) => {
                  const checked = selectedServiceIds.includes(srv.id);
                  return (
                    <label
                      key={srv.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs transition cursor-pointer hover:bg-neutral-50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleService(srv.id)}
                          className="size-4 rounded text-[#C84B00] focus:ring-[#C84B00]"
                        />
                        <span className="font-medium text-neutral-900 truncate">
                          {srv.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0 text-neutral-500 text-[11px]">
                        <span>{srv.durationMinutes} min</span> •{" "}
                        <span className="font-semibold text-neutral-700">
                          {srv.priceFormatted}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Package Duration (mins) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="10"
                step="5"
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-[#C84B00] focus:ring-2 focus:ring-[#C84B00]/20 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Bundle Price (₱ PHP) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2 text-sm font-medium text-neutral-400">
                  ₱
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={pricePesos}
                  onChange={(e) => setPricePesos(Number(e.target.value))}
                  className="w-full rounded-xl border border-neutral-300 pl-8 pr-3.5 py-2 text-sm text-neutral-900 focus:border-[#C84B00] focus:ring-2 focus:ring-[#C84B00]/20 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3.5">
            <div>
              <span className="text-xs font-semibold text-neutral-900 block">
                Active on booking menu
              </span>
              <span className="text-[11px] text-neutral-500 block">
                Make this package available for clients to book online.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => setActive(!active)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                active ? "bg-[#C84B00]" : "bg-neutral-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  active ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
            <div>
              {isEdit && initialPackage && onDelete && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onDelete(initialPackage)}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-xl transition shadow-2xs disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#C84B00] hover:bg-[#A94400] rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {isLoading ? "Saving..." : isEdit ? "Save changes" : "Create Package"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div
        className="relative my-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="addon-modal-title"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <div>
            <h2 id="addon-modal-title" className="text-base font-semibold text-neutral-900">
              {isEdit ? "Edit Add-on" : "Add Add-on"}
            </h2>
            <p className="text-xs text-neutral-500">
              Optional upgrades or extras clients can attach to their appointment.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition"
            aria-label="Close"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Add-on Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Scalp Massage, Deep Conditioning, Beard Oil"
              className="w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#C84B00] focus:ring-2 focus:ring-[#C84B00]/20 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the add-on treatment or extra..."
              className="w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#C84B00] focus:ring-2 focus:ring-[#C84B00]/20 focus:outline-none transition resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Extra Duration (mins)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-[#C84B00] focus:ring-2 focus:ring-[#C84B00]/20 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Extra Price (₱ PHP) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2 text-sm font-medium text-neutral-400">
                  +₱
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={pricePesos}
                  onChange={(e) => setPricePesos(Number(e.target.value))}
                  className="w-full rounded-xl border border-neutral-300 pl-9 pr-3.5 py-2 text-sm text-neutral-900 focus:border-[#C84B00] focus:ring-2 focus:ring-[#C84B00]/20 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Applicable Services */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3.5">
            <span className="text-xs font-semibold text-neutral-800 block mb-2">
              Service Applicability
            </span>
            <div className="flex items-center gap-4 text-xs mb-2.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="applicability"
                  checked={applyToAll}
                  onChange={() => setApplyToAll(true)}
                  className="text-[#C84B00] focus:ring-[#C84B00]"
                />
                <span className="text-neutral-800 font-medium">All services</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="applicability"
                  checked={!applyToAll}
                  onChange={() => setApplyToAll(false)}
                  className="text-[#C84B00] focus:ring-[#C84B00]"
                />
                <span className="text-neutral-800 font-medium">Specific services only</span>
              </label>
            </div>

            {!applyToAll && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 pt-1 border-t border-neutral-200">
                {availableServices.map((srv) => (
                  <label
                    key={srv.id}
                    className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs transition cursor-pointer hover:bg-neutral-50"
                  >
                    <input
                      type="checkbox"
                      checked={applicableServiceIds.includes(srv.id)}
                      onChange={() => toggleService(srv.id)}
                      className="size-3.5 rounded text-[#C84B00] focus:ring-[#C84B00]"
                    />
                    <span className="font-medium text-neutral-800 truncate">{srv.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3.5">
            <div>
              <span className="text-xs font-semibold text-neutral-900 block">
                Active on booking menu
              </span>
              <span className="text-[11px] text-neutral-500 block">
                Enable clients to select this add-on during booking.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => setActive(!active)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                active ? "bg-[#C84B00]" : "bg-neutral-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  active ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
            <div>
              {isEdit && initialAddon && onDelete && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onDelete(initialAddon)}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-xl transition shadow-2xs disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#C84B00] hover:bg-[#A94400] rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {isLoading ? "Saving..." : isEdit ? "Save changes" : "Add Add-on"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
