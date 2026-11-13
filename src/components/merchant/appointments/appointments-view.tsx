"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MerchantSidebar } from "../merchant-sidebar";
import { Icon } from "@/components/admin/icon";
import { AdminButton } from "@/components/admin/admin-button";
import { MetricCard } from "@/components/admin/metric-card";
import { PageContent, PageHeading, StatusPill, Surface } from "@/components/admin/primitives";
import {
  updateAppointmentStatusAction,
  createAppointmentBookingAction,
} from "@/app/actions/appointments";

export interface AppointmentItem {
  id: string;
  time: string;
  customer: string;
  service: string;
  staff: string;
  source: "Online" | "Walk-In";
  status: "Confirmed" | "Check In" | "Pending approval" | "In service" | "Completed" | "Cancelled";
  startsAt?: string;
}

interface AppointmentsViewProps {
  businessName?: string;
  userEmail?: string;
  tenantId?: string;
  todayCount?: number;
  awaitingCount?: number;
  checkedInCount?: number;
  completedTodayCount?: number;
  initialItems?: AppointmentItem[];
  basePath?: string;
}

function AppointmentStatusPill({ status }: { status: AppointmentItem["status"] }) {
  const toneMap: Record<AppointmentItem["status"], { tone: React.ComponentProps<typeof StatusPill>["tone"]; label: string }> = {
    "Confirmed":        { tone: "success",  label: "Confirmed" },
    "Pending approval": { tone: "warning",  label: "Pending approval" },
    "Check In":         { tone: "info",     label: "Check In" },
    "In service":       { tone: "info",     label: "In service" },
    "Completed":        { tone: "neutral",  label: "Completed" },
    "Cancelled":        { tone: "danger",   label: "Cancelled" },
  };
  const { tone, label } = toneMap[status] ?? { tone: "neutral", label: status };
  return <StatusPill tone={tone}>{label}</StatusPill>;
}

export function AppointmentsView({
  businessName = "Bella Vita",
  userEmail = "Maria Santos",
  tenantId,
  todayCount = 0,
  awaitingCount = 0,
  checkedInCount = 0,
  completedTodayCount = 0,
  initialItems = [],
  basePath = "",
}: AppointmentsViewProps) {
  const router = useRouter();
  const [items, setItems] = React.useState<AppointmentItem[]>(initialItems);
  const [prevInitialItems, setPrevInitialItems] = React.useState<AppointmentItem[]>(initialItems);
  if (initialItems !== prevInitialItems) {
    setPrevInitialItems(initialItems);
    setItems(initialItems);
  }

  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<string>("All");
  const [viewMode, setViewMode] = React.useState<"list" | "calendar">("list");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<AppointmentItem | null>(null);
  const [isNewBookingOpen, setIsNewBookingOpen] = React.useState(false);
  const [bookingType, setBookingType] = React.useState<"appointment" | "walk-in">("appointment");
  const [expandedAppointmentId, setExpandedAppointmentId] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [isBookingSubmitting, setIsBookingSubmitting] = React.useState(false);
  const [bookingError, setBookingError] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const filtered = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.staff.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "All" || item.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // QA #3: Persists to Supabase
  const handleStatusChange = async (id: string, newStatus: AppointmentItem["status"]) => {
    setActiveMenuId(null);
    const prevItems = items;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );

    try {
      const res = await updateAppointmentStatusAction({
        appointmentId: id,
        newStatus,
        tenantIdParam: tenantId,
      });

      if (!res.success) {
        setItems(prevItems);
        showToast(res.error || "Failed to update appointment status.");
        return;
      }
      showToast(`Appointment status updated to ${newStatus}`);
      router.refresh();
    } catch (err: unknown) {
      setItems(prevItems);
      showToast(err instanceof Error ? err.message : "Failed to update appointment status.");
    }
  };

  // QA #3: Cancel persists to Supabase
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    const target = cancelTarget;
    setCancelTarget(null);
    const prevItems = items;
    setItems((prev) => prev.filter((item) => item.id !== target.id));

    try {
      const res = await updateAppointmentStatusAction({
        appointmentId: target.id,
        newStatus: "Cancelled",
        tenantIdParam: tenantId,
      });

      if (!res.success) {
        setItems(prevItems);
        showToast(res.error || "Failed to cancel appointment.");
        return;
      }
      showToast(`Appointment for ${target.customer} cancelled.`);
      router.refresh();
    } catch (err: unknown) {
      setItems(prevItems);
      showToast(err instanceof Error ? err.message : "Failed to cancel appointment.");
    }
  };

  // QA #4: New booking persists to Supabase
  const handleNewBookingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const customer = (formData.get("customer") as string)?.trim();
    const service = (formData.get("service") as string)?.trim();
    const staff = (formData.get("staff") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim();
    const date = (formData.get("date") as string)?.trim();
    const time = (formData.get("time") as string)?.trim();

    if (!customer) {
      setBookingError("Customer name is required.");
      return;
    }

    setIsBookingSubmitting(true);
    setBookingError(null);

    try {
      const res = await createAppointmentBookingAction({
        customerName: customer,
        customerPhone: phone,
        serviceName: service,
        staffName: staff,
        date,
        time,
        source: bookingType === "walk-in" ? "walk_in" : "online",
        tenantIdParam: tenantId,
      });

      if (!res.success) {
        setBookingError(res.error || "Failed to create booking.");
        return;
      }
      if (!res.data) {
        setBookingError("Failed to create booking.");
        return;
      }

      const created = res.data;
      const newItem: AppointmentItem = {
        id: created.id,
        time: time || "10:00 AM",
        customer: created.customerName,
        service: created.serviceName,
        staff: created.staffName,
        source: bookingType === "walk-in" ? "Walk-In" : "Online",
        status: "Confirmed",
        startsAt: created.starts_at,
      };

      setItems((prev) => [newItem, ...prev]);
      setIsNewBookingOpen(false);
      showToast(`${bookingType === "walk-in" ? "Walk-in" : "New appointment"} booked for ${customer}`);
      router.refresh();
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : "Failed to create booking.");
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-powder text-ink lg:flex-row">
      <MerchantSidebar
        businessName={businessName}
        userEmail={userEmail}
        basePath={basePath}
      />

      <div className="min-w-0 flex-1">
        <PageContent>
          {/* Page Heading */}
          <PageHeading
            eyebrow="MERCHANT WORKSPACE"
            title="Appointments"
            description="Manage bookings, approvals, and appointment outcomes in one place."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <AdminButton
                  variant="primary"
                  size="sm"
                  onClick={() => { setBookingType("appointment"); setIsNewBookingOpen(true); }}
                >
                  + New Booking
                </AdminButton>
                <AdminButton
                  variant="outline"
                  size="sm"
                  onClick={() => { setBookingType("walk-in"); setIsNewBookingOpen(true); }}
                >
                  + Add Walk-in
                </AdminButton>
              </div>
            }
          />

          {/* KPI Metric Cards */}
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              featured
              label="Today's appointments"
              value={todayCount}
              caption="All bookings scheduled for today"
              icon="calendar"
              progress={66}
            />
            <MetricCard
              label="Awaiting approval"
              value={awaitingCount}
              caption="Review requests before the start time"
              icon="verified"
              progress={33}
            />
            <MetricCard
              label="Checked-in customers"
              value={checkedInCount}
              caption="Ready for their appointment"
              icon="users"
              progress={40}
            />
            <MetricCard
              label="Completed today"
              value={completedTodayCount}
              caption="Services completed today"
              icon="clock"
              progress={75}
            />
          </div>

          {/* Main Appointments Surface */}
          <Surface className="overflow-hidden !p-0">
            {/* Controls Bar */}
            <div className="p-4 sm:p-6 border-b border-hairline flex flex-wrap items-center justify-between gap-5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Icon name="calendar" className="size-5 text-glyph" />
                  <h2 className="text-base font-semibold leading-6 text-ink">
                    Appointments
                  </h2>
                </div>
                <span className="inline-flex items-center rounded-md bg-mist px-2 py-1 text-xs font-semibold leading-[18px] text-ink">
                  {items.length} appointments
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search customer or service"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 pl-10 pr-3 rounded-lg border border-hairline bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/40 w-48 sm:w-60 transition-shadow"
                  />
                  <Icon name="search" className="size-4 text-glyph absolute left-3 top-3 pointer-events-none" />
                </div>

                {/* Filter */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="h-11 rounded-lg border border-hairline bg-white px-3 text-sm font-semibold text-ink hover:bg-mist flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5 text-glyph" aria-hidden>
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    <span>Filter {filterStatus !== "All" ? `(${filterStatus})` : ""}</span>
                    <Icon name="chevron-down" className="size-3.5 text-glyph" />
                  </button>

                  {isFilterOpen && (
                    <div className="absolute right-0 mt-1 w-44 rounded-[10px] bg-white border border-hairline shadow-lg py-1 z-20 text-sm">
                      {["All", "Confirmed", "Pending approval", "Check In"].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => { setFilterStatus(status); setIsFilterOpen(false); }}
                          className={`w-full text-left px-4 py-2 hover:bg-mist ${filterStatus === status ? "text-burnt font-semibold" : "text-body"}`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* List / Calendar Toggle */}
                <div className="flex items-center border border-hairline rounded-lg overflow-hidden bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                      viewMode === "list" ? "bg-burnt text-white" : "text-muted hover:text-ink"
                    }`}
                  >
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("calendar")}
                    className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                      viewMode === "calendar" ? "bg-burnt text-white" : "text-muted hover:text-ink"
                    }`}
                  >
                    Calendar
                  </button>
                </div>
              </div>
            </div>

            {/* QA #2: Calendar View vs Table View */}
            {viewMode === "calendar" ? (
              <div className="p-4 sm:p-6">
                {filtered.length === 0 ? (
                  <div className="py-12 text-center text-xs text-subtle">
                    No appointments found matching your filter criteria.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[10px] bg-white border border-hairline p-5 shadow-[0_3px_7px_rgb(44_58_75/0.04)] space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-burnt bg-warn-bg border border-warn-bg px-2.5 py-1 rounded-lg font-mono">
                            {item.time}
                          </span>
                          <AppointmentStatusPill status={item.status} />
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-ink">{item.customer}</h4>
                          <p className="text-xs text-muted mt-0.5">{item.service}</p>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-subtle pt-2 border-t border-hairline">
                          <span>
                            Staff: <strong className="text-body font-medium">{item.staff}</strong>
                          </span>
                          <span className={item.source === "Walk-In" ? "text-burnt font-medium" : "text-subtle"}>
                            {item.source}
                          </span>
                        </div>

                        {/* Calendar Card Actions (QA #2) */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-hairline">
                          {item.status !== "Confirmed" && (
                            <AdminButton size="xs" variant="primary" onClick={() => handleStatusChange(item.id, "Confirmed")}>
                              Confirm
                            </AdminButton>
                          )}
                          {item.status !== "Check In" && (
                            <AdminButton size="xs" variant="outline" onClick={() => handleStatusChange(item.id, "Check In")}>
                              Check In
                            </AdminButton>
                          )}
                          <AdminButton size="xs" variant="danger" onClick={() => setCancelTarget(item)}>
                            Cancel
                          </AdminButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Table View */
              <>
                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-hairline">
                  {filtered.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm text-subtle">
                      No appointments found matching your filter criteria.
                    </p>
                  ) : (
                    filtered.map((row) => {
                      const isExpanded = expandedAppointmentId === row.id;
                      return (
                        <div key={row.id} className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setExpandedAppointmentId(isExpanded ? null : row.id)}
                            className="w-full text-left"
                            aria-expanded={isExpanded}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-ink">{row.customer}</p>
                                <p className="mt-1 text-sm text-muted">
                                  {row.time} · {row.service}
                                </p>
                              </div>
                              <AppointmentStatusPill status={row.status} />
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="mt-4 space-y-3 rounded-lg bg-powder p-4 text-sm text-muted">
                              <div className="grid grid-cols-2 gap-3">
                                <span>Staff<strong className="mt-1 block text-ink">{row.staff}</strong></span>
                                <span>Source<strong className="mt-1 block text-ink">{row.source}</strong></span>
                              </div>
                              <div className="flex flex-wrap gap-2 border-t border-hairline pt-3">
                                {row.status !== "Confirmed" && (
                                  <AdminButton size="xs" variant="primary" onClick={() => handleStatusChange(row.id, "Confirmed")}>
                                    Confirm
                                  </AdminButton>
                                )}
                                {row.status !== "Check In" && (
                                  <AdminButton size="xs" variant="outline" onClick={() => handleStatusChange(row.id, "Check In")}>
                                    Check In
                                  </AdminButton>
                                )}
                                <AdminButton size="xs" variant="danger" onClick={() => setCancelTarget(row)}>
                                  Cancel
                                </AdminButton>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-mist border-b border-hairline text-subtle font-semibold">
                      <tr>
                        <th className="px-5 py-3 text-[11px] leading-4 uppercase tracking-wide">Time</th>
                        <th className="px-5 py-3 text-[11px] leading-4 uppercase tracking-wide">Customer</th>
                        <th className="px-5 py-3 text-[11px] leading-4 uppercase tracking-wide">Service</th>
                        <th className="px-5 py-3 text-[11px] leading-4 uppercase tracking-wide">Staff</th>
                        <th className="px-5 py-3 text-[11px] leading-4 uppercase tracking-wide">Source</th>
                        <th className="px-5 py-3 text-[11px] leading-4 uppercase tracking-wide">Status</th>
                        <th className="px-5 py-3 text-[11px] leading-4 uppercase tracking-wide text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-8 text-center text-xs text-subtle">
                            No appointments found matching your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filtered.map((row) => (
                          <tr key={row.id} className="hover:bg-mist transition-colors">
                            <td className="px-5 py-3.5 font-medium text-body">{row.time}</td>
                            <td className="px-5 py-3.5 font-semibold text-ink">{row.customer}</td>
                            <td className="px-5 py-3.5 text-muted">{row.service}</td>
                            <td className="px-5 py-3.5 text-muted">{row.staff}</td>
                            <td className="px-5 py-3.5">
                              <span className={row.source === "Walk-In" ? "text-burnt font-medium" : "text-muted"}>
                                {row.source}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              {/* Clickable status transitions for active statuses */}
                              {row.status === "Check In" ? (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(row.id, "Confirmed")}
                                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 rounded-md"
                                >
                                  <AppointmentStatusPill status={row.status} />
                                </button>
                              ) : row.status === "Pending approval" ? (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(row.id, "Confirmed")}
                                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 rounded-md"
                                >
                                  <AppointmentStatusPill status={row.status} />
                                </button>
                              ) : (
                                <AppointmentStatusPill status={row.status} />
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right relative">
                              <button
                                type="button"
                                onClick={() => setActiveMenuId(activeMenuId === row.id ? null : row.id)}
                                className="flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 text-glyph ml-auto"
                              >
                                <Icon name="more" weight="fill" className="size-5" />
                              </button>

                              {activeMenuId === row.id && (
                                <div className="absolute right-4 mt-1 w-44 rounded-[10px] bg-white border border-hairline shadow-lg py-1 z-30 text-left text-sm">
                                  {row.status !== "Confirmed" && (
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(row.id, "Confirmed")}
                                      className="w-full text-left px-4 py-2 hover:bg-mist text-body"
                                    >
                                      Confirm
                                    </button>
                                  )}
                                  {row.status !== "Check In" && (
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(row.id, "Check In")}
                                      className="w-full text-left px-4 py-2 hover:bg-mist text-body"
                                    >
                                      Check In
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => { setCancelTarget(row); setActiveMenuId(null); }}
                                    className="w-full text-left px-4 py-2 hover:bg-danger-bg text-danger font-medium"
                                  >
                                    Cancel booking
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="p-4 sm:p-6 border-t border-hairline flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
                  <span>Showing {filtered.length} of {items.length} appointments · All times in Asia/Manila (UTC+8)</span>
                </div>
              </>
            )}
          </Surface>
        </PageContent>
      </div>

      {/* Confirmation Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-white px-4 py-2.5 rounded-[10px] shadow-xl text-xs font-medium">
          {toastMessage}
        </div>
      )}

      {/* Cancel Confirmation Modal (QA #3) */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-[10px] bg-white p-6 shadow-2xl border border-line">
            <h3 className="font-display text-[22px] leading-tight text-ink">
              Cancel Appointment?
            </h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Are you sure you want to cancel the appointment for{" "}
              <span className="font-semibold text-ink">{cancelTarget.customer}</span> ({cancelTarget.service}) at {cancelTarget.time}?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <AdminButton variant="outline" size="xs" onClick={() => setCancelTarget(null)}>
                Keep
              </AdminButton>
              <AdminButton variant="danger" size="xs" onClick={handleConfirmCancel}>
                Confirm Cancel
              </AdminButton>
            </div>
          </div>
        </div>
      )}

      {/* New Booking Modal (QA #4) */}
      {isNewBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[10px] bg-white p-6 sm:p-8 shadow-2xl border border-line space-y-5">
            <div className="flex items-start justify-between pb-5 border-b border-hairline">
              <div>
                <h3 className="font-display text-[28px] leading-[38px] text-ink">
                  {bookingType === "walk-in" ? "Add Walk-in" : "New Appointment"}
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {bookingType === "walk-in"
                    ? "Create an immediate appointment or add the customer to the waiting list."
                    : "Create a booking for an existing or new customer."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setIsNewBookingOpen(false); setBookingError(null); }}
                className="flex size-9 items-center justify-center rounded-lg text-glyph hover:bg-mist hover:text-ink transition-colors"
                aria-label={`Close ${bookingType === "walk-in" ? "walk-in" : "appointment"} form`}
              >
                <Icon name="close" className="size-5" />
              </button>
            </div>

            {bookingError && (
              <div className="rounded-lg border border-danger/20 bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
                {bookingError}
              </div>
            )}

            <form onSubmit={handleNewBookingSubmit} className="space-y-5 text-sm">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">
                  Customer name <span className="text-burnt">*</span>
                </label>
                <input
                  name="customer"
                  required
                  placeholder="e.g. Jessica Alva"
                  className="h-12 w-full rounded-lg border border-outline bg-white px-4 text-sm text-ink placeholder:text-glyph focus:outline-none focus:ring-2 focus:ring-burnt/30 focus:border-burnt"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-ink">Service</label>
                  <input
                    name="service"
                    defaultValue="Signature haircut"
                    className="h-12 w-full rounded-lg border border-outline bg-white px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/30 focus:border-burnt"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-ink">Time</label>
                  <input
                    name="time"
                    defaultValue="10:00 AM"
                    className="h-12 w-full rounded-lg border border-outline bg-white px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/30 focus:border-burnt"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-ink">
                    Appointment date <span className="text-burnt">*</span>
                  </label>
                  <input
                    name="date"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="h-12 w-full rounded-lg border border-outline bg-white px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/30 focus:border-burnt"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-ink">Contact number</label>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="09956663254"
                    className="h-12 w-full rounded-lg border border-outline bg-white px-4 text-sm text-ink placeholder:text-glyph focus:outline-none focus:ring-2 focus:ring-burnt/30 focus:border-burnt"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">Staff member</label>
                <input
                  name="staff"
                  defaultValue="Lead Specialist"
                  className="h-12 w-full rounded-lg border border-outline bg-white px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/30 focus:border-burnt"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-hairline">
                <AdminButton
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={isBookingSubmitting}
                  onClick={() => { setIsNewBookingOpen(false); setBookingError(null); }}
                >
                  Cancel
                </AdminButton>
                <AdminButton
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={isBookingSubmitting}
                >
                  {isBookingSubmitting ? "Creating Booking..." : "Create Booking"}
                </AdminButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
