"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MerchantSidebar } from "../merchant-sidebar";
import {
  updateAppointmentStatusAction,
  createAppointmentBookingAction,
} from "@/app/actions/appointments";

export interface AppointmentRow {
  id: string;
  time: string;
  customer: string;
  service: string;
  staff: string;
  source: "Online" | "Walk-In";
  status: "Confirmed" | "Pending approval" | "Check In" | "In service" | "Completed" | "Cancelled";
  startsAt?: string;
  rawStatus?: string;
}

export interface DayChartStat {
  day: string;
  booked: number;
  completed: number;
}

export interface OverviewViewProps {
  businessName?: string;
  userEmail?: string;
  tenantId?: string;
  todayCount?: number;
  confirmedCount?: number;
  pendingCount?: number;
  checkedInCount?: number;
  completedVisitsCount?: number;
  revenueTotal?: number;
  chartStats?: DayChartStat[];
  todayActivity?: { time: string; customer: string; service: string }[];
  initialRows?: AppointmentRow[];
}

export function OverviewView({
  businessName = "Bella Vita",
  userEmail = "Maria Santos",
  tenantId,
  todayCount = 0,
  confirmedCount = 0,
  pendingCount = 0,
  checkedInCount = 0,
  completedVisitsCount = 0,
  revenueTotal = 0,
  chartStats = [],
  todayActivity = [],
  initialRows = [],
}: OverviewViewProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [appointments, setAppointments] = React.useState<AppointmentRow[]>(initialRows);
  const [prevInitialRows, setPrevInitialRows] = React.useState<AppointmentRow[]>(initialRows);
  if (initialRows !== prevInitialRows) {
    setPrevInitialRows(initialRows);
    setAppointments(initialRows);
  }

  const [filterStatus, setFilterStatus] = React.useState<string>("All");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [period, setPeriod] = React.useState<string>("This Week");
  const [isPeriodOpen, setIsPeriodOpen] = React.useState(false);
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<AppointmentRow | null>(null);
  const [isNewBookingOpen, setIsNewBookingOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [isBookingSubmitting, setIsBookingSubmitting] = React.useState(false);
  const [bookingError, setBookingError] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const filtered = appointments.filter((app) => {
    const matchesSearch =
      !searchQuery ||
      app.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.staff.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "All" || app.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // QA #3: Row action persists status changes to Supabase
  const handleStatusChange = async (id: string, newStatus: AppointmentRow["status"]) => {
    setActiveMenuId(null);
    const prevRows = appointments;
    setAppointments((prev) =>
      prev.map((row) => (row.id === id ? { ...row, status: newStatus } : row))
    );

    try {
      const res = await updateAppointmentStatusAction({
        appointmentId: id,
        newStatus,
        tenantIdParam: tenantId,
      });

      if (!res.success) {
        setAppointments(prevRows);
        showToast(res.error || "Failed to update appointment status.");
        return;
      }
      showToast(`Appointment status updated to ${newStatus}`);
      router.refresh();
    } catch (err: unknown) {
      setAppointments(prevRows);
      showToast(err instanceof Error ? err.message : "Failed to update appointment status.");
    }
  };

  // QA #3: Cancel row action persists cancellation to Supabase
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    const target = cancelTarget;
    setCancelTarget(null);
    const prevRows = appointments;
    setAppointments((prev) => prev.filter((row) => row.id !== target.id));

    try {
      const res = await updateAppointmentStatusAction({
        appointmentId: target.id,
        newStatus: "Cancelled",
        tenantIdParam: tenantId,
      });

      if (!res.success) {
        setAppointments(prevRows);
        showToast(res.error || "Failed to cancel appointment.");
        return;
      }
      showToast(`Appointment for ${target.customer} cancelled.`);
      router.refresh();
    } catch (err: unknown) {
      setAppointments(prevRows);
      showToast(err instanceof Error ? err.message : "Failed to cancel appointment.");
    }
  };

  // QA #4: Persist new booking to Supabase
  const handleNewBookingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const customer = (formData.get("customer") as string)?.trim();
    const service = (formData.get("service") as string)?.trim();
    const staff = (formData.get("staff") as string)?.trim();
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
        serviceName: service,
        staffName: staff,
        time,
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
      const newRow: AppointmentRow = {
        id: created.id,
        time: time || "10:00 AM",
        customer: created.customerName,
        service: created.serviceName,
        staff: created.staffName,
        source: "Online",
        status: "Confirmed",
        startsAt: created.starts_at,
        rawStatus: created.status,
      };

      setAppointments((prev) => [newRow, ...prev]);
      setIsNewBookingOpen(false);
      showToast(`New appointment booked for ${customer}`);
      router.refresh();
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : "Failed to create booking.");
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  // Chart statistics data (QA #1: dynamic chart bars from loaded records)
  const stats =
    chartStats && chartStats.length > 0
      ? chartStats
      : [
          { day: "Mon", booked: 0, completed: 0 },
          { day: "Tue", booked: 0, completed: 0 },
          { day: "Wed", booked: 0, completed: 0 },
          { day: "Thu", booked: 0, completed: 0 },
          { day: "Fri", booked: 0, completed: 0 },
          { day: "Sat", booked: 0, completed: 0 },
          { day: "Sun", booked: 0, completed: 0 },
        ];
  const maxVal = Math.max(1, ...stats.map((s) => Math.max(s.booked, s.completed)));

  return (
    <div className="min-h-screen bg-[#FFFDF6] text-neutral-900 flex flex-col md:flex-row antialiased font-sans">
      <MerchantSidebar businessName={businessName} userEmail={userEmail} />

      <main className="flex-1 px-6 sm:px-10 py-7 space-y-6 max-w-7xl">
        {/* Top Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-normal font-serif text-neutral-900 tracking-tight">
              Welcome back, {userEmail.split(" ")[0] || "Maria"}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Here&apos;s the latest update on your business. Let&apos;s make today a great one.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPeriodOpen(!isPeriodOpen)}
                className="px-3 py-2 rounded-xl bg-white border border-[#EDECE8] text-xs font-medium text-neutral-700 flex items-center gap-2 shadow-2xs hover:bg-neutral-50"
              >
                <span>{period}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-neutral-500">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isPeriodOpen && (
                <div className="absolute right-0 mt-1 w-32 rounded-xl bg-white border border-[#EDECE8] shadow-lg py-1 z-30 text-xs">
                  {["Today", "This Week", "This Month"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setPeriod(p);
                        setIsPeriodOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-neutral-50 ${
                        period === p ? "text-[#C35000] font-semibold" : "text-neutral-700"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsNewBookingOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#C35000] hover:bg-[#A94400] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
            >
              <span>+ New Booking</span>
            </button>
          </div>
        </header>

        {/* 4 Stat Cards (QA #1: Real loaded counts and amounts) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Today's appointments (Burnt orange card) */}
          <div className="rounded-2xl bg-[#C35000] text-white p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-white/90">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Today&apos;s appointments</span>
            </div>

            <div className="my-4 flex items-baseline gap-3">
              <span className="text-3xl font-bold font-serif">{todayCount}</span>
              <span className="text-[11px] font-medium bg-white/20 px-2 py-0.5 rounded-full">
                {confirmedCount} confirmed
              </span>
            </div>

            <div>
              <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${todayCount > 0 ? Math.min(100, (confirmedCount / todayCount) * 100) : 0}%` }}
                />
              </div>
              <span className="text-[11px] text-white/80">Your schedule at a glance</span>
            </div>
          </div>

          {/* 2. Pending approvals */}
          <div className="rounded-2xl bg-white border border-[#EDECE8] p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-neutral-400">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Pending approvals</span>
            </div>

            <div className="my-4 flex items-baseline gap-3">
              <span className="text-3xl font-bold font-serif text-neutral-900">{pendingCount}</span>
              <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                Needs review
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-end gap-1 h-5">
                <div className="w-1.5 h-3 bg-[#ADD8E6] rounded-xs" />
                <div className="w-1.5 h-5 bg-[#C35000] rounded-xs" />
                <div className="w-1.5 h-2 bg-[#ADD8E6] rounded-xs" />
                <div className="w-1.5 h-4 bg-[#C35000] rounded-xs" />
                <div className="w-1.5 h-3 bg-[#ADD8E6] rounded-xs" />
              </div>
              <span className="text-[11px] text-neutral-500">
                {pendingCount} {pendingCount === 1 ? "request is" : "requests are"} waiting for your approval
              </span>
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

            <div className="my-4 flex items-baseline gap-3">
              <span className="text-3xl font-bold font-serif text-neutral-900">{checkedInCount}</span>
              <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                Ready for service
              </span>
            </div>

            <div>
              <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full bg-[#ADD8E6] rounded-full transition-all duration-300"
                  style={{ width: `${todayCount > 0 ? Math.min(100, (checkedInCount / todayCount) * 100) : 0}%` }}
                />
              </div>
              <span className="text-[11px] text-neutral-500">
                {checkedInCount} {checkedInCount === 1 ? "customer" : "customers"} ready for their appointments
              </span>
            </div>
          </div>

          {/* 4. Completed revenue */}
          <div className="rounded-2xl bg-white border border-[#EDECE8] p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-neutral-400">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <span>Completed revenue</span>
            </div>

            <div className="my-4 flex items-baseline gap-3">
              <span className="text-3xl font-bold font-serif text-neutral-900">
                ₱{revenueTotal.toLocaleString()}
              </span>
              <span className="text-[11px] font-medium text-[#C35000] bg-[#FDF3EB] border border-[#FADCD9] px-2 py-0.5 rounded-full">
                {completedVisitsCount} visits
              </span>
            </div>

            <div>
              <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden mb-1.5">
                <div className="w-3/4 h-full bg-[#C35000] rounded-full" />
              </div>
              <span className="text-[11px] text-neutral-500">Collected from completed visits</span>
            </div>
          </div>
        </div>

        {/* Middle Section: Appointment statistics & Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Appointment statistics (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl bg-white border border-[#EDECE8] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-neutral-500">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                </svg>
                <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
                  Appointment statistics
                </h3>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-neutral-600">
                  <span className="w-2 h-2 rounded-full bg-[#C35000]" />
                  <span>Booked</span>
                </span>
                <span className="flex items-center gap-1.5 text-neutral-600">
                  <span className="w-2 h-2 rounded-full bg-[#ADD8E6]" />
                  <span>Completed</span>
                </span>
              </div>
            </div>

            {/* Custom SVG Bar Chart (QA #1: dynamic chart heights) */}
            <div className="pt-4">
              <div className="h-52 w-full flex items-end justify-between gap-3 px-2 border-b border-[#EDECE8]">
                {stats.map((item) => (
                  <div key={item.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 h-44">
                      {/* Booked bar */}
                      <div
                        className="w-4 bg-[#C35000] rounded-t-sm transition-all duration-300 relative group-hover:opacity-90 min-h-[4px]"
                        style={{ height: `${item.booked > 0 ? (item.booked / maxVal) * 100 : 4}%` }}
                      >
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-neutral-600 opacity-0 group-hover:opacity-100">
                          {item.booked}
                        </span>
                      </div>
                      {/* Completed bar */}
                      <div
                        className="w-4 bg-[#ADD8E6] rounded-t-sm transition-all duration-300 relative group-hover:opacity-90 min-h-[4px]"
                        style={{ height: `${item.completed > 0 ? (item.completed / maxVal) * 100 : 4}%` }}
                      >
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-neutral-600 opacity-0 group-hover:opacity-100">
                          {item.completed}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-neutral-500 font-medium">
                      {item.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar & Today's Activity (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl bg-white border border-[#EDECE8] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-neutral-500">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                </svg>
                <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
                  Calendar
                </h3>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-neutral-600">
                <span className="w-2 h-2 rounded-full bg-[#C35000]" />
                <span>Appointments</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-1">
              {/* Mini Calendar */}
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-neutral-800 mb-2">
                  <span className="cursor-pointer text-neutral-400 hover:text-neutral-700">‹</span>
                  <span className="font-semibold">Current Month</span>
                  <span className="cursor-pointer text-neutral-400 hover:text-neutral-700">›</span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-neutral-400 mb-1">
                  <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-neutral-700">
                  <span className="text-neutral-300">27</span>
                  <span className="text-neutral-300">28</span>
                  <span className="text-neutral-300">29</span>
                  <span className="text-neutral-300">30</span>
                  <span>1</span><span>2</span><span>3</span>
                  <span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
                  <span>11</span><span>12</span><span>13</span><span>14</span><span>15</span><span>16</span><span>17</span>
                  <span>18</span><span>19</span><span>20</span>
                  <span className="bg-[#C35000] text-white rounded-full flex items-center justify-center font-bold">21</span>
                  <span>22</span><span>23</span><span>24</span>
                  <span>25</span><span>26</span><span>27</span><span>28</span><span>29</span><span>30</span><span>31</span>
                </div>
              </div>

              {/* Today's Activity (QA #1: dynamic items from appointments) */}
              <div className="space-y-2.5 border-t sm:border-t-0 sm:border-l border-[#EDECE8] sm:pl-4 pt-3 sm:pt-0">
                <span className="text-xs font-semibold text-neutral-900 block">
                  Today&apos;s activity
                </span>
                <div className="space-y-2 text-[11px]">
                  {todayActivity && todayActivity.length > 0 ? (
                    todayActivity.map((act, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C35000] mt-1 shrink-0" />
                        <div>
                          <span className="font-medium text-neutral-800">{act.time} · {act.customer}</span>
                          <span className="text-neutral-400 block text-[10px]">{act.service}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-[11px] text-neutral-400 block">No activity scheduled for today.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Today's Appointments Table Card (QA #1: No hardcoded rows) */}
        <div className="rounded-2xl bg-white border border-[#EDECE8] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#EDECE8] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-neutral-500">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                <h3 className="text-sm font-semibold text-neutral-900">
                  Today&apos;s appointments
                </h3>
              </div>
              <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                {appointments.length} appointments
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search customer or service"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-[#EDECE8] bg-neutral-50 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] focus:bg-white w-48 sm:w-64"
                />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5 pointer-events-none">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>

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
            </div>
          </div>

          {/* Table (QA #1: Empty state row when 0 appointments) */}
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
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-xs text-neutral-400">
                      No appointments scheduled for today.
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
                        {row.status === "Pending approval" && (
                          <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            Pending approval
                          </span>
                        )}
                        {row.status === "Check In" && (
                          <span className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                            Check In
                          </span>
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
              <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <h3 className="text-base font-semibold text-neutral-900">
                    New Appointment Booking
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewBookingOpen(false);
                      setBookingError(null);
                    }}
                    className="text-neutral-400 hover:text-neutral-600 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>

                {bookingError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    {bookingError}
                  </div>
                )}

                <form onSubmit={handleNewBookingSubmit} className="space-y-3 text-xs">
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
                        defaultValue="Signature haircut"
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
                      defaultValue="Lead Specialist"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C35000]"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
                    <button
                      type="button"
                      disabled={isBookingSubmitting}
                      onClick={() => {
                        setIsNewBookingOpen(false);
                        setBookingError(null);
                      }}
                      className="px-3.5 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isBookingSubmitting}
                      className="px-4 py-2 rounded-xl bg-[#C35000] hover:bg-[#A94400] text-white font-semibold disabled:opacity-60 transition"
                    >
                      {isBookingSubmitting ? "Creating Booking..." : "Create Booking"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Table Footer */}
          <div className="p-4 border-t border-[#EDECE8] flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
            <span>Showing {filtered.length} of {appointments.length} appointments · All times in Asia/Manila (UTC+8)</span>
            <Link
              href="/dashboard/appointments"
              className="text-[#C35000] font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>View All Appointments</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
