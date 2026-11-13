"use client";

import * as React from "react";
import Link from "next/link";
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

function AppointmentStatusPill({ status }: { status: AppointmentRow["status"] }) {
  const toneMap: Record<AppointmentRow["status"], { tone: React.ComponentProps<typeof StatusPill>["tone"]; label: string }> = {
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
    <div className="flex min-h-dvh flex-col bg-powder text-ink lg:flex-row">
      <MerchantSidebar
        businessName={businessName}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        basePath={basePath}
      />

      <div className="min-w-0 flex-1">
        <PageContent>
          {/* Page Heading */}
          <PageHeading
            eyebrow="MERCHANT WORKSPACE"
            title={`Welcome back, ${displayName.split(" ")[0] || "Maria"}`}
            description="Here's the latest update on your business. Let's make today a great one."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsPeriodOpen(!isPeriodOpen)}
                    className="h-12 rounded-lg border-2 border-outline bg-white px-4 text-sm font-semibold text-ink flex items-center gap-3 hover:bg-mist transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
                  >
                    <span>{period}</span>
                    <Icon name="chevron-down" className="size-4 text-glyph" />
                  </button>
                  {isPeriodOpen && (
                    <div className="absolute right-0 mt-2 w-44 rounded-[10px] bg-white border border-hairline shadow-lg py-2 z-30 text-sm">
                      {["Today", "This Week", "This Month"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => { setPeriod(p); setIsPeriodOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-mist ${period === p ? "text-burnt font-semibold" : "text-body"}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <AdminButton
                  variant="primary"
                  size="sm"
                  onClick={() => { setBookingType("appointment"); setWalkInDate(""); setIsNewBookingOpen(true); }}
                >
                  + New Booking
                </AdminButton>
                <AdminButton
                  variant="outline"
                  size="sm"
                  onClick={() => { setBookingType("walk-in"); setWalkInDate(new Date().toISOString().slice(0, 10)); setIsNewBookingOpen(true); }}
                >
                  + Add Walk-in
                </AdminButton>
              </div>
            }
          />

          {/* KPI Metric Cards (QA #1: Real loaded counts and amounts) */}
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              featured
              label="Today's appointments"
              value={todayCount}
              caption={`${confirmedCount} confirmed · Your schedule at a glance`}
              icon="calendar"
              progress={todayCount > 0 ? Math.min(100, Math.round((confirmedCount / todayCount) * 100)) : 0}
            />
            <MetricCard
              label="Pending approvals"
              value={pendingCount}
              caption={`${pendingCount} ${pendingCount === 1 ? "request is" : "requests are"} waiting for your approval`}
              icon="clock"
              progress={35}
            />
            <MetricCard
              label="Checked-in customers"
              value={checkedInCount}
              caption={`${checkedInCount} ${checkedInCount === 1 ? "customer" : "customers"} ready for their appointments`}
              icon="users"
              progress={todayCount > 0 ? Math.min(100, Math.round((checkedInCount / todayCount) * 100)) : 0}
            />
            <MetricCard
              label="Completed revenue"
              value={revenueTotal}
              caption={`${completedVisitsCount} ${completedVisitsCount === 1 ? "visit" : "visits"} completed today`}
              icon="card"
              progress={75}
            />
          </div>

          {/* Middle Section: Appointment statistics & Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Appointment statistics (7 cols) */}
            <Surface className="lg:col-span-7 min-h-[390px] h-full space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="chart" className="size-5 text-glyph" />
                  <h3 className="text-sm font-semibold text-ink tracking-wide uppercase">
                    Appointment statistics
                  </h3>
                </div>
                <div className="flex items-center gap-5 text-sm">
                  <span className="flex items-center gap-1.5 text-muted">
                    <span className="size-2.5 rounded-full bg-burnt" />
                    <span>Booked</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted">
                    <span className="size-2.5 rounded-full bg-sky" />
                    <span>Completed</span>
                  </span>
                </div>
              </div>

              {/* Bar Chart (QA #1: dynamic chart heights) */}
              <div className="pt-4">
                <div className="h-60 w-full flex items-end justify-between gap-4 px-3 border-b border-hairline">
                  {stats.map((item) => (
                    <div key={item.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                      <div className="w-full flex items-end justify-center gap-1.5 h-52">
                        <div
                          className="w-7 bg-burnt rounded-t-sm transition-all duration-300 relative min-h-[4px]"
                          style={{ height: `${item.booked > 0 ? (item.booked / maxVal) * 100 : 4}%` }}
                        >
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-subtle">
                            {item.booked}
                          </span>
                        </div>
                        <div
                          className="w-7 bg-sky rounded-t-sm transition-all duration-300 relative min-h-[4px]"
                          style={{ height: `${item.completed > 0 ? (item.completed / maxVal) * 100 : 4}%` }}
                        >
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-subtle">
                            {item.completed}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm text-muted font-medium">{item.day}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Surface>

            {/* Calendar & Today's Activity (5 cols) */}
            <Surface className="lg:col-span-5 min-h-[390px] h-full space-y-6">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <Icon name="calendar" className="size-5 text-glyph" />
                  <h3 className="text-sm font-semibold text-ink tracking-wide uppercase">Calendar</h3>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-burnt" />
                    <span>Booked</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-sky" />
                    <span>Completed</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-1">
                {/* Mini Calendar */}
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-ink mb-2">
                    <span className="cursor-pointer text-glyph hover:text-muted">‹</span>
                    <span className="font-semibold">{currentMonthLabel}</span>
                    <span className="cursor-pointer text-glyph hover:text-muted">›</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-subtle mb-2">
                    <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 text-center text-sm font-medium text-body">
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
                              ? "bg-burnt/15 text-burnt rounded-md font-bold"
                              : "rounded-md hover:bg-burnt/10"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected date activity */}
                <div className="space-y-2.5 border-t sm:border-t-0 sm:border-l border-hairline sm:pl-4 pt-3 sm:pt-0">
                  <span className="text-sm font-semibold text-ink block">
                    {activeCalendarLabel}&apos;s activity
                  </span>
                  <div className="space-y-3 text-sm max-h-48 overflow-y-auto">
                    {activeCalendarAppointments.length > 0 ? (
                      activeCalendarAppointments.map((appointment) => (
                        <div key={appointment.id} className="flex items-start gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                              appointment.status === "Completed" ? "bg-sky" : "bg-burnt"
                            }`}
                          />
                          <div>
                            <span className="font-medium text-body">
                              {appointment.time} · {appointment.customer}
                            </span>
                            <span className="text-subtle block text-xs">
                              {appointment.service} · {appointment.status}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-subtle block">
                        No activity scheduled for this date.
                      </span>
                    )}
                  </div>
                  <div className="border-t border-hairline pt-3 text-xs text-muted">
                    <span className="font-semibold text-body">
                      {activeCompletedAppointments.length}
                    </span>{" "}
                    completed appointment{activeCompletedAppointments.length === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            </Surface>
          </div>

          {/* Bottom Section: Today's Appointments Table */}
          <Surface className="overflow-hidden !p-0">
            {/* Card Controls */}
            <div className="p-4 sm:p-6 border-b border-hairline flex flex-wrap items-center justify-between gap-5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Icon name="users" className="size-5 text-glyph" />
                  <h3 className="text-base font-semibold leading-6 text-ink">
                    Today&apos;s appointments
                  </h3>
                </div>
                <span className="inline-flex items-center rounded-md bg-mist px-2 py-1 text-xs font-semibold leading-[18px] text-ink">
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
                    className="h-11 pl-10 pr-3 rounded-lg border border-hairline bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/40 focus:bg-white w-48 sm:w-64 transition-shadow"
                  />
                  <Icon name="search" className="size-4 text-glyph absolute left-3 top-3 pointer-events-none" />
                </div>

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
                    <div className="absolute right-0 mt-1 w-40 rounded-[10px] bg-white border border-hairline shadow-lg py-1 z-20 text-sm">
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
              </div>
            </div>

            {/* Mobile appointment cards */}
            <div className="md:hidden divide-y divide-hairline">
              {filtered.length === 0 ? (
                <p className="px-5 py-8 text-center text-xs text-subtle">
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
                            <p className="text-sm font-semibold text-ink truncate">{row.customer}</p>
                            <p className="mt-1 text-xs text-muted">
                              {row.time} · {row.service}
                            </p>
                          </div>
                          <AppointmentStatusPill status={row.status} />
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="mt-3 rounded-lg bg-powder p-3 text-xs text-muted space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <span>Staff <strong className="block text-ink">{row.staff}</strong></span>
                            <span>Source <strong className="block text-ink">{row.source}</strong></span>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
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

            {/* Desktop table (QA #1: Empty state row when 0 appointments) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-mist border-b border-hairline text-subtle font-semibold">
                  <tr>
                    <th className="px-6 py-4 text-[11px] leading-4 uppercase tracking-wide">Time</th>
                    <th className="px-6 py-4 text-[11px] leading-4 uppercase tracking-wide">Customer</th>
                    <th className="px-6 py-4 text-[11px] leading-4 uppercase tracking-wide">Service</th>
                    <th className="px-6 py-4 text-[11px] leading-4 uppercase tracking-wide">Staff</th>
                    <th className="px-6 py-4 text-[11px] leading-4 uppercase tracking-wide">Source</th>
                    <th className="px-6 py-4 text-[11px] leading-4 uppercase tracking-wide">Status</th>
                    <th className="px-6 py-4 text-[11px] leading-4 uppercase tracking-wide text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-xs text-subtle">
                        No appointments scheduled for today.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => (
                      <tr key={row.id} className="hover:bg-mist transition-colors">
                        <td className="px-6 py-4 font-medium text-body">{row.time}</td>
                        <td className="px-6 py-4 font-semibold text-ink">{row.customer}</td>
                        <td className="px-6 py-4 text-muted">{row.service}</td>
                        <td className="px-6 py-4 text-muted">{row.staff}</td>
                        <td className="px-6 py-4">
                          <span className={row.source === "Walk-In" ? "text-burnt font-medium" : "text-muted"}>
                            {row.source}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <AppointmentStatusPill status={row.status} />
                        </td>
                        <td className="px-6 py-4 text-right relative">
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(activeMenuId === row.id ? null : row.id)}
                            className="flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 text-glyph"
                          >
                            <Icon name="more" weight="fill" className="size-5" />
                          </button>

                          {activeMenuId === row.id && (
                            <div className="absolute right-4 mt-1 w-40 rounded-[10px] bg-white border border-hairline shadow-lg py-1 z-30 text-left text-sm">
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
              <span>Showing {filtered.length} of {appointments.length} appointments · All times in Asia/Manila (UTC+8)</span>
              <Link
                href={`${basePath}/dashboard/appointments`}
                className="text-burnt font-semibold hover:underline inline-flex items-center gap-1"
              >
                <span>View All Appointments</span>
                <span>→</span>
              </Link>
            </div>
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

      {/* New Booking / Walk-in Modal (QA #4) */}
      {isNewBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-5 bg-black/35 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-booking-title"
            className="relative my-auto w-full max-w-2xl overflow-visible rounded-[10px] bg-white px-6 py-6 shadow-2xl border border-line"
          >
            <div className="flex items-start justify-between pb-5 border-b border-hairline">
              <div>
                <h3 id="new-booking-title" className="font-display text-[28px] leading-[38px] text-ink">
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
              <div className="mt-4 rounded-lg border border-danger/20 bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
                {bookingError}
              </div>
            )}

            <form onSubmit={handleNewBookingSubmit} className="mt-5 space-y-5 text-sm">
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-[1.2px] text-muted">
                  Customer Information
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="booking-customer" className="mb-1.5 block text-sm font-semibold text-ink">
                      Customer Name <span className="text-burnt">*</span>
                    </label>
                    <input
                      id="booking-customer"
                      name="customer"
                      required
                      placeholder="Juan Dela Cruz"
                      className="h-12 w-full rounded-lg border border-outline bg-white px-4 text-sm text-ink placeholder:text-glyph focus:border-burnt focus:outline-none focus:ring-2 focus:ring-burnt/30"
                    />
                  </div>
                  {bookingType === "appointment" && (
                    <div>
                      <label htmlFor="booking-phone" className="mb-1.5 block text-sm font-semibold text-ink">
                        Contact Number <span className="text-burnt">*</span>
                      </label>
                      <input
                        id="booking-phone"
                        name="phone"
                        required
                        type="tel"
                        placeholder="09956663254"
                        className="h-12 w-full rounded-lg border border-outline bg-white px-4 text-sm text-ink placeholder:text-glyph focus:border-burnt focus:outline-none focus:ring-2 focus:ring-burnt/30"
                      />
                    </div>
                  )}
                </div>
                {bookingType === "walk-in" && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="booking-email" className="mb-1.5 block text-sm font-semibold text-ink">
                        Email <span className="text-muted">(optional)</span>
                      </label>
                      <input
                        id="booking-email"
                        name="email"
                        type="email"
                        placeholder="juan@gmail.com"
                        className="h-12 w-full rounded-lg border border-outline bg-white px-4 text-sm text-ink placeholder:text-glyph focus:border-burnt focus:outline-none focus:ring-2 focus:ring-burnt/30"
                      />
                    </div>
                    <div>
                      <label htmlFor="booking-phone-walkin" className="mb-1.5 block text-sm font-semibold text-ink">
                        Contact Number <span className="text-burnt">*</span>
                      </label>
                      <input
                        id="booking-phone-walkin"
                        name="phone"
                        required
                        type="tel"
                        placeholder="09956663254"
                        className="h-12 w-full rounded-lg border border-outline bg-white px-4 text-sm text-ink placeholder:text-glyph focus:border-burnt focus:outline-none focus:ring-2 focus:ring-burnt/30"
                      />
                    </div>
                  </div>
                )}
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-[1.2px] text-muted">
                  Service &amp; Staff
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="booking-service" className="mb-1.5 block text-sm font-semibold text-ink">
                      {bookingType === "walk-in" ? "Requested Service" : "Service Name"} <span className="text-burnt">*</span>
                    </label>
                    <div className="relative">
                      <input type="hidden" name="service" value={walkInService} />
                      <button
                        id="booking-service"
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={walkInServiceOpen}
                        onClick={() => { setWalkInServiceOpen((o) => !o); setWalkInStaffOpen(false); setWalkInDateOpen(false); }}
                        className="flex h-12 w-full items-center justify-between rounded-lg border border-outline bg-white px-4 text-left text-sm text-ink focus:border-burnt focus:outline-none focus:ring-2 focus:ring-burnt/30"
                      >
                        <span>{WALK_IN_SERVICES.find((o) => o.value === walkInService)?.label}</span>
                        <Icon name="chevron-down" className={`size-4 text-glyph transition-transform ${walkInServiceOpen ? "rotate-180" : ""}`} />
                      </button>
                      {walkInServiceOpen && (
                        <ul role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-outline bg-white py-1 shadow-lg">
                          {WALK_IN_SERVICES.map((option) => (
                            <li key={option.value}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={walkInService === option.value}
                                onClick={() => { setWalkInService(option.value); setWalkInServiceOpen(false); }}
                                className="w-full px-4 py-2.5 text-left text-sm text-body hover:bg-mist"
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
                    <label htmlFor="booking-staff" className="mb-1.5 block text-sm font-semibold text-ink">
                      Service Staff <span className="text-burnt">*</span>
                    </label>
                    <div className="relative">
                      <input type="hidden" name="staff" value={walkInStaff} />
                      <button
                        id="booking-staff"
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={walkInStaffOpen}
                        onClick={() => { setWalkInStaffOpen((o) => !o); setWalkInServiceOpen(false); setWalkInDateOpen(false); }}
                        className="flex h-12 w-full items-center justify-between rounded-lg border border-outline bg-white px-4 text-left text-sm text-ink focus:border-burnt focus:outline-none focus:ring-2 focus:ring-burnt/30"
                      >
                        <span>{walkInStaff}</span>
                        <Icon name="chevron-down" className={`size-4 text-glyph transition-transform ${walkInStaffOpen ? "rotate-180" : ""}`} />
                      </button>
                      {walkInStaffOpen && (
                        <ul role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-outline bg-white py-1 shadow-lg">
                          {WALK_IN_STAFF.map((staff) => (
                            <li key={staff}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={walkInStaff === staff}
                                onClick={() => { setWalkInStaff(staff); setWalkInStaffOpen(false); }}
                                className="w-full px-4 py-2.5 text-left text-sm text-body hover:bg-mist"
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

              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-[1.2px] text-muted">
                  Schedule
                </legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="booking-date" className="mb-1.5 block text-sm font-semibold text-ink">
                      Appointment Date <span className="text-burnt">*</span>
                    </label>
                    <div className="relative">
                      <input type="hidden" name="date" value={walkInDate} />
                      <button
                        id="booking-date"
                        type="button"
                        aria-haspopup="dialog"
                        aria-expanded={walkInDateOpen}
                        onClick={() => { setWalkInDateOpen((o) => !o); setWalkInServiceOpen(false); setWalkInStaffOpen(false); }}
                        className="flex h-12 w-full items-center justify-between rounded-lg border border-outline bg-white px-4 text-left text-sm text-ink focus:border-burnt focus:outline-none focus:ring-2 focus:ring-burnt/30"
                      >
                        <span className={walkInDate ? "text-ink" : "text-glyph"}>
                          {walkInDate ? formatWalkInDate(walkInDate) : "Select a date"}
                        </span>
                        <Icon name="calendar" className="size-4 text-glyph" />
                      </button>
                      {walkInDateOpen && (
                        <div role="dialog" aria-label="Choose appointment date" className="absolute left-0 top-full z-20 mt-1 w-full min-w-[260px] rounded-lg border border-outline bg-white p-4 shadow-lg">
                          <div className="mb-3 flex items-center justify-between">
                            <button
                              type="button"
                              aria-label="Previous month"
                              onClick={() => setWalkInCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                              className="rounded-md px-2 py-1 text-body hover:bg-mist"
                            >
                              ‹
                            </button>
                            <span className="text-sm font-semibold text-ink">{walkInMonthLabel}</span>
                            <button
                              type="button"
                              aria-label="Next month"
                              onClick={() => setWalkInCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                              className="rounded-md px-2 py-1 text-body hover:bg-mist"
                            >
                              ›
                            </button>
                          </div>
                          <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-subtle">
                            {CALENDAR_WEEKDAYS.map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}
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
                                  onClick={() => { setWalkInDate(dateValue); setWalkInDateOpen(false); }}
                                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-md text-sm transition ${selected ? "bg-burnt text-white" : "text-body hover:bg-mist"}`}
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
                    <label htmlFor="booking-time" className="mb-1.5 block text-sm font-semibold text-ink">
                      Appointment Time <span className="text-burnt">*</span>
                    </label>
                    <div className="relative">
                      <input id="booking-time" name="time" required value={walkInTime} readOnly
                        className="h-12 w-full rounded-lg border border-outline bg-white px-4 pr-10 text-sm text-ink focus:border-burnt focus:outline-none focus:ring-2 focus:ring-burnt/30"
                      />
                      <Icon name="clock" className="pointer-events-none absolute right-3 top-3.5 size-4 text-glyph" />
                      <button
                        type="button"
                        aria-label="Choose appointment time"
                        onClick={() => { setWalkInTimeOpen((o) => !o); setWalkInDateOpen(false); setWalkInServiceOpen(false); setWalkInStaffOpen(false); }}
                        className="absolute inset-0 rounded-lg"
                      />
                      {walkInTimeOpen && (
                        <ul role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-outline bg-white py-1 shadow-lg">
                          {APPOINTMENT_TIMES.map((time) => (
                            <li key={time}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={walkInTime === time}
                                onClick={() => { setWalkInTime(time); setWalkInTimeOpen(false); }}
                                className="w-full px-4 py-2.5 text-left text-sm text-body hover:bg-mist"
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
                <label htmlFor="booking-notes" className="mb-1.5 block text-sm font-semibold text-ink">
                  Notes <span className="text-muted">(optional)</span>
                </label>
                <textarea
                  id="booking-notes"
                  name="notes"
                  rows={2}
                  placeholder="Add customer requests or service notes..."
                  className="w-full resize-none rounded-lg border border-outline bg-white px-4 py-3 text-sm text-ink placeholder:text-glyph focus:border-burnt focus:outline-none focus:ring-2 focus:ring-burnt/30"
                />
              </div>

              {bookingType === "walk-in" && (
                <>
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <input type="checkbox" name="sendInvitation" className="h-4 w-4 rounded border-outline accent-burnt" />
                    <span>Send account invitation after this visit</span>
                  </label>
                  <p className="text-xs text-subtle">
                    Existing scheduled bookings are protected. If a slot becomes unavailable, use the waiting list.
                  </p>
                </>
              )}

              <div className={`flex flex-col-reverse gap-3 pt-2 border-t border-hairline sm:flex-row sm:items-center ${bookingType === "walk-in" ? "sm:justify-between" : "sm:justify-end"}`}>
                {bookingType === "walk-in" ? (
                  <AdminButton
                    variant="outline"
                    size="xs"
                    type="button"
                    disabled={isBookingSubmitting}
                    onClick={() => { setIsNewBookingOpen(false); setBookingError(null); showToast("Customer added to the waiting list."); }}
                  >
                    Add to waiting list
                  </AdminButton>
                ) : (
                  <AdminButton
                    variant="outline"
                    size="xs"
                    type="button"
                    disabled={isBookingSubmitting}
                    onClick={() => { setIsNewBookingOpen(false); setBookingError(null); }}
                  >
                    Cancel
                  </AdminButton>
                )}
                <AdminButton
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={isBookingSubmitting}
                >
                  {isBookingSubmitting
                    ? "Creating..."
                    : bookingType === "walk-in"
                      ? "Create walk-in appointment"
                      : "Create Appointment"}
                </AdminButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
