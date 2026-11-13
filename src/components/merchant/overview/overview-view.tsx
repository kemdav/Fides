"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MerchantSidebar } from "../merchant-sidebar";
import { Icon } from "@/components/admin/icon";
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
  userName?: string;
  userEmail?: string;
  userRole?: string;
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
  calendarAppointments?: AppointmentRow[];
  basePath?: string;
}

const EMPTY_APPOINTMENTS: AppointmentRow[] = [];
const WALK_IN_SERVICES = [
  { value: "Signature haircut", label: "Signature haircut · ₱450" },
  { value: "Balayage & gloss", label: "Balayage & gloss · ₱1,500" },
  { value: "Botanical spa manicure", label: "Botanical spa manicure · ₱950" },
];
const WALK_IN_STAFF = ["Sofia Cruz", "Marco Reyes", "Elena Cruz"];
const CALENDAR_WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const APPOINTMENT_TIMES = ["09:00 AM", "09:30 AM", "10:00 AM", "10:45 AM", "11:30 AM", "01:00 PM", "02:30 PM"];

function formatWalkInDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function OverviewView({
  businessName = "Bella Vita",
  userName = "Maria Santos",
  userEmail = "Maria Santos",
  userRole = "Business owner",
  tenantId,
  todayCount = 0,
  confirmedCount = 0,
  pendingCount = 0,
  checkedInCount = 0,
  completedVisitsCount = 0,
  revenueTotal = 0,
  chartStats = [],
  initialRows = EMPTY_APPOINTMENTS,
  calendarAppointments = EMPTY_APPOINTMENTS,
  basePath = "",
}: OverviewViewProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [appointments, setAppointments] = React.useState<AppointmentRow[]>(initialRows);

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
  const [bookingType, setBookingType] = React.useState<"appointment" | "walk-in">("appointment");
  const [walkInService, setWalkInService] = React.useState(WALK_IN_SERVICES[0].value);
  const [walkInStaff, setWalkInStaff] = React.useState(WALK_IN_STAFF[0]);
  const [walkInServiceOpen, setWalkInServiceOpen] = React.useState(false);
  const [walkInStaffOpen, setWalkInStaffOpen] = React.useState(false);
  const [walkInDateOpen, setWalkInDateOpen] = React.useState(false);
  const [walkInTimeOpen, setWalkInTimeOpen] = React.useState(false);
  const [walkInTime, setWalkInTime] = React.useState("10:45 AM");
  const [walkInDate, setWalkInDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [walkInCalendarMonth, setWalkInCalendarMonth] = React.useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [expandedAppointmentId, setExpandedAppointmentId] = React.useState<string | null>(null);
  const [selectedCalendarDay, setSelectedCalendarDay] = React.useState<number | null>(null);
  const displayName = userName || userEmail;

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
    const email = (formData.get("email") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim();
    const service = (formData.get("service") as string)?.trim();
    const staff = (formData.get("staff") as string)?.trim();
    const date = (formData.get("date") as string)?.trim();
    const time = (formData.get("time") as string)?.trim();
    const notes = (formData.get("notes") as string)?.trim();

    if (!customer) {
      setBookingError("Customer name is required.");
      return;
    }
    if (!date) {
      setBookingError("Appointment date is required.");
      return;
    }

    setIsBookingSubmitting(true);
    setBookingError(null);

    try {
      const res = await createAppointmentBookingAction({
        customerName: customer,
        customerEmail: email,
        customerPhone: phone,
        serviceName: service,
        staffName: staff,
        date,
        time,
        notes,
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
      const newRow: AppointmentRow = {
        id: created.id,
        time: time || "10:00 AM",
        customer: created.customerName,
        service: created.serviceName,
        staff: created.staffName,
        source: bookingType === "walk-in" ? "Walk-In" : "Online",
        status: "Confirmed",
        startsAt: created.starts_at,
        rawStatus: created.status,
      };

      setAppointments((prev) => [newRow, ...prev]);
      setIsNewBookingOpen(false);
      showToast(
        bookingType === "walk-in"
          ? `New walk-in appointment booked for ${customer}`
          : `New appointment booked for ${customer}`
      );
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
  const calendarDate = new Date();
  const currentMonthLabel = calendarDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const calendarDaysInMonth = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth() + 1,
    0
  ).getDate();
  const calendarStartDay = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth(),
    1
  ).getDay();
  const calendarCells: Array<number | null> = [
    ...Array.from({ length: calendarStartDay }, () => null),
    ...Array.from({ length: calendarDaysInMonth }, (_, index) => index + 1),
  ];
  const activeCalendarDay = selectedCalendarDay ?? calendarDate.getDate();
  const activeCalendarDateKey = `${calendarDate.getFullYear()}-${String(
    calendarDate.getMonth() + 1
  ).padStart(2, "0")}-${String(activeCalendarDay).padStart(2, "0")}`;
  const activeCalendarAppointments = calendarAppointments.filter(
    (appointment) => appointment.startsAt?.slice(0, 10) === activeCalendarDateKey
  );
  const activeCompletedAppointments = activeCalendarAppointments.filter(
    (appointment) => appointment.status === "Completed"
  );
  const activeCalendarLabel = new Date(
    `${activeCalendarDateKey}T12:00:00`
  ).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const walkInCalendarDays = React.useMemo(() => {
    const firstDay = new Date(
      walkInCalendarMonth.getFullYear(),
      walkInCalendarMonth.getMonth(),
      1
    ).getDay();
    const daysInMonth = new Date(
      walkInCalendarMonth.getFullYear(),
      walkInCalendarMonth.getMonth() + 1,
      0
    ).getDate();

    return [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [walkInCalendarMonth]);
  const walkInMonthLabel = walkInCalendarMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-powder text-neutral-900 flex flex-col md:flex-row antialiased font-sans">
      <MerchantSidebar
        businessName={businessName}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        basePath={basePath}
      />

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 space-y-5">
        {/* Top Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-[38px] sm:text-[32px] sm:leading-[42px] font-normal font-display text-neutral-900 tracking-tight">
              Welcome back, {displayName.split(" ")[0] || "Maria"}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Here&apos;s the latest update on your business. Let&apos;s make today a great one.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPeriodOpen(!isPeriodOpen)}
                className="h-11 rounded-[9px] bg-white border border-[#9EA8B3] px-4 text-sm font-medium text-[#354357] flex items-center gap-3 shadow-2xs hover:bg-neutral-50"
              >
                <span>{period}</span>
                <Icon name="chevron-down" className="size-4 text-neutral-500" />
              </button>

              {isPeriodOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-[10px] bg-white border border-[#EDECE8] shadow-lg py-2 z-30 text-sm">
                  {["Today", "This Week", "This Month"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setPeriod(p);
                        setIsPeriodOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 hover:bg-neutral-50 ${
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
              onClick={() => {
                setBookingType("appointment");
                setWalkInDate("");
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
                setWalkInDate(new Date().toISOString().slice(0, 10));
                setIsNewBookingOpen(true);
              }}
              className="h-[45px] rounded-[9px] border border-[#C35000] bg-white px-4 text-sm font-semibold leading-[21px] text-[#C35000] shadow-xs flex items-center gap-2 transition hover:bg-[#FFF7F0]"
            >
              <span>+ Add Walk-in</span>
            </button>
          </div>
        </header>

        {/* 4 Stat Cards (QA #1: Real loaded counts and amounts) */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
          {/* 1. Today's appointments (Burnt orange card) */}
          <div className="min-h-[160px] rounded-[10px] bg-[#C35000] p-5 text-white shadow-[0_3px_14px_rgb(44_58_75/0.04)] flex flex-col justify-between">
            <div className="flex items-center gap-3 text-sm font-medium leading-[21px] text-white/90">
              <Icon name="calendar" weight="fill" className="size-5" />
              <span>Today&apos;s appointments</span>
            </div>

            <div className="my-4 flex items-center gap-3">
              <span className="text-4xl font-semibold font-sans">{todayCount}</span>
              <span className="text-xs font-medium bg-white/20 px-2.5 py-1 rounded-full">
                {confirmedCount} confirmed
              </span>
            </div>

            <div>
              <span className="text-[10px] lg:text-[11px] text-white/80 block mb-1.5">Your schedule at a glance</span>
              <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${todayCount > 0 ? Math.min(100, (confirmedCount / todayCount) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* 2. Pending approvals */}
          <div className="min-h-[160px] rounded-[10px] bg-white border border-[#EDECE8] p-5 shadow-[0_3px_14px_rgb(44_58_75/0.04)] flex flex-col justify-between">
            <div className="flex items-center gap-3 text-sm font-medium leading-[21px] text-neutral-500">
              <Icon name="clock" className="size-5 text-neutral-400" />
              <span>Pending approvals</span>
            </div>

            <div className="my-4 flex items-center gap-3">
              <span className="text-4xl font-semibold font-sans text-ink">{pendingCount}</span>
              <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-full">
                Needs review
              </span>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex items-end gap-1 h-8 shrink-0" aria-hidden="true">
                <div className="w-2.5 h-4 bg-[#ADD8E6] rounded-sm" />
                <div className="w-2.5 h-6 bg-[#ADD8E6] rounded-sm" />
                <div className="w-2.5 h-8 bg-[#ADD8E6] rounded-sm" />
                <div className="w-2.5 h-5 bg-[#ADD8E6] rounded-sm" />
                <div className="w-2.5 h-7 bg-[#C35000] rounded-sm" />
                <div className="w-2.5 h-6 bg-[#ADD8E6] rounded-sm" />
                <div className="w-2.5 h-8 bg-[#ADD8E6] rounded-sm" />
              </div>
              <span className="pl-2 max-w-[125px] text-[10px] lg:text-[11px] leading-tight text-neutral-500">
                {pendingCount} {pendingCount === 1 ? "request is" : "requests are"} waiting for your approval
              </span>
            </div>
          </div>

          {/* 3. Checked-in customers */}
          <div className="min-h-[160px] rounded-[10px] bg-white border border-[#EDECE8] p-5 shadow-[0_3px_14px_rgb(44_58_75/0.04)] flex flex-col justify-between">
            <div className="flex items-center gap-3 text-sm font-medium leading-[21px] text-neutral-500">
              <Icon name="users" className="size-5 text-neutral-400" />
              <span>Checked-in customers</span>
            </div>

            <div className="my-4 flex items-center gap-3">
              <span className="text-4xl font-semibold font-sans text-ink">{checkedInCount}</span>
              <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-full">
                Ready for service
              </span>
            </div>

            <div>
              <span className="text-[10px] lg:text-[11px] text-neutral-500 block mb-1.5">
                {checkedInCount} {checkedInCount === 1 ? "customer" : "customers"} ready for their appointments
              </span>
              <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full bg-[#ADD8E6] rounded-full transition-all duration-300"
                  style={{ width: `${todayCount > 0 ? Math.min(100, (checkedInCount / todayCount) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* 4. Completed revenue */}
          <div className="min-h-[160px] rounded-[10px] bg-white border border-[#EDECE8] p-5 shadow-[0_3px_14px_rgb(44_58_75/0.04)] flex flex-col justify-between">
            <div className="flex items-center gap-3 text-sm font-medium leading-[21px] text-neutral-500">
              <Icon name="card" className="size-5 text-neutral-400" />
              <span>Completed revenue</span>
            </div>

            <div className="my-4 flex items-center gap-3">
              <span className="text-4xl font-semibold font-sans text-ink">
                ₱{revenueTotal.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-[#C35000] bg-[#FDF3EB] border border-[#FADCD9] px-2.5 py-1 rounded-full">
                {completedVisitsCount} {completedVisitsCount === 1 ? "visit" : "visits"}
              </span>
            </div>

            <div>
              <span className="text-[10px] lg:text-[11px] text-neutral-500 block mb-1.5">Collected from completed visits</span>
              <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden mb-1.5">
                <div className="w-3/4 h-full bg-[#C35000] rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section: Appointment statistics & Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Appointment statistics (7 cols) */}
          <div className="lg:col-span-7 min-h-[390px] h-full rounded-[10px] bg-white border border-[#EDECE8] p-7 shadow-[0_3px_14px_rgb(44_58_75/0.04)] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="chart" className="size-6 text-neutral-500" />
                <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                  Appointment statistics
                </h3>
              </div>

              <div className="flex items-center gap-5 text-sm">
                <span className="flex items-center gap-1.5 text-neutral-600">
                  <span className="size-2.5 rounded-full bg-[#C35000]" />
                  <span>Booked</span>
                </span>
                <span className="flex items-center gap-1.5 text-neutral-600">
                  <span className="size-2.5 rounded-full bg-[#ADD8E6]" />
                  <span>Completed</span>
                </span>
              </div>
            </div>

            {/* Custom SVG Bar Chart (QA #1: dynamic chart heights) */}
            <div className="pt-4">
              <div className="h-60 w-full flex items-end justify-between gap-4 px-3 border-b border-[#EDECE8]">
                {stats.map((item) => (
                  <div key={item.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1.5 h-52">
                      {/* Booked bar */}
                      <div
                        className="w-7 bg-[#C35000] rounded-t-sm transition-all duration-300 relative min-h-[4px]"
                        style={{ height: `${item.booked > 0 ? (item.booked / maxVal) * 100 : 4}%` }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-neutral-500">
                          {item.booked}
                        </span>
                      </div>
                      {/* Completed bar */}
                      <div
                        className="w-7 bg-[#ADD8E6] rounded-t-sm transition-all duration-300 relative min-h-[4px]"
                        style={{ height: `${item.completed > 0 ? (item.completed / maxVal) * 100 : 4}%` }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-neutral-500">
                          {item.completed}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm text-neutral-500 font-medium">
                      {item.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar & Today's Activity (5 cols) */}
          <div className="lg:col-span-5 min-h-[390px] h-full rounded-[10px] bg-white border border-[#EDECE8] p-7 shadow-[0_3px_14px_rgb(44_58_75/0.04)] space-y-6">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Icon name="calendar" className="size-6 text-neutral-500" />
                <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                  Calendar
                </h3>
              </div>
              <div className="flex items-center gap-4 text-sm text-neutral-600">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#C35000]" />
                  <span>Booked</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#ADD8E6]" />
                  <span>Completed</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-1">
              {/* Mini Calendar */}
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-neutral-800 mb-2">
                  <span className="cursor-pointer text-neutral-400 hover:text-neutral-700">‹</span>
                  <span className="font-semibold">{currentMonthLabel}</span>
                  <span className="cursor-pointer text-neutral-400 hover:text-neutral-700">›</span>
                </div>
                <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-neutral-400 mb-2">
                  <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                </div>
                <div className="grid grid-cols-7 gap-1.5 text-center text-sm font-medium text-neutral-700">
                  {calendarCells.map((day, index) => (
                    <button
                      type="button"
                      key={`${day ?? "empty"}-${index}`}
                      disabled={day === null}
                      onClick={() => day !== null && setSelectedCalendarDay(day)}
                      className={`flex items-center justify-center aspect-square min-h-9 ${
                        day === null
                          ? "cursor-default"
                          : day === activeCalendarDay
                            ? "bg-[#C35000]/15 text-[#C35000] rounded-md font-bold"
                            : "rounded-md hover:bg-[#C35000]/10"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected date activity */}
              <div className="space-y-2.5 border-t sm:border-t-0 sm:border-l border-[#EDECE8] sm:pl-4 pt-3 sm:pt-0">
                <span className="text-sm font-semibold text-neutral-900 block">
                  {activeCalendarLabel}&apos;s activity
                </span>
                <div className="space-y-3 text-sm max-h-48 overflow-y-auto">
                  {activeCalendarAppointments.length > 0 ? (
                    activeCalendarAppointments.map((appointment) => (
                      <div key={appointment.id} className="flex items-start gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                            appointment.status === "Completed"
                              ? "bg-[#ADD8E6]"
                              : "bg-[#C35000]"
                          }`}
                        />
                        <div>
                          <span className="font-medium text-neutral-800">
                            {appointment.time} · {appointment.customer}
                          </span>
                          <span className="text-neutral-400 block text-xs">
                            {appointment.service} · {appointment.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-neutral-400 block">
                      No activity scheduled for this date.
                    </span>
                  )}
                </div>
                <div className="border-t border-[#EDECE8] pt-3 text-xs text-neutral-500">
                  <span className="font-semibold text-neutral-700">
                    {activeCompletedAppointments.length}
                  </span>{" "}
                  completed appointment{activeCompletedAppointments.length === 1 ? "" : "s"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Today's Appointments Table Card (QA #1: No hardcoded rows) */}
        <div className="rounded-[10px] bg-white border border-[#EDECE8] shadow-[0_3px_14px_rgb(44_58_75/0.04)] overflow-hidden">
          <div className="p-6 border-b border-[#EDECE8] flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Icon name="users" className="size-6 text-neutral-500" />
                <h3 className="text-base font-semibold leading-[24px] text-neutral-900">
                  Today&apos;s appointments
                </h3>
              </div>
              <span className="text-sm font-semibold text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full">
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
                  className="h-10 pl-10 pr-3 rounded-[9px] border border-[#EDECE8] bg-neutral-50 text-sm text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] focus:bg-white w-48 sm:w-64"
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
            </div>
          </div>

          {/* Mobile appointment cards */}
          <div className="md:hidden divide-y divide-[#EDECE8]">
            {filtered.length === 0 ? (
              <p className="px-5 py-8 text-center text-xs text-neutral-400">
                No appointments scheduled for today.
              </p>
            ) : (
              filtered.map((row) => {
                const isExpanded = expandedAppointmentId === row.id;
                return (
                  <div key={row.id} className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setExpandedAppointmentId(isExpanded ? null : row.id)}
                      className="w-full text-left"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#354357] truncate">{row.customer}</p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {row.time} · {row.service}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[#FDF3EB] px-2 py-1 text-[10px] font-semibold text-[#C35000]">
                          {row.status}
                        </span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="mt-3 rounded-lg bg-powder p-3 text-xs text-neutral-600 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <span>Staff <strong className="block text-neutral-900">{row.staff}</strong></span>
                          <span>Source <strong className="block text-neutral-900">{row.source}</strong></span>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {row.status !== "Confirmed" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(row.id, "Confirmed")}
                              className="rounded-md bg-[#C35000] px-2.5 py-1.5 text-[11px] font-semibold text-white"
                            >
                              Confirm
                            </button>
                          )}
                          {row.status !== "Check In" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(row.id, "Check In")}
                              className="rounded-md border border-[#C35000] px-2.5 py-1.5 text-[11px] font-semibold text-[#C35000]"
                            >
                              Check In
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setCancelTarget(row)}
                            className="rounded-md border border-red-200 px-2.5 py-1.5 text-[11px] font-semibold text-red-600"
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

          {/* Desktop table (QA #1: Empty state row when 0 appointments) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50/70 border-b border-[#EDECE8] text-neutral-400 font-medium">
                <tr>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Service</th>
                  <th className="px-6 py-4">Staff</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
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
                      <td className="px-6 py-4 font-medium text-neutral-700">{row.time}</td>
                      <td className="px-6 py-4 font-semibold text-neutral-900">{row.customer}</td>
                      <td className="px-6 py-4 text-neutral-600">{row.service}</td>
                      <td className="px-6 py-4 text-neutral-600">{row.staff}</td>
                      <td className="px-6 py-4">
                        <span className={row.source === "Walk-In" ? "text-[#C35000] font-medium" : "text-neutral-500"}>
                          {row.source}
                        </span>
                      </td>
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4 text-right relative">
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
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-5 bg-black/35 backdrop-blur-xs animate-in fade-in duration-200">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-walk-in-title"
                className="relative my-auto w-full max-w-2xl overflow-visible rounded-xl bg-white px-5 py-5 sm:px-6 sm:py-5 shadow-2xl border border-[#E1E4E8] animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-200"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 id="add-walk-in-title" className="text-2xl sm:text-[27px] leading-tight font-normal font-display text-[#354357]">
                      {bookingType === "walk-in" ? "Add Walk-in" : "New Appointment"}
                    </h3>
                    <p className="mt-1 text-xs sm:text-[13px] tracking-wide text-[#6D7580]">
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
                    className="text-2xl leading-none text-[#858C94] hover:text-[#354357] transition"
                    aria-label={`Close ${bookingType === "walk-in" ? "walk-in" : "appointment"} form`}
                  >
                    ×
                  </button>
                </div>

                {bookingError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    {bookingError}
                  </div>
                )}

                <form onSubmit={handleNewBookingSubmit} className="mt-5 space-y-4 text-xs">
                  <fieldset className="space-y-2.5">
                    <legend className="text-[11px] font-semibold text-[#6D7580]">
                      Customer Information
                    </legend>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="walk-in-customer" className="mb-1.5 block text-[13px] font-medium text-[#354357]">
                          Customer Name<span className="text-[#C35000]">*</span>
                        </label>
                        <input
                          id="walk-in-customer"
                          name="customer"
                          required
                          placeholder="Juan Dela Cruz"
                          className="h-12 w-full rounded-lg border border-[#AEB6C0] bg-white px-3 text-[13px] text-[#354357] placeholder:text-[#858C94] focus:border-[#C35000] focus:outline-none"
                        />
                      </div>
                      {bookingType === "appointment" && (
                        <div>
                          <label htmlFor="walk-in-phone" className="mb-1.5 block text-[13px] font-medium text-[#354357]">
                            Contact Number<span className="text-[#C35000]">*</span>
                          </label>
                          <input
                            id="walk-in-phone"
                            name="phone"
                            required
                            type="tel"
                            placeholder="09956663254"
                            className="h-12 w-full rounded-lg border border-[#AEB6C0] bg-white px-3 text-[13px] text-[#354357] placeholder:text-[#858C94] focus:border-[#C35000] focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                    {bookingType === "walk-in" && (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="walk-in-email" className="mb-1.5 block text-[13px] font-medium text-[#354357]">
                          Email <span className="text-[#354357]">(optional)</span>
                        </label>
                        <input
                          id="walk-in-email"
                          name="email"
                          type="email"
                          placeholder="juan@gmail.com"
                          className="h-12 w-full rounded-lg border border-[#AEB6C0] bg-white px-3 text-[13px] text-[#354357] placeholder:text-[#858C94] focus:border-[#C35000] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="walk-in-phone" className="mb-1.5 block text-[13px] font-medium text-[#354357]">
                          Contact Number<span className="text-[#C35000]">*</span>
                        </label>
                        <input
                          id="walk-in-phone"
                          name="phone"
                          required
                          type="tel"
                          placeholder="09956663254"
                          className="h-12 w-full rounded-lg border border-[#AEB6C0] bg-white px-3 text-[13px] text-[#354357] placeholder:text-[#858C94] focus:border-[#C35000] focus:outline-none"
                        />
                      </div>
                    </div>
                    )}
                  </fieldset>

                  <fieldset className="space-y-2.5">
                    <legend className="text-[11px] font-semibold text-[#6D7580]">
                      Service &amp; staff
                    </legend>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="walk-in-service" className="mb-1.5 block text-[13px] font-medium text-[#354357]">
                          {bookingType === "walk-in" ? "Requested Service" : "Service Name"}<span className="text-[#C35000]">*</span>
                        </label>
                        <div className="relative">
                          <input type="hidden" name="service" value={walkInService} />
                          <button
                            id="walk-in-service"
                            type="button"
                            aria-haspopup="listbox"
                            aria-expanded={walkInServiceOpen}
                            onClick={() => {
                              setWalkInServiceOpen((open) => !open);
                              setWalkInStaffOpen(false);
                              setWalkInDateOpen(false);
                            }}
                            className="mt-0 flex h-12 w-full items-center justify-between rounded-lg border border-[#AEB6C0] bg-white px-3 text-left text-[13px] text-[#354357] outline-none focus:border-[#C35000]"
                          >
                            <span>
                              {WALK_IN_SERVICES.find((option) => option.value === walkInService)?.label}
                            </span>
                            <svg aria-hidden viewBox="0 0 16 10" className={`h-3.5 w-3.5 text-[#6D7580] transition-transform ${walkInServiceOpen ? "rotate-180" : ""}`} fill="currentColor">
                              <path d="M1.2 1.4a1 1 0 0 1 1.4-.2L8 5.7l5.4-4.5a1 1 0 1 1 1.2 1.6l-6 5a1 1 0 0 1-1.2 0l-6-5a1 1 0 0 1-.2-1.4Z" />
                            </svg>
                          </button>
                          {walkInServiceOpen && (
                            <ul role="listbox" className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-lg border border-[#AEB6C0] bg-white py-1 shadow-md">
                              {WALK_IN_SERVICES.map((option) => (
                                <li key={option.value}>
                                  <button
                                    type="button"
                                    role="option"
                                    aria-selected={walkInService === option.value}
                                    onClick={() => {
                                      setWalkInService(option.value);
                                      setWalkInServiceOpen(false);
                                    }}
                                    className="w-full px-3 py-2.5 text-left text-[13px] text-[#354357] transition-colors hover:bg-[#F4F1EA]"
                                  >
                                    {option.label}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                      <div>
                        <label htmlFor="walk-in-staff" className="mb-1.5 block text-[13px] font-medium text-[#354357]">
                          Service Staff<span className="text-[#C35000]">*</span>
                        </label>
                        <div className="relative">
                          <input type="hidden" name="staff" value={walkInStaff} />
                          <button
                            id="walk-in-staff"
                            type="button"
                            aria-haspopup="listbox"
                            aria-expanded={walkInStaffOpen}
                            onClick={() => {
                              setWalkInStaffOpen((open) => !open);
                              setWalkInServiceOpen(false);
                              setWalkInDateOpen(false);
                            }}
                            className="flex h-12 w-full items-center justify-between rounded-lg border border-[#AEB6C0] bg-white px-3 text-left text-[13px] text-[#354357] outline-none focus:border-[#C35000]"
                          >
                            <span>{walkInStaff}</span>
                            <svg aria-hidden viewBox="0 0 16 10" className={`h-3.5 w-3.5 text-[#6D7580] transition-transform ${walkInStaffOpen ? "rotate-180" : ""}`} fill="currentColor">
                              <path d="M1.2 1.4a1 1 0 0 1 1.4-.2L8 5.7l5.4-4.5a1 1 0 1 1 1.2 1.6l-6 5a1 1 0 0 1-1.2 0l-6-5a1 1 0 0 1-.2-1.4Z" />
                            </svg>
                          </button>
                          {walkInStaffOpen && (
                            <ul role="listbox" className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-lg border border-[#AEB6C0] bg-white py-1 shadow-md">
                              {WALK_IN_STAFF.map((staff) => (
                                <li key={staff}>
                                  <button
                                    type="button"
                                    role="option"
                                    aria-selected={walkInStaff === staff}
                                    onClick={() => {
                                      setWalkInStaff(staff);
                                      setWalkInStaffOpen(false);
                                    }}
                                    className="w-full px-3 py-2.5 text-left text-[13px] text-[#354357] transition-colors hover:bg-[#F4F1EA]"
                                  >
                                    {staff}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="space-y-2.5">
                    <legend className="text-[11px] font-semibold text-[#6D7580]">
                      Schedule
                    </legend>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="walk-in-date" className="mb-1.5 block text-[13px] font-medium text-[#354357]">
                          Appointment Date<span className="text-[#C35000]">*</span>
                        </label>
                        <div className="relative">
                          <input type="hidden" name="date" value={walkInDate} />
                          <button
                            id="walk-in-date"
                            type="button"
                            aria-haspopup="dialog"
                            aria-expanded={walkInDateOpen}
                            onClick={() => {
                              setWalkInDateOpen((open) => !open);
                              setWalkInServiceOpen(false);
                              setWalkInStaffOpen(false);
                            }}
                            className="flex h-12 w-full items-center justify-between rounded-lg border border-[#AEB6C0] bg-white px-3 text-left text-[13px] text-[#354357] outline-none focus:border-[#C35000]"
                          >
                            <span className={walkInDate ? "text-[#354357]" : "text-[#858C94]"}>
                              {walkInDate ? formatWalkInDate(walkInDate) : "Select an option"}
                            </span>
                            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-[#354357]" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <rect x="4" y="5.5" width="16" height="14" rx="1.5" />
                              <path d="M8 3.5v4M16 3.5v4M4 10h16" strokeLinecap="round" />
                            </svg>
                          </button>
                          {walkInDateOpen && (
                            <div role="dialog" aria-label="Choose appointment date" className="absolute left-0 top-full z-20 mt-2 w-full min-w-[260px] rounded-lg border border-[#AEB6C0] bg-white p-3 shadow-md">
                              <div className="mb-2 flex items-center justify-between">
                                <button
                                  type="button"
                                  aria-label="Previous month"
                                  onClick={() => setWalkInCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                                  className="rounded-md px-2 py-1 text-[#354357] hover:bg-[#F4F1EA]"
                                >
                                  ‹
                                </button>
                                <span className="text-[13px] font-medium text-[#354357]">{walkInMonthLabel}</span>
                                <button
                                  type="button"
                                  aria-label="Next month"
                                  onClick={() => setWalkInCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                                  className="rounded-md px-2 py-1 text-[#354357] hover:bg-[#F4F1EA]"
                                >
                                  ›
                                </button>
                              </div>
                              <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-[#858C94]">
                                {CALENDAR_WEEKDAYS.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
                              </div>
                              <div className="mt-1 grid grid-cols-7 gap-y-1 text-center">
                                {walkInCalendarDays.map((day, index) => {
                                  if (!day) return <span key={`empty-${index}`} />;
                                  const dateValue = `${walkInCalendarMonth.getFullYear()}-${String(walkInCalendarMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                  const selected = dateValue === walkInDate;
                                  return (
                                    <button
                                      key={dateValue}
                                      type="button"
                                      onClick={() => {
                                        setWalkInDate(dateValue);
                                        setWalkInDateOpen(false);
                                      }}
                                      className={`mx-auto flex h-7 w-7 items-center justify-center rounded-md text-[12px] transition ${selected ? "bg-[#C35000] text-white" : "text-[#354357] hover:bg-[#F4F1EA]"}`}
                                    >
                                      {day}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label htmlFor="walk-in-time" className="mb-1.5 block text-[13px] font-medium text-[#354357]">
                          Appointment Time<span className="text-[#C35000]">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="walk-in-time"
                            name="time"
                            required
                            value={walkInTime}
                            readOnly
                            className="h-12 w-full rounded-lg border border-[#AEB6C0] bg-white px-3 pr-9 text-[13px] text-[#354357] focus:border-[#C35000] focus:outline-none"
                          />
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#354357]"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <circle cx="12" cy="12" r="8.5" />
                            <path d="M12 7.5v5l3 1.75" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <button
                            type="button"
                            aria-label="Choose appointment time"
                            onClick={() => {
                              setWalkInTimeOpen((open) => !open);
                              setWalkInDateOpen(false);
                              setWalkInServiceOpen(false);
                              setWalkInStaffOpen(false);
                            }}
                            className="absolute inset-0 rounded-lg"
                          />
                          {walkInTimeOpen && (
                            <ul role="listbox" className="absolute inset-x-0 top-full z-20 mt-2 max-h-48 overflow-y-auto rounded-lg border border-[#AEB6C0] bg-white py-1 shadow-md">
                              {APPOINTMENT_TIMES.map((time) => (
                                <li key={time}>
                                  <button
                                    type="button"
                                    role="option"
                                    aria-selected={walkInTime === time}
                                    onClick={() => {
                                      setWalkInTime(time);
                                      setWalkInTimeOpen(false);
                                    }}
                                    className="w-full px-3 py-2.5 text-left text-[13px] text-[#354357] hover:bg-[#F4F1EA]"
                                  >
                                    {time}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </fieldset>

                  <div>
                    <label htmlFor="walk-in-notes" className="mb-1.5 block text-[13px] font-medium text-[#354357]">
                      Notes <span className="text-[#354357]">(optional)</span>
                    </label>
                    <textarea
                      id="walk-in-notes"
                      name="notes"
                      rows={2}
                      placeholder="Add customer requests or service notes..."
                      className="w-full resize-none rounded-lg border border-[#AEB6C0] bg-white px-3 py-3 text-[13px] text-[#354357] placeholder:text-[#354357] focus:border-[#C35000] focus:outline-none"
                    />
                  </div>

                  {bookingType === "walk-in" && (
                    <>
                      <label className="flex items-center gap-2 text-[12px] text-[#6D7580]">
                        <input
                          type="checkbox"
                          name="sendInvitation"
                          className="h-3.5 w-3.5 rounded-sm accent-[#C35000]"
                        />
                        <span>Send account invitation after this visit</span>
                      </label>
                      <p className="text-[11px] tracking-wide text-[#858C94]">
                        Existing scheduled bookings are protected. If a slot becomes unavailable, use the waiting list.
                      </p>
                    </>
                  )}

                  <div className={`flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center ${bookingType === "walk-in" ? "sm:justify-between" : "sm:justify-end"}`}>
                    {bookingType === "walk-in" ? (
                      <button
                        type="button"
                        disabled={isBookingSubmitting}
                        onClick={() => {
                          setIsNewBookingOpen(false);
                          setBookingError(null);
                          showToast("Customer added to the waiting list.");
                        }}
                        className="h-9 rounded-md border border-[#C35000] px-3 text-xs font-medium text-[#C35000] hover:bg-[#FFF7F0] disabled:opacity-60"
                      >
                        Add to waiting list
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isBookingSubmitting}
                        onClick={() => {
                          setIsNewBookingOpen(false);
                          setBookingError(null);
                        }}
                        className="h-9 rounded-md border border-[#E1E4E8] px-5 text-xs font-medium text-[#354357] hover:bg-[#F4F1EA] disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isBookingSubmitting}
                      className="h-9 rounded-md bg-[#C35000] px-6 text-xs font-semibold text-white shadow-xs transition hover:bg-[#A94400] disabled:opacity-60"
                    >
                      {isBookingSubmitting
                        ? "Creating..."
                        : bookingType === "walk-in"
                          ? "Create walk-in appointment"
                          : "Create Appointment"}
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
              href={`${basePath}/dashboard/appointments`}
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
