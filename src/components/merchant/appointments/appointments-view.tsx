"use client";

import * as React from "react";
import { MerchantSidebar } from "../merchant-sidebar";

export interface AppointmentItem {
  id: string;
  time: string;
  customer: string;
  service: string;
  staff: string;
  source: "Online" | "Walk-In";
  status: "Confirmed" | "Check In" | "Pending approval";
}

const INITIAL_APPOINTMENTS: AppointmentItem[] = [
  {
    id: "1",
    time: "09:00",
    customer: "Ana Reyes",
    service: "Signature haircut",
    staff: "Sofia Cruz",
    source: "Online",
    status: "Confirmed",
  },
  {
    id: "2",
    time: "09:45",
    customer: "Carlo Dela Cruz",
    service: "Hair color",
    staff: "Miguel Tan",
    source: "Walk-In",
    status: "Check In",
  },
  {
    id: "3",
    time: "10:30",
    customer: "Bea Flores",
    service: "Wellness massage",
    staff: "Lia Ramos",
    source: "Online",
    status: "Pending approval",
  },
  {
    id: "4",
    time: "11:00",
    customer: "Daniel Lim",
    service: "Facial Treatment",
    staff: "Sofia Cruz",
    source: "Online",
    status: "Confirmed",
  },
  {
    id: "5",
    time: "13:00",
    customer: "Jessa Tan",
    service: "Cut + treatment",
    staff: "Miguel Tan",
    source: "Walk-In",
    status: "Confirmed",
  },
  {
    id: "6",
    time: "14:00",
    customer: "Marco Yap",
    service: "Signature haircut",
    staff: "Lia Ramos",
    source: "Online",
    status: "Confirmed",
  },
  {
    id: "7",
    time: "14:30",
    customer: "John Flores",
    service: "Wellness massage",
    staff: "Miguel Tan",
    source: "Online",
    status: "Pending approval",
  },
  {
    id: "8",
    time: "15:00",
    customer: "Kim Lim",
    service: "Facial Treatment",
    staff: "Sofia Cruz",
    source: "Online",
    status: "Confirmed",
  },
];

interface AppointmentsViewProps {
  businessName?: string;
  userEmail?: string;
  initialItems?: AppointmentItem[];
}

export function AppointmentsView({
  businessName = "Bella Vita",
  userEmail = "Maria Santos",
  initialItems = INITIAL_APPOINTMENTS,
}: AppointmentsViewProps) {
  const [items, setItems] = React.useState<AppointmentItem[]>(initialItems);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<string>("All");
  const [viewMode, setViewMode] = React.useState<"list" | "calendar">("list");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<AppointmentItem | null>(null);
  const [isNewBookingOpen, setIsNewBookingOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

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

  // Action toggle status
  const handleStatusChange = (id: string, newStatus: AppointmentItem["status"]) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    showToast(`Appointment status updated to ${newStatus}`);
    setActiveMenuId(null);
  };

  const handleConfirmCancel = () => {
    if (!cancelTarget) return;
    setItems((prev) => prev.filter((item) => item.id !== cancelTarget.id));
    showToast(`Appointment for ${cancelTarget.customer} cancelled.`);
    setCancelTarget(null);
  };

  return (
    <div className="min-h-screen bg-[#FFFDF6] text-neutral-900 flex flex-col md:flex-row antialiased font-sans">
      <MerchantSidebar businessName={businessName} userEmail={userEmail} />

      <main className="flex-1 px-6 sm:px-10 py-7 space-y-6 max-w-7xl">
        {/* Top Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-normal font-serif text-neutral-900 tracking-tight">
              Appointments
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Manage bookings, approvals, and appointment outcomes in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsNewBookingOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#C35000] hover:bg-[#A94400] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
          >
            <span>+ New Booking</span>
          </button>
        </header>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Today's appointments (Burnt orange card) */}
          <div className="rounded-2xl bg-[#C35000] text-white p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-white/90">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              <span>Today&apos;s appointments</span>
            </div>

            <div className="my-4">
              <span className="text-3xl font-bold font-serif">18</span>
            </div>

            <div>
              <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden mb-1.5">
                <div className="w-2/3 h-full bg-white rounded-full" />
              </div>
              <span className="text-[11px] text-white/80">All bookings scheduled for today</span>
            </div>
          </div>

          {/* 2. Awaiting approval */}
          <div className="rounded-2xl bg-white border border-[#EDECE8] p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-neutral-400">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <polyline points="17 11 19 13 23 9" />
              </svg>
              <span>Awaiting approval</span>
            </div>

            <div className="my-4">
              <span className="text-3xl font-bold font-serif text-neutral-900">3</span>
            </div>

            <div>
              <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden mb-1.5">
                <div className="w-1/3 h-full bg-[#C35000] rounded-full" />
              </div>
              <span className="text-[11px] text-neutral-500">Review requests before the start time</span>
            </div>
          </div>

          {/* 3. Checked-in customers */}
          <div className="rounded-2xl bg-white border border-[#EDECE8] p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-neutral-400">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              <span>Checked-in customers</span>
            </div>

            <div className="my-4">
              <span className="text-3xl font-bold font-serif text-neutral-900">4</span>
            </div>

            <div>
              <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden mb-1.5">
                <div className="w-2/5 h-full bg-[#C35000] rounded-full" />
              </div>
              <span className="text-[11px] text-neutral-500">Ready for their appointment</span>
            </div>
          </div>

          {/* 4. Completed today */}
          <div className="rounded-2xl bg-white border border-[#EDECE8] p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-neutral-400">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 14 14" />
              </svg>
              <span>Completed today</span>
            </div>

            <div className="my-4">
              <span className="text-3xl font-bold font-serif text-neutral-900">7</span>
            </div>

            <div>
              <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden mb-1.5">
                <div className="w-3/4 h-full bg-[#C35000] rounded-full" />
              </div>
              <span className="text-[11px] text-neutral-500">Services completed today</span>
            </div>
          </div>
        </div>

        {/* Main Appointments Table Card (Exact match to Screenshot 160513) */}
        <div className="rounded-2xl bg-white border border-[#EDECE8] shadow-xs overflow-hidden">
          {/* Card Controls */}
          <div className="p-5 border-b border-[#EDECE8] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-neutral-500">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                <h2 className="text-sm font-semibold text-neutral-900">
                  Appointments
                </h2>
              </div>
              <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                18 appointments
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
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-[#EDECE8] bg-neutral-50 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] focus:bg-white w-48 sm:w-60"
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
                  className="px-3 py-1.5 rounded-xl border border-[#EDECE8] bg-white text-xs font-medium text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5"
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
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
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
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
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

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
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
                {filtered.map((row) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Confirmation Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
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

      {/* New Booking Modal */}
      {isNewBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-semibold text-neutral-900">
                New Appointment Booking
              </h3>
              <button
                type="button"
                onClick={() => setIsNewBookingOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const customer = formData.get("customer") as string;
                const service = formData.get("service") as string;
                const staff = formData.get("staff") as string;
                const time = formData.get("time") as string;
                if (!customer) return;
                const newItem: AppointmentItem = {
                  id: String(Date.now()),
                  time: time || "10:00 AM",
                  customer,
                  service: service || "Custom Service",
                  staff: staff || "Maria Santos",
                  source: "Online",
                  status: "Confirmed",
                };
                setItems((prev) => [newItem, ...prev]);
                setIsNewBookingOpen(false);
                showToast(`New appointment booked for ${customer}`);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-neutral-700 font-medium mb-1">Customer name</label>
                <input
                  name="customer"
                  required
                  placeholder="e.g. Jessica Alva"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C35000]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-medium mb-1">Service</label>
                  <input
                    name="service"
                    defaultValue="Hair Styling & Blow Dry"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C35000]"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-medium mb-1">Time</label>
                  <input
                    name="time"
                    defaultValue="10:00 AM"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C35000]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-neutral-700 font-medium mb-1">Staff member</label>
                <input
                  name="staff"
                  defaultValue="Maria Santos"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C35000]"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsNewBookingOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#C35000] hover:bg-[#A94400] text-white font-semibold"
                >
                  Create Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
