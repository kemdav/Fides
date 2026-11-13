"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MerchantSidebar } from "../merchant-sidebar";
import { Icon } from "@/components/admin/icon";
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

  // Search & filter
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

  // Action toggle status (QA #3: persists to Supabase)
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

  // Action cancel appointment (QA #3: persists to Supabase)
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

  // Action new booking (QA #4: persists to Supabase)
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
    <div className="min-h-screen bg-powder text-neutral-900 flex flex-col md:flex-row antialiased font-sans">
      <MerchantSidebar
        businessName={businessName}
        userEmail={userEmail}
        basePath={basePath}
      />

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 space-y-5">
        {/* Top Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-[38px] sm:text-[32px] sm:leading-[42px] font-normal font-serif text-neutral-900 tracking-tight">
              Appointments
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Manage bookings, approvals, and appointment outcomes in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setBookingType("appointment");
              setIsNewBookingOpen(true);
            }}
            className="h-[45px] rounded-[9px] bg-[#C35000] px-4 text-sm font-semibold leading-[21px] text-white shadow-xs flex items-center gap-2 transition hover:bg-[#A94400]"
          >
            <span>+ New Booking</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setBookingType("walk-in");
              setIsNewBookingOpen(true);
            }}
            className="h-[45px] rounded-[9px] border border-[#C35000] bg-white px-4 text-sm font-semibold leading-[21px] text-[#C35000] shadow-xs transition hover:bg-[#FFF7F0]"
          >
            <span>+ Add Walk-in</span>
          </button>
        </header>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
          {/* 1. Today's appointments (Burnt orange card) */}
          <div className="min-h-[200px] rounded-[10px] bg-[#C35000] p-6 text-white shadow-[0_3px_14px_rgb(44_58_75/0.04)] flex flex-col justify-between">
            <div className="flex items-center gap-3 text-sm font-medium leading-[21px] text-white/90">
              <Icon name="calendar" weight="fill" className="size-5" />
              <span>Today&apos;s appointments</span>
            </div>

            <div className="my-4">
              <span className="text-4xl font-bold font-sans">{todayCount}</span>
            </div>

            <div>
              <span className="mb-1.5 block text-sm text-white/80">All bookings scheduled for today</span>
              <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden mb-1.5">
                <div className="w-2/3 h-full bg-white rounded-full" />
              </div>
            </div>
          </div>

          {/* 2. Awaiting approval */}
          <div className="min-h-[200px] rounded-[10px] bg-white border border-[#EDECE8] p-6 shadow-[0_3px_14px_rgb(44_58_75/0.04)] flex flex-col justify-between">
            <div className="flex items-center gap-3 text-sm font-medium leading-[21px] text-neutral-500">
              <Icon name="verified" className="size-5 text-neutral-400" />
              <span>Awaiting approval</span>
            </div>

            <div className="my-4">
              <span className="text-4xl font-bold font-sans text-ink">{awaitingCount}</span>
            </div>

            <div>
              <span className="mb-1.5 block text-sm text-neutral-500">Review requests before the start time</span>
              <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden mb-1.5">
                <div className="w-1/3 h-full bg-[#C35000] rounded-full" />
              </div>
            </div>
          </div>

          {/* 3. Checked-in customers */}
          <div className="min-h-[200px] rounded-[10px] bg-white border border-[#EDECE8] p-6 shadow-[0_3px_14px_rgb(44_58_75/0.04)] flex flex-col justify-between">
            <div className="flex items-center gap-3 text-sm font-medium leading-[21px] text-neutral-500">
              <Icon name="users" className="size-5 text-neutral-400" />
              <span>Checked-in customers</span>
            </div>

            <div className="my-4">
              <span className="text-4xl font-bold font-sans text-ink">{checkedInCount}</span>
            </div>

            <div>
              <span className="mb-1.5 block text-sm text-neutral-500">Ready for their appointment</span>
              <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden mb-1.5">
                <div className="w-2/5 h-full bg-[#C35000] rounded-full" />
              </div>
            </div>
          </div>

          {/* 4. Completed today */}
          <div className="min-h-[200px] rounded-[10px] bg-white border border-[#EDECE8] p-6 shadow-[0_3px_14px_rgb(44_58_75/0.04)] flex flex-col justify-between">
            <div className="flex items-center gap-3 text-sm font-medium leading-[21px] text-neutral-500">
              <Icon name="clock" className="size-5 text-neutral-400" />
              <span>Completed today</span>
            </div>

            <div className="my-4">
              <span className="text-4xl font-bold font-sans text-ink">{completedTodayCount}</span>
            </div>

            <div>
              <span className="mb-1.5 block text-sm text-neutral-500">Services completed today</span>
              <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden mb-1.5">
                <div className="w-3/4 h-full bg-[#C35000] rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Appointments Card */}
        <div className="rounded-[10px] bg-white border border-[#EDECE8] shadow-[0_3px_14px_rgb(44_58_75/0.04)] overflow-hidden">
          {/* Card Controls */}
          <div className="p-6 border-b border-[#EDECE8] flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-neutral-500">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                <h2 className="text-base font-semibold leading-[24px] text-neutral-900">
                  Appointments
                </h2>
              </div>
              <span className="text-sm font-semibold text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full">
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
                  className="h-10 pl-10 pr-3 rounded-[9px] border border-[#EDECE8] bg-neutral-50 text-sm text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] focus:bg-white w-48 sm:w-60"
                />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5 pointer-events-none">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>

              {/* Filter */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="h-10 rounded-[9px] border border-[#EDECE8] bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 text-neutral-400">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  <span>Filter {filterStatus !== "All" ? `(${filterStatus})` : ""}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 text-neutral-400">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isFilterOpen && (
                  <div className="absolute right-0 mt-1 w-36 rounded-xl bg-white border border-[#EDECE8] shadow-lg py-1 z-20 text-xs">
                    {["All", "Confirmed", "Pending approval", "Check In"].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setFilterStatus(status);
                          setIsFilterOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-neutral-50 ${
                          filterStatus === status ? "text-[#C35000] font-semibold" : "text-neutral-700"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* List / Calendar View Mode Toggle */}
              <div className="flex items-center border border-[#EDECE8] rounded-xl overflow-hidden bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
                    viewMode === "list"
                      ? "bg-[#C35000] text-white"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
                    viewMode === "calendar"
                      ? "bg-[#C35000] text-white"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  Calendar
                </button>
              </div>
            </div>
          </div>

          {/* QA #2: Conditionally render Calendar View vs Table View */}
          {viewMode === "calendar" ? (
            <div className="p-6">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-400">
                  No appointments found matching your filter criteria.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[10px] border border-[#EDECE8] bg-white p-5 shadow-[0_3px_14px_rgb(44_58_75/0.04)] hover:shadow-xs transition space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#C35000] bg-[#FDF3EB] border border-[#FADCD9] px-2.5 py-1 rounded-lg font-mono">
                          {item.time}
                        </span>
                        <div>
                          {item.status === "Confirmed" && (
                            <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              Confirmed
                            </span>
                          )}
                          {item.status === "Check In" && (
                            <span className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                              Check In
                            </span>
                          )}
                          {item.status === "Pending approval" && (
                            <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              Pending approval
                            </span>
                          )}
                          {item.status === "In service" && (
                            <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                              In service
                            </span>
                          )}
                          {item.status === "Completed" && (
                            <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-full">
                              Completed
                            </span>
                          )}
                          {item.status === "Cancelled" && (
                            <span className="text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-neutral-900">{item.customer}</h4>
                        <p className="text-xs text-neutral-600 mt-0.5">{item.service}</p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-2 border-t border-[#EDECE8]">
                        <span>
                          Staff: <strong className="text-neutral-700 font-medium">{item.staff}</strong>
                        </span>
                        <span className={item.source === "Walk-In" ? "text-[#C35000] font-medium" : "text-neutral-500"}>
                          {item.source}
                        </span>
                      </div>

                      {/* Calendar Card Actions (QA #2) */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#EDECE8]">
                        {item.status !== "Confirmed" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.id, "Confirmed")}
                            className="px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
                          >
                            Confirm
                          </button>
                        )}
                        {item.status !== "Check In" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.id, "Check In")}
                            className="px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer"
                          >
                            Check In
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setCancelTarget(item)}
                          className="px-2.5 py-1 text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Table View */
            <>
            <div className="md:hidden divide-y divide-[#EDECE8]">
              {filtered.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-neutral-400">
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
                            <p className="truncate text-base font-semibold text-neutral-900">{row.customer}</p>
                            <p className="mt-1 text-sm text-neutral-500">
                              {row.time} · {row.service}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-[#FDF3EB] px-2.5 py-1 text-xs font-semibold text-[#C35000]">
                            {row.status}
                          </span>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="mt-4 space-y-3 rounded-lg bg-powder p-4 text-sm text-neutral-600">
                          <div className="grid grid-cols-2 gap-3">
                            <span>Staff<strong className="mt-1 block text-neutral-900">{row.staff}</strong></span>
                            <span>Source<strong className="mt-1 block text-neutral-900">{row.source}</strong></span>
                          </div>
                          <div className="flex flex-wrap gap-2 border-t border-[#EDECE8] pt-3">
                            {row.status !== "Confirmed" && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(row.id, "Confirmed")}
                                className="rounded-md bg-[#C35000] px-3 py-2 text-xs font-semibold text-white"
                              >
                                Confirm
                              </button>
                            )}
                            {row.status !== "Check In" && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(row.id, "Check In")}
                                className="rounded-md border border-[#C35000] px-3 py-2 text-xs font-semibold text-[#C35000]"
                              >
                                Check In
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setCancelTarget(row)}
                              className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50/70 border-b border-[#EDECE8] text-neutral-400 font-medium">
                  <tr>
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Service</th>
                    <th className="px-5 py-3">Staff</th>
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDECE8]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-xs text-neutral-400">
                        No appointments found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => (
                      <tr key={row.id} className="hover:bg-neutral-50/60 transition">
                        <td className="px-5 py-3.5 font-medium text-neutral-700">{row.time}</td>
                        <td className="px-5 py-3.5 font-semibold text-neutral-900">{row.customer}</td>
                        <td className="px-5 py-3.5 text-neutral-600">{row.service}</td>
                        <td className="px-5 py-3.5 text-neutral-600">{row.staff}</td>
                        <td className="px-5 py-3.5">
                          <span className={row.source === "Walk-In" ? "text-[#C35000] font-medium" : "text-neutral-500"}>
                            {row.source}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {row.status === "Confirmed" && (
                            <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              Confirmed
                            </span>
                          )}
                          {row.status === "Check In" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(row.id, "Confirmed")}
                              className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full hover:bg-blue-100 transition cursor-pointer"
                            >
                              Check In
                            </button>
                          )}
                          {row.status === "Pending approval" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(row.id, "Confirmed")}
                              className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full hover:bg-amber-100 transition cursor-pointer"
                            >
                              Pending approval
                            </button>
                          )}
                          {row.status === "In service" && (
                            <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                              In service
                            </span>
                          )}
                          {row.status === "Completed" && (
                            <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 rounded-full">
                              Completed
                            </span>
                          )}
                          {row.status === "Cancelled" && (
                            <span className="text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                              Cancelled
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right relative">
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(activeMenuId === row.id ? null : row.id)}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-700 transition"
                          >
                            •••
                          </button>

                          {activeMenuId === row.id && (
                            <div className="absolute right-4 mt-1 w-40 rounded-xl bg-white border border-[#EDECE8] shadow-lg py-1 z-30 text-left text-xs">
                              {row.status !== "Confirmed" && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(row.id, "Confirmed")}
                                  className="w-full text-left px-3.5 py-1.5 hover:bg-neutral-50 text-neutral-700"
                                >
                                  Confirm
                                </button>
                              )}
                              {row.status !== "Check In" && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(row.id, "Check In")}
                                  className="w-full text-left px-3.5 py-1.5 hover:bg-neutral-50 text-neutral-700"
                                >
                                  Check In
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelTarget(row);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3.5 py-1.5 hover:bg-red-50 text-red-600 font-medium"
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
            </>
          )}

          {/* Table Footer */}
          <div className="p-4 border-t border-[#EDECE8] flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
            <span>Showing {filtered.length} of {items.length} appointments · All times in Asia/Manila (UTC+8)</span>
          </div>
        </div>
      </main>

      {/* Confirmation Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Cancel Confirmation Modal (QA #3) */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200">
            <h3 className="text-base font-semibold text-neutral-900">
              Cancel Appointment?
            </h3>
            <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
              Are you sure you want to cancel the appointment for{" "}
              <span className="font-semibold text-neutral-800">{cancelTarget.customer}</span> ({cancelTarget.service}) at {cancelTarget.time}?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="px-3.5 py-1.5 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-medium text-white shadow-xs"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Booking Modal (QA #4) */}
      {isNewBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[10px] bg-white p-7 sm:p-8 shadow-2xl border border-neutral-200 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <h3 className="font-display text-2xl font-normal leading-tight text-[#354357]">
                  {bookingType === "walk-in" ? "Add Walk-in" : "New Appointment"}
                </h3>
                <p className="mt-1 text-sm text-[#6D7580]">
                  {bookingType === "walk-in"
                    ? "Create an immediate appointment or add the customer to the waiting list."
                    : "Create a booking for an existing or new customer."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNewBookingOpen(false);
                  setBookingError(null);
                }}
                className="flex size-10 items-center justify-center rounded-lg text-2xl text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600"
              >
                ×
              </button>
            </div>

            {bookingError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm font-medium">
                {bookingError}
              </div>
            )}

            <form onSubmit={handleNewBookingSubmit} className="space-y-5 text-sm">
              <div>
                <label className="mb-2 block text-sm font-semibold text-neutral-700">Customer name</label>
                <input
                  name="customer"
                  required
                  placeholder="e.g. Jessica Alva"
                  className="h-12 w-full rounded-lg border border-[#AEB6C0] bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#C35000]/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-neutral-700">Service</label>
                  <input
                    name="service"
                    defaultValue="Signature haircut"
                    className="h-12 w-full rounded-lg border border-[#AEB6C0] bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#C35000]/30"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-neutral-700">Time</label>
                  <input
                    name="time"
                    defaultValue="10:00 AM"
                    className="h-12 w-full rounded-lg border border-[#AEB6C0] bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#C35000]/30"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-neutral-700">Appointment date</label>
                  <input
                    name="date"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="h-12 w-full rounded-lg border border-[#AEB6C0] bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#C35000]/30"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-neutral-700">Contact number</label>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="09956663254"
                    className="h-12 w-full rounded-lg border border-[#AEB6C0] bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#C35000]/30"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-neutral-700">Staff member</label>
                <input
                  name="staff"
                  defaultValue="Lead Specialist"
                  className="h-12 w-full rounded-lg border border-[#AEB6C0] bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#C35000]/30"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-neutral-100">
                <button
                  type="button"
                  disabled={isBookingSubmitting}
                  onClick={() => {
                    setIsNewBookingOpen(false);
                    setBookingError(null);
                  }}
                  className="h-11 rounded-lg border border-neutral-200 px-5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBookingSubmitting}
                  className="h-11 rounded-lg bg-[#C35000] px-6 text-sm font-semibold text-white shadow-xs transition hover:bg-[#A94400] disabled:opacity-60"
                >
                  {isBookingSubmitting ? "Creating Booking..." : "Create Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
