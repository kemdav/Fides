"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MerchantSidebar } from "@/components/merchant/merchant-sidebar";
import { Surface } from "@/components/admin/primitives";
import { saveBookingSettingsAction } from "@/app/actions/booking-settings";
import type {
  BookingSettingsFormValues,
  BookingSettingsWorkspaceData,
} from "@/types/booking-settings";
import {
  BookingSettingsSavedModal,
  ConfirmDiscardModal,
} from "./booking-settings-modals";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: number;
  label: string;
}

const BUFFER_OPTIONS: SelectOption[] = [
  { value: 0, label: "No buffer (0 minutes)" },
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 20, label: "20 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "60 minutes" },
];

const LEAD_TIME_OPTIONS: SelectOption[] = [
  { value: 0, label: "No minimum notice" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 240, label: "4 hours" },
  { value: 720, label: "12 hours" },
  { value: 1440, label: "24 hours" },
  { value: 2880, label: "48 hours" },
];

const MAX_ADVANCE_OPTIONS: SelectOption[] = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
  { value: 180, label: "180 days" },
  { value: 365, label: "365 days" },
];

const CUTOFF_HOURS_OPTIONS: SelectOption[] = [
  { value: 0, label: "Anytime (no cutoff)" },
  { value: 2, label: "2 hours before appointment" },
  { value: 6, label: "6 hours before appointment" },
  { value: 12, label: "12 hours before appointment" },
  { value: 24, label: "24 hours before appointment" },
  { value: 48, label: "48 hours before appointment" },
  { value: 72, label: "72 hours before appointment" },
];

const SLOT_INTERVAL_OPTIONS: SelectOption[] = [
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 20, label: "20 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "60 minutes" },
];

function ensureOptionPresent(
  options: SelectOption[],
  currentValue: number,
  formatFallback: (value: number) => string,
): SelectOption[] {
  if (options.some((opt) => opt.value === currentValue)) {
    return options;
  }
  return [
    ...options,
    { value: currentValue, label: formatFallback(currentValue) },
  ].sort((a, b) => a.value - b.value);
}

function areSettingsEqual(
  a: BookingSettingsFormValues,
  b: BookingSettingsFormValues,
): boolean {
  return (
    a.autoConfirm === b.autoConfirm &&
    a.staffAssignmentMode === b.staffAssignmentMode &&
    a.defaultBufferMinutes === b.defaultBufferMinutes &&
    a.bookingLeadTimeMinutes === b.bookingLeadTimeMinutes &&
    a.maxAdvanceDays === b.maxAdvanceDays &&
    a.cancellationWindowHours === b.cancellationWindowHours &&
    a.rescheduleWindowHours === b.rescheduleWindowHours &&
    a.cancellationPolicyNotes === b.cancellationPolicyNotes &&
    a.slotIntervalMinutes === b.slotIntervalMinutes
  );
}

function formatLastSavedDate(iso: string | null): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function CheckBadgeIcon() {
  return (
    <span
      className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-white text-[#C35000]"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-2.5"
      >
        <path d="M3.5 8.2L6.5 11.2L12.5 5" />
      </svg>
    </span>
  );
}

function ChevronDownSvg() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#475569]"
      aria-hidden="true"
    >
      <path d="M5.5 7.5L10 12L14.5 7.5" />
    </svg>
  );
}

interface BookingSettingsViewProps {
  initialData: BookingSettingsWorkspaceData;
  basePath?: string;
}

export function BookingSettingsView({
  initialData,
  basePath = "",
}: BookingSettingsViewProps) {
  const router = useRouter();
  const { meta } = initialData;
  const canEdit = meta.canEdit;

  const [savedSettings, setSavedSettings] =
    React.useState<BookingSettingsFormValues>(initialData.settings);
  const [form, setForm] = React.useState<BookingSettingsFormValues>(
    initialData.settings,
  );
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(
    meta.lastSavedAt,
  );
  const [lastSavedByName, setLastSavedByName] = React.useState<string | null>(
    meta.lastSavedByName,
  );

  const [isSaving, setIsSaving] = React.useState(false);
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  );

  const [showSavedModal, setShowSavedModal] = React.useState(false);
  const [showDiscardModal, setShowDiscardModal] = React.useState(false);
  const [pendingNavHref, setPendingNavHref] = React.useState<string | null>(
    null,
  );

  const isDirty = React.useMemo(
    () => !areSettingsEqual(form, savedSettings),
    [form, savedSettings],
  );

  const websiteSettingsHref = `${basePath}/dashboard/settings/website`;

  // Browser tab close / refresh guard when unsaved changes exist
  React.useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Intercept in-app link clicks (sidebar links, Website Settings link) when dirty
  React.useEffect(() => {
    if (!isDirty) return;
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;

      const targetUrl = new URL(anchor.href, window.location.origin);
      if (targetUrl.origin !== window.location.origin) return;
      if (
        targetUrl.pathname === window.location.pathname &&
        targetUrl.search === window.location.search
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setPendingNavHref(
        `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`,
      );
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () =>
      document.removeEventListener("click", handleDocumentClick, true);
  }, [isDirty]);

  const updateField = <K extends keyof BookingSettingsFormValues>(
    key: K,
    value: BookingSettingsFormValues[K],
  ) => {
    if (!canEdit) return;
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrorBanner(null);
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    if (!canEdit || !isDirty || isSaving) return;
    setIsSaving(true);
    setErrorBanner(null);
    setFieldErrors({});

    try {
      const result = await saveBookingSettingsAction(meta.tenantId, form);
      if (!result.success) {
        setErrorBanner(result.error);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        return;
      }

      if (result.data) {
        setSavedSettings(result.data.settings);
        setForm(result.data.settings);
        setLastSavedAt(result.data.lastSavedAt);
        setLastSavedByName(result.data.lastSavedByName);
      } else {
        setSavedSettings(form);
      }
      setShowSavedModal(true);
    } catch {
      setErrorBanner(
        "Something went wrong while saving your booking settings.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDiscard = () => {
    setForm(savedSettings);
    setErrorBanner(null);
    setFieldErrors({});
    setShowDiscardModal(false);
  };

  const handleConfirmLeave = () => {
    const destination = pendingNavHref;
    setForm(savedSettings);
    setPendingNavHref(null);
    if (destination) {
      router.push(destination);
    }
  };

  const bufferOptions = React.useMemo(
    () =>
      ensureOptionPresent(
        BUFFER_OPTIONS,
        form.defaultBufferMinutes,
        (v) => `${v} minutes`,
      ),
    [form.defaultBufferMinutes],
  );

  const leadTimeOptions = React.useMemo(
    () =>
      ensureOptionPresent(
        LEAD_TIME_OPTIONS,
        form.bookingLeadTimeMinutes,
        (v) => (v % 60 === 0 ? `${v / 60} hours` : `${v} minutes`),
      ),
    [form.bookingLeadTimeMinutes],
  );

  const maxAdvanceOptions = React.useMemo(
    () =>
      ensureOptionPresent(
        MAX_ADVANCE_OPTIONS,
        form.maxAdvanceDays,
        (v) => `${v} days`,
      ),
    [form.maxAdvanceDays],
  );

  const cancellationOptions = React.useMemo(
    () =>
      ensureOptionPresent(
        CUTOFF_HOURS_OPTIONS,
        form.cancellationWindowHours,
        (v) => `${v} hours before appointment`,
      ),
    [form.cancellationWindowHours],
  );

  const rescheduleOptions = React.useMemo(
    () =>
      ensureOptionPresent(
        CUTOFF_HOURS_OPTIONS,
        form.rescheduleWindowHours,
        (v) => `${v} hours before appointment`,
      ),
    [form.rescheduleWindowHours],
  );

  const slotIntervalOptions = React.useMemo(
    () =>
      ensureOptionPresent(
        SLOT_INTERVAL_OPTIONS,
        form.slotIntervalMinutes,
        (v) => `${v} minutes`,
      ),
    [form.slotIntervalMinutes],
  );

  const formattedSavedDate = formatLastSavedDate(lastSavedAt);

  return (
    <div className="flex min-h-dvh flex-col bg-[#FCFAE8] text-[#1E293B] lg:flex-row">
      <MerchantSidebar
        businessName={meta.businessName}
        userName={meta.userName}
        userEmail={meta.userEmail}
        userRole={meta.userRole}
        basePath={basePath}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex w-full min-w-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
          {/* Page Header */}
          <header className="flex flex-col gap-1">
            <h1 className="font-display text-[28px] leading-[36px] text-[#1E293B] sm:text-[32px] sm:leading-[40px]">
              Booking Settings
            </h1>
            <p className="text-sm leading-relaxed text-[#64748B]">
              Set the rules that shape your customer booking experience.
            </p>
          </header>

          {/* Timezone Info Banner */}
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#E7E9EE] bg-[#F4F5F7] px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-[#1E293B]">
                Business timezone: {meta.timeZone}
              </p>
              <p className="text-xs leading-relaxed text-[#64748B]">
                Booking slots and cancellation/rescheduling cutoffs use this
                timezone. Buffer times are durations.
              </p>
            </div>
            <Link
              href={websiteSettingsHref}
              className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#C35000] transition-colors hover:text-[#A64400]"
            >
              <span>Go to Website Settings</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          {/* Read-only banner for non-owners */}
          {!canEdit && (
            <div className="rounded-xl border border-[#F3D5B5] bg-[#FFF8F1] px-4 py-3 text-sm text-[#8A3B00]">
              You have view-only access to booking rules. Only the business
              owner can modify and save changes.
            </div>
          )}

          {/* Error Banner */}
          {errorBanner && (
            <div
              role="alert"
              className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-medium text-[#B91C1C]"
            >
              {errorBanner}
            </div>
          )}

          {/* 2-Column Configuration Grid */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {/* LEFT COLUMN */}
            <div className="flex flex-col gap-5">
              {/* Card 1: Workflow & Approvals */}
              <Surface className="rounded-xl border border-[#ECEAE0] bg-white p-5 sm:p-6">
                <h2 className="text-base font-semibold text-[#1E293B]">
                  Workflow &amp; Approvals
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                  Choose how new booking requests are confirmed.
                </p>

                <div className="mt-4">
                  <span className="block text-xs font-semibold text-[#1E293B]">
                    Approval mode
                  </span>
                  <div
                    role="radiogroup"
                    aria-label="Approval mode"
                    className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={form.autoConfirm}
                      disabled={!canEdit}
                      onClick={() => updateField("autoConfirm", true)}
                      className={cn(
                        "flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C35000]/40 disabled:cursor-not-allowed disabled:opacity-60",
                        form.autoConfirm
                          ? "bg-[#C35000] text-white shadow-xs"
                          : "bg-[#949BA3] text-white hover:bg-[#7F8790]",
                      )}
                    >
                      {form.autoConfirm && <CheckBadgeIcon />}
                      <span>Automatic Confirmation</span>
                    </button>

                    <button
                      type="button"
                      role="radio"
                      aria-checked={!form.autoConfirm}
                      disabled={!canEdit}
                      onClick={() => updateField("autoConfirm", false)}
                      className={cn(
                        "flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C35000]/40 disabled:cursor-not-allowed disabled:opacity-60",
                        !form.autoConfirm
                          ? "bg-[#C35000] text-white shadow-xs"
                          : "bg-[#949BA3] text-white hover:bg-[#7F8790]",
                      )}
                    >
                      {!form.autoConfirm && <CheckBadgeIcon />}
                      <span>Manual Approval</span>
                    </button>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-[#64748B]">
                    Automatic confirms immediately. Manual approval waits for
                    the owner or receptionist to confirm.
                  </p>
                </div>
              </Surface>

              {/* Card 2: Staff & Capacity */}
              <Surface className="rounded-xl border border-[#ECEAE0] bg-white p-5 sm:p-6">
                <h2 className="text-base font-semibold text-[#1E293B]">
                  Staff &amp; Capacity
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                  Choose how staff are assigned and reserve preparation time.
                </p>

                {/* Staff assignment toggle */}
                <div className="mt-4">
                  <span className="block text-xs font-semibold text-[#1E293B]">
                    Staff assignment
                  </span>
                  <div
                    role="radiogroup"
                    aria-label="Staff assignment mode"
                    className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={
                        form.staffAssignmentMode === "specific_staff"
                      }
                      disabled={!canEdit}
                      onClick={() =>
                        updateField("staffAssignmentMode", "specific_staff")
                      }
                      className={cn(
                        "flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C35000]/40 disabled:cursor-not-allowed disabled:opacity-60",
                        form.staffAssignmentMode === "specific_staff"
                          ? "bg-[#C35000] text-white shadow-xs"
                          : "bg-[#949BA3] text-white hover:bg-[#7F8790]",
                      )}
                    >
                      {form.staffAssignmentMode === "specific_staff" && (
                        <CheckBadgeIcon />
                      )}
                      <span>Specific Staff</span>
                    </button>

                    <button
                      type="button"
                      role="radio"
                      aria-checked={
                        form.staffAssignmentMode === "any_available"
                      }
                      disabled={!canEdit}
                      onClick={() =>
                        updateField("staffAssignmentMode", "any_available")
                      }
                      className={cn(
                        "flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C35000]/40 disabled:cursor-not-allowed disabled:opacity-60",
                        form.staffAssignmentMode === "any_available"
                          ? "bg-[#C35000] text-white shadow-xs"
                          : "bg-[#949BA3] text-white hover:bg-[#7F8790]",
                      )}
                    >
                      {form.staffAssignmentMode === "any_available" && (
                        <CheckBadgeIcon />
                      )}
                      <span>Any Available</span>
                    </button>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-[#64748B]">
                    {form.staffAssignmentMode === "specific_staff"
                      ? "Customers choose their preferred staff member during booking."
                      : "The system automatically assigns an eligible available staff member."}
                  </p>
                </div>

                {/* Business Default Buffer */}
                <div className="mt-5">
                  <label
                    htmlFor="default-buffer-minutes"
                    className="block text-xs font-semibold text-[#1E293B]"
                  >
                    Business Default Buffer
                  </label>
                  <div className="relative mt-2">
                    <select
                      id="default-buffer-minutes"
                      disabled={!canEdit}
                      value={form.defaultBufferMinutes}
                      onChange={(e) =>
                        updateField(
                          "defaultBufferMinutes",
                          Number(e.target.value),
                        )
                      }
                      className="h-10 w-full appearance-none rounded-lg border border-[#D9DDE3] bg-white pl-3.5 pr-9 text-sm text-[#1E293B] transition-colors focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#64748B]"
                    >
                      {bufferOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDownSvg />
                  </div>
                  {fieldErrors.defaultBufferMinutes && (
                    <p className="mt-1.5 text-xs font-medium text-[#DC2626]">
                      {fieldErrors.defaultBufferMinutes}
                    </p>
                  )}
                  <p className="mt-2 text-xs leading-relaxed text-[#64748B]">
                    Reserved for cleanup and preparation between appointments.
                  </p>

                  <div className="mt-3 rounded-lg bg-[#F1F3F5] px-3.5 py-2.5 text-xs leading-relaxed text-[#475569]">
                    A service buffer replaces the business default; the values
                    are never added. Effective buffer: service value &rarr;
                    business default &rarr; 0.
                  </div>
                </div>
              </Surface>
            </div>

            {/* RIGHT COLUMN */}
            <div className="flex flex-col gap-5">
              {/* Card 3: Booking Windows & Cancellations */}
              <Surface className="rounded-xl border border-[#ECEAE0] bg-white p-5 sm:p-6">
                <h2 className="text-base font-semibold text-[#1E293B]">
                  Booking Windows &amp; Cancellations
                </h2>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Minimum advance notice */}
                  <div>
                    <label
                      htmlFor="min-advance-notice"
                      className="block text-xs font-semibold text-[#1E293B]"
                    >
                      Minimum advance notice
                    </label>
                    <div className="relative mt-2">
                      <select
                        id="min-advance-notice"
                        disabled={!canEdit}
                        value={form.bookingLeadTimeMinutes}
                        onChange={(e) =>
                          updateField(
                            "bookingLeadTimeMinutes",
                            Number(e.target.value),
                          )
                        }
                        className="h-10 w-full appearance-none rounded-lg border border-[#D9DDE3] bg-white pl-3.5 pr-9 text-sm text-[#1E293B] transition-colors focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#64748B]"
                      >
                        {leadTimeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDownSvg />
                    </div>
                    {fieldErrors.bookingLeadTimeMinutes && (
                      <p className="mt-1.5 text-xs font-medium text-[#DC2626]">
                        {fieldErrors.bookingLeadTimeMinutes}
                      </p>
                    )}
                  </div>

                  {/* Maximum advance booking */}
                  <div>
                    <label
                      htmlFor="max-advance-booking"
                      className="block text-xs font-semibold text-[#1E293B]"
                    >
                      Maximum advance booking
                    </label>
                    <div className="relative mt-2">
                      <select
                        id="max-advance-booking"
                        disabled={!canEdit}
                        value={form.maxAdvanceDays}
                        onChange={(e) =>
                          updateField("maxAdvanceDays", Number(e.target.value))
                        }
                        className="h-10 w-full appearance-none rounded-lg border border-[#D9DDE3] bg-white pl-3.5 pr-9 text-sm text-[#1E293B] transition-colors focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#64748B]"
                      >
                        {maxAdvanceOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDownSvg />
                    </div>
                    {fieldErrors.maxAdvanceDays && (
                      <p className="mt-1.5 text-xs font-medium text-[#DC2626]">
                        {fieldErrors.maxAdvanceDays}
                      </p>
                    )}
                  </div>
                </div>

                {/* Cancellation deadline */}
                <div className="mt-4">
                  <label
                    htmlFor="cancellation-deadline"
                    className="block text-xs font-semibold text-[#1E293B]"
                  >
                    Cancellation deadline
                  </label>
                  <div className="relative mt-2">
                    <select
                      id="cancellation-deadline"
                      disabled={!canEdit}
                      value={form.cancellationWindowHours}
                      onChange={(e) =>
                        updateField(
                          "cancellationWindowHours",
                          Number(e.target.value),
                        )
                      }
                      className="h-10 w-full appearance-none rounded-lg border border-[#D9DDE3] bg-white pl-3.5 pr-9 text-sm text-[#1E293B] transition-colors focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#64748B]"
                    >
                      {cancellationOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDownSvg />
                  </div>
                  {fieldErrors.cancellationWindowHours && (
                    <p className="mt-1.5 text-xs font-medium text-[#DC2626]">
                      {fieldErrors.cancellationWindowHours}
                    </p>
                  )}
                </div>

                {/* Rescheduling deadline */}
                <div className="mt-4">
                  <label
                    htmlFor="reschedule-deadline"
                    className="block text-xs font-semibold text-[#1E293B]"
                  >
                    Rescheduling deadline
                  </label>
                  <div className="relative mt-2">
                    <select
                      id="reschedule-deadline"
                      disabled={!canEdit}
                      value={form.rescheduleWindowHours}
                      onChange={(e) =>
                        updateField(
                          "rescheduleWindowHours",
                          Number(e.target.value),
                        )
                      }
                      className="h-10 w-full appearance-none rounded-lg border border-[#D9DDE3] bg-white pl-3.5 pr-9 text-sm text-[#1E293B] transition-colors focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#64748B]"
                    >
                      {rescheduleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDownSvg />
                  </div>
                  {fieldErrors.rescheduleWindowHours && (
                    <p className="mt-1.5 text-xs font-medium text-[#DC2626]">
                      {fieldErrors.rescheduleWindowHours}
                    </p>
                  )}
                </div>

                {/* Cancellation policy rules */}
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="cancellation-policy-notes"
                      className="block text-xs font-semibold text-[#1E293B]"
                    >
                      Cancellation policy rules
                    </label>
                    <span className="text-[11px] text-[#94A3B8]">
                      {form.cancellationPolicyNotes.length}/500
                    </span>
                  </div>
                  <textarea
                    id="cancellation-policy-notes"
                    rows={3}
                    maxLength={500}
                    disabled={!canEdit}
                    value={form.cancellationPolicyNotes}
                    onChange={(e) =>
                      updateField("cancellationPolicyNotes", e.target.value)
                    }
                    placeholder="Optional rules shown to customers (e.g., Late cancellations within 24 hours may require rebooking approval)."
                    className="mt-2 w-full resize-none rounded-lg border border-[#D9DDE3] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] transition-colors focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#64748B]"
                  />
                  {fieldErrors.cancellationPolicyNotes && (
                    <p className="mt-1.5 text-xs font-medium text-[#DC2626]">
                      {fieldErrors.cancellationPolicyNotes}
                    </p>
                  )}
                </div>

                <p className="mt-3 text-xs leading-relaxed text-[#64748B]">
                  Changes apply to new bookings. Existing confirmed appointments
                  keep their original schedule.
                </p>
              </Surface>

              {/* Card 4: Scheduling */}
              <Surface className="rounded-xl border border-[#ECEAE0] bg-white p-5 sm:p-6">
                <h2 className="text-base font-semibold text-[#1E293B]">
                  Scheduling
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                  Choose the spacing of available start times.
                </p>

                <div className="mt-4">
                  <label
                    htmlFor="slot-interval-minutes"
                    className="block text-xs font-semibold text-[#1E293B]"
                  >
                    Slot Interval
                  </label>
                  <div className="relative mt-2">
                    <select
                      id="slot-interval-minutes"
                      disabled={!canEdit}
                      value={form.slotIntervalMinutes}
                      onChange={(e) =>
                        updateField(
                          "slotIntervalMinutes",
                          Number(e.target.value),
                        )
                      }
                      className="h-10 w-full appearance-none rounded-lg border border-[#D9DDE3] bg-white pl-3.5 pr-9 text-sm text-[#1E293B] transition-colors focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#64748B]"
                    >
                      {slotIntervalOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDownSvg />
                  </div>
                  {fieldErrors.slotIntervalMinutes && (
                    <p className="mt-1.5 text-xs font-medium text-[#DC2626]">
                      {fieldErrors.slotIntervalMinutes}
                    </p>
                  )}
                  <p className="mt-2 text-xs leading-relaxed text-[#64748B]">
                    Controls how frequently start times appear on your booking
                    calendar (for example, every 15 minutes: 9:00, 9:15, 9:30).
                  </p>
                </div>
              </Surface>
            </div>
          </div>
        </main>

        {/* Sticky Footer Save Bar */}
        <footer className="sticky bottom-0 z-20 border-t border-[#E7E5DC] bg-white/95 backdrop-blur-xs">
          <div className="flex w-full flex-col gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
            <div className="rounded-lg bg-[#F1F3F5] px-3.5 py-2 text-xs text-[#475569]">
              Changes apply to new bookings after saving. Existing confirmed
              appointments keep their original schedule.
            </div>

            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="space-y-0.5">
                <p
                  className={cn(
                    "text-xs font-semibold",
                    isDirty ? "text-[#C35000]" : "text-[#334155]",
                  )}
                >
                  {isDirty ? "Unsaved changes" : "All changes saved"}
                </p>
                <p className="text-xs text-[#64748B]">
                  {formattedSavedDate
                    ? `Last saved${lastSavedByName ? ` by ${lastSavedByName}` : ""} · ${formattedSavedDate}`
                    : "Using default booking configuration"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={!canEdit || !isDirty || isSaving}
                  onClick={() => setShowDiscardModal(true)}
                  className="h-10 rounded-lg border border-[#D9DDE3] bg-white px-4 text-xs font-semibold text-[#334155] transition-colors hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C35000]/40 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Discard changes
                </button>
                <button
                  type="button"
                  disabled={!canEdit || !isDirty || isSaving}
                  onClick={handleSave}
                  className="h-10 min-w-[124px] rounded-lg bg-[#C35000] px-5 text-xs font-semibold text-white transition-colors hover:bg-[#A64400] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C35000]/40 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Confirmation Modals */}
      <BookingSettingsSavedModal
        isOpen={showSavedModal}
        timeZone={meta.timeZone}
        onClose={() => setShowSavedModal(false)}
      />

      <ConfirmDiscardModal
        isOpen={showDiscardModal}
        variant="discard"
        onKeepEditing={() => setShowDiscardModal(false)}
        onConfirmDiscard={handleConfirmDiscard}
      />

      <ConfirmDiscardModal
        isOpen={pendingNavHref !== null}
        variant="leave"
        onKeepEditing={() => setPendingNavHref(null)}
        onConfirmDiscard={handleConfirmLeave}
      />
    </div>
  );
}
