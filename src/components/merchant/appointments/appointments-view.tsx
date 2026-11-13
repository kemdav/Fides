"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MerchantSidebar } from "../merchant-sidebar";
import { Icon } from "@/components/admin/icon";
import { AdminButton } from "@/components/admin/admin-button";
import { MetricCard } from "@/components/admin/metric-card";
import { PageContent, PageHeading, StatusPill, Surface } from "@/components/admin/primitives";
import { updateAppointmentStatusAction } from "@/app/actions/appointments";
import { NewAppointmentModal, type NewAppointmentResult } from "@/components/merchant/new-appointment-modal";
import { WalkInModal, type WalkInResult } from "@/components/merchant/walk-in-modal";

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

// ─── helpers ────────────────────────────────────────────────────────────────

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

/** Parse "10:30 AM" → minutes-since-midnight */
function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

/** "10:30 AM" → "10:30" */
function formatTime24(timeStr: string): string {
  const mins = parseTimeToMinutes(timeStr);
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function getWeekRange(anchor: Date): Date[] {
  const start = new Date(anchor);
  const day = start.getDay(); // 0 = Sun
  start.setDate(start.getDate() - day); // back to Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function formatWeekLabel(dates: Date[]): string {
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  const start = dates[0].toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const end = dates[6].toLocaleDateString("en-US", opts);
  return `${start} – ${end}`;
}

/** status → color tokens for calendar event blocks */
function statusColors(status: AppointmentItem["status"]) {
  switch (status) {
    case "Confirmed":        return { bg: "bg-wash",       border: "border-success",     text: "text-success-deep",  pill: "bg-wash text-success-deep border-success/40" };
    case "Check In":         return { bg: "bg-info-bg",    border: "border-info",        text: "text-info",          pill: "bg-info-bg text-info border-info/40" };
    case "Pending approval": return { bg: "bg-warn-bg",    border: "border-warn-fg",     text: "text-warn-fg",       pill: "bg-warn-bg text-warn-fg border-warn-fg/40" };
    case "In service":       return { bg: "bg-info-bg",    border: "border-info",        text: "text-info",          pill: "bg-info-bg text-info border-info/40" };
    case "Completed":        return { bg: "bg-mist",       border: "border-line",        text: "text-subtle",        pill: "bg-mist text-subtle border-line" };
    case "Cancelled":        return { bg: "bg-danger-bg",  border: "border-danger",      text: "text-danger",        pill: "bg-danger-bg text-danger border-danger/40" };
    default:                 return { bg: "bg-mist",       border: "border-line",        text: "text-subtle",        pill: "bg-mist text-subtle border-line" };
  }
}

// Calendar constants
const HOUR_HEIGHT = 64; // px per hour slot
const CAL_START_HOUR = 8;  // 8:00 AM
const CAL_END_HOUR   = 20; // 8:00 PM
const HOURS = Array.from({ length: CAL_END_HOUR - CAL_START_HOUR }, (_, i) => CAL_START_HOUR + i);

// ─── component ──────────────────────────────────────────────────────────────

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
  const [calSubView, setCalSubView] = React.useState<"day" | "week" | "resources">("day");
  const [calendarAnchor, setCalendarAnchor] = React.useState<Date>(() => new Date());
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<AppointmentItem | null>(null);
  const [isNewBookingOpen, setIsNewBookingOpen] = React.useState(false);
  const [isWalkInOpen, setIsWalkInOpen] = React.useState(false);
  const [expandedAppointmentId, setExpandedAppointmentId] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [popoverItem, setPopoverItem] = React.useState<AppointmentItem | null>(null);

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
    const matchesStatus = filterStatus === "All" || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // ── week navigation ──────────────────────────────────────────────────────
  const weekDates = React.useMemo(() => getWeekRange(calendarAnchor), [calendarAnchor]);
  const weekLabel  = formatWeekLabel(weekDates);

  const shiftWeek = (dir: -1 | 1) => {
    setCalendarAnchor((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      return d;
    });
  };
  const shiftDay = (dir: -1 | 1) => {
    setCalendarAnchor((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir);
      return d;
    });
  };

  // ── derive unique staff list from items ──────────────────────────────────
  const staffList = React.useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const item of filtered) {
      if (!seen.has(item.staff)) { seen.add(item.staff); list.push(item.staff); }
    }
    return list.length > 0 ? list : ["No Staff"];
  }, [filtered]);

  // ── action handlers ───────────────────────────────────────────────────────
  const handleStatusChange = async (id: string, newStatus: AppointmentItem["status"]) => {
    setActiveMenuId(null);
    setPopoverItem(null);
    const prevItems = items;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)));
    try {
      const res = await updateAppointmentStatusAction({ appointmentId: id, newStatus, tenantIdParam: tenantId });
      if (!res.success) { setItems(prevItems); showToast(res.error || "Failed to update."); return; }
      showToast(`Status updated to ${newStatus}`);
      router.refresh();
    } catch (err: unknown) {
      setItems(prevItems);
      showToast(err instanceof Error ? err.message : "Failed to update.");
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    const target = cancelTarget;
    setCancelTarget(null);
    const prevItems = items;
    setItems((prev) => prev.filter((item) => item.id !== target.id));
    try {
      const res = await updateAppointmentStatusAction({ appointmentId: target.id, newStatus: "Cancelled", tenantIdParam: tenantId });
      if (!res.success) { setItems(prevItems); showToast(res.error || "Failed to cancel."); return; }
      showToast(`Appointment for ${target.customer} cancelled.`);
      router.refresh();
    } catch (err: unknown) {
      setItems(prevItems);
      showToast(err instanceof Error ? err.message : "Failed to cancel.");
    }
  };

  // ── calendar grid helpers ─────────────────────────────────────────────────
  /**
   * For "week" view: columns = days (Mon–Sun), rows = hours.
   * Appointment block top offset = (startMins - CAL_START_HOUR*60) / 60 * HOUR_HEIGHT
   * Appointment block height     = durationMins / 60 * HOUR_HEIGHT  (default 60 min)
   */
  const getCalendarTop = (timeStr: string): number => {
    const mins = parseTimeToMinutes(timeStr);
    return Math.max(0, (mins - CAL_START_HOUR * 60) / 60 * HOUR_HEIGHT);
  };

  // group filtered items by day-of-week index (0–6) for week view
  const itemsByDay = React.useMemo<Map<number, AppointmentItem[]>>(() => {
    const map = new Map<number, AppointmentItem[]>();
    for (let i = 0; i < 7; i++) map.set(i, []);
    for (const item of filtered) {
      if (!item.startsAt) continue;
      const d = new Date(item.startsAt);
      // find which day in this week
      for (let i = 0; i < 7; i++) {
        if (
          d.getFullYear() === weekDates[i].getFullYear() &&
          d.getMonth()    === weekDates[i].getMonth() &&
          d.getDate()     === weekDates[i].getDate()
        ) {
          map.get(i)!.push(item);
          break;
        }
      }
    }
    return map;
  }, [filtered, weekDates]);

  // group by staff for "resources" sub-view
  const itemsByStaff = React.useMemo<Map<string, AppointmentItem[]>>(() => {
    const map = new Map<string, AppointmentItem[]>();
    for (const s of staffList) map.set(s, []);
    for (const item of filtered) map.get(item.staff)?.push(item);
    return map;
  }, [filtered, staffList]);

  // today date string for highlight
  const today = new Date();

  return (
    <div className="flex min-h-dvh flex-col bg-powder text-ink lg:flex-row">
      <MerchantSidebar businessName={businessName} userEmail={userEmail} basePath={basePath} />

      <div className="min-w-0 flex-1">
        <PageContent>
          {/* Page Heading */}
          <PageHeading
            eyebrow="MERCHANT WORKSPACE"
            title="Appointments"
            description="Manage bookings, approvals, and appointment outcomes in one place."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <AdminButton variant="primary" size="sm" onClick={() => setIsNewBookingOpen(true)}>
                  + New Booking
                </AdminButton>
                <AdminButton variant="outline" size="sm" onClick={() => setIsWalkInOpen(true)}>
                  + Add Walk-in
                </AdminButton>
              </div>
            }
          />

          {/* KPI Metric Cards */}
          <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
            <MetricCard featured label="Today's appointments" value={todayCount} caption="All bookings scheduled for today" icon="calendar" progress={66} />
            <MetricCard label="Awaiting approval" value={awaitingCount} caption="Review requests before the start time" icon="verified" iconWeight="regular" progress={33} />
            <MetricCard label="Checked-in customers" value={checkedInCount} caption="Ready for their appointment" icon="users" progress={40} />
            <MetricCard label="Completed today" value={completedTodayCount} caption="Services completed today" icon="clock" progress={75} />
          </div>

          {/* Main Appointments Surface */}
          <Surface className="overflow-hidden !p-0">

            {/* ── Controls Bar ─────────────────────────────────────────────── */}
            <div className="p-4 sm:p-6 border-b border-hairline flex flex-wrap items-center justify-between gap-4">
              {/* Left: title + count */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Icon name="calendar" className="size-5 text-glyph" />
                  <h2 className="text-base font-semibold leading-6 text-ink">Appointments</h2>
                </div>
                <span className="inline-flex items-center rounded-md bg-mist px-2 py-1 text-xs font-semibold leading-[18px] text-ink">
                  {items.length} appointments
                </span>
              </div>

              {/* Right: search + filter + view toggle */}
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
                      {["All", "Confirmed", "Pending approval", "Check In"].map((s) => (
                        <button key={s} type="button" onClick={() => { setFilterStatus(s); setIsFilterOpen(false); }} className={`w-full text-left px-4 py-2 hover:bg-mist ${filterStatus === s ? "text-burnt font-semibold" : "text-body"}`}>{s}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* View toggle — ICON buttons */}
                <div className="flex items-center border border-hairline rounded-lg overflow-hidden bg-white p-0.5" role="group" aria-label="View mode">
                  {/* List view icon */}
                  <button
                    type="button"
                    aria-label="List view"
                    aria-pressed={viewMode === "list"}
                    onClick={() => setViewMode("list")}
                    className={`flex size-9 items-center justify-center rounded-md transition-colors ${
                      viewMode === "list" ? "bg-burnt text-white" : "text-muted hover:text-ink hover:bg-mist"
                    }`}
                  >
                    {/* rows / list icon */}
                    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
                      <rect x="3" y="4"  width="14" height="2" rx="1" />
                      <rect x="3" y="9"  width="14" height="2" rx="1" />
                      <rect x="3" y="14" width="14" height="2" rx="1" />
                    </svg>
                  </button>
                  {/* Calendar / grid icon */}
                  <button
                    type="button"
                    aria-label="Calendar view"
                    aria-pressed={viewMode === "calendar"}
                    onClick={() => setViewMode("calendar")}
                    className={`flex size-9 items-center justify-center rounded-md transition-colors ${
                      viewMode === "calendar" ? "bg-burnt text-white" : "text-muted hover:text-ink hover:bg-mist"
                    }`}
                  >
                    {/* calendar grid icon */}
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4" aria-hidden>
                      <rect x="2.5" y="3.5" width="15" height="14" rx="1.5" />
                      <line x1="2.5" y1="7.5" x2="17.5" y2="7.5" />
                      <line x1="7.5" y1="3.5" x2="7.5" y2="7.5" />
                      <line x1="12.5" y1="3.5" x2="12.5" y2="7.5" />
                      <line x1="7.5" y1="10.5" x2="7.5" y2="17.5" />
                      <line x1="12.5" y1="10.5" x2="12.5" y2="17.5" />
                      <line x1="2.5" y1="13.5" x2="17.5" y2="13.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                CALENDAR VIEW
               ═══════════════════════════════════════════════════════════════ */}
            {viewMode === "calendar" ? (
              <div>
                {/* Calendar sub-toolbar */}
                <div className="px-4 sm:px-6 py-3 border-b border-hairline flex flex-wrap items-center justify-between gap-3">
                  {/* Week/Day navigator */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Previous"
                      onClick={() => calSubView === "day" ? shiftDay(-1) : shiftWeek(-1)}
                      className="flex size-8 items-center justify-center rounded-full border border-hairline bg-white hover:bg-mist transition-colors text-ink"
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5"><path d="M10.5 3L5.5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                    </button>

                    <span className="text-sm font-semibold text-ink min-w-[220px] text-center">
                      {calSubView === "day"
                        ? calendarAnchor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
                        : weekLabel
                      }
                    </span>

                    <button
                      type="button"
                      aria-label="Next"
                      onClick={() => calSubView === "day" ? shiftDay(1) : shiftWeek(1)}
                      className="flex size-8 items-center justify-center rounded-full border border-hairline bg-white hover:bg-mist transition-colors text-ink"
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5"><path d="M5.5 3L10.5 8l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                    </button>

                    <span className="hidden sm:block text-xs text-muted pl-1">Asia/Manila (UTC+8)</span>
                  </div>

                  {/* Status legend */}
                  <div className="hidden md:flex items-center gap-3 text-[11px] text-muted">
                    {[
                      { label: "Confirmed",        bg: "bg-wash",       border: "border-success" },
                      { label: "Checked in",       bg: "bg-info-bg",    border: "border-info" },
                      { label: "Pending approval", bg: "bg-warn-bg",    border: "border-warn-fg" },
                    ].map(({ label, bg, border }) => (
                      <span key={label} className="flex items-center gap-1.5">
                        <span className={`inline-block w-3 h-3 rounded-sm border ${bg} ${border}`} />
                        {label}
                      </span>
                    ))}
                    <span className="text-muted">· 30-minute grid · Hours 08:00–20:00 · Scroll for later appointments</span>
                  </div>

                  {/* Day / Week / Resources sub-view toggle */}
                  <div className="flex items-center gap-1 rounded-lg border border-hairline bg-mist p-0.5">
                    {(["day", "week", "resources"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setCalSubView(v)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
                          calSubView === v ? "bg-white text-burnt shadow-sm" : "text-muted hover:text-ink"
                        }`}
                      >
                        {v === "resources" ? "Resources" : v.charAt(0).toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── WEEK VIEW grid ─────────────────────────────────────── */}
                {calSubView === "week" && (
                  <div className="overflow-x-auto">
                    {/* Staff header row */}
                    <div className="flex" style={{ minWidth: "720px" }}>
                      {/* GMT label cell */}
                      <div className="w-16 shrink-0 border-b border-hairline bg-white" />
                      {weekDates.map((date, di) => {
                        const isToday =
                          date.getDate()     === today.getDate() &&
                          date.getMonth()    === today.getMonth() &&
                          date.getFullYear() === today.getFullYear();
                        return (
                          <div
                            key={di}
                            className={`flex-1 border-b border-l border-hairline px-2 py-2 text-center ${isToday ? "bg-burnt/5" : "bg-white"}`}
                          >
                            <p className={`text-[11px] font-semibold uppercase tracking-wide ${isToday ? "text-burnt" : "text-subtle"}`}>
                              {date.toLocaleDateString("en-US", { weekday: "short" })}
                            </p>
                            <p className={`text-lg font-bold leading-tight ${isToday ? "text-burnt" : "text-ink"}`}>
                              {date.getDate()}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Scrollable time grid */}
                    <div className="overflow-y-auto" style={{ maxHeight: `${HOUR_HEIGHT * 8}px` }}>
                      <div className="relative flex" style={{ minWidth: "720px" }}>
                        {/* Time labels column */}
                        <div className="w-16 shrink-0 bg-white">
                          {HOURS.map((h) => (
                            <div key={h} className="border-b border-hairline flex items-start justify-end pr-2 pt-1" style={{ height: `${HOUR_HEIGHT}px` }}>
                              <span className="text-[10px] text-subtle font-medium">
                                {h === 12 ? "12:00" : h < 12 ? `${String(h).padStart(2,"0")}:00` : `${String(h).padStart(2,"0")}:00`}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Day columns */}
                        {weekDates.map((date, di) => {
                          const isToday =
                            date.getDate()     === today.getDate() &&
                            date.getMonth()    === today.getMonth() &&
                            date.getFullYear() === today.getFullYear();
                          const dayItems = itemsByDay.get(di) ?? [];
                          return (
                            <div
                              key={di}
                              className={`relative flex-1 border-l border-hairline ${isToday ? "bg-burnt/[0.03]" : "bg-white"}`}
                              style={{ height: `${HOUR_HEIGHT * HOURS.length}px` }}
                            >
                              {/* Hour grid lines */}
                              {HOURS.map((h) => (
                                <div key={h} className="absolute w-full border-b border-hairline" style={{ top: `${(h - CAL_START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}>
                                  {/* half-hour tick */}
                                  <div className="absolute w-full border-b border-dashed border-hairline" style={{ top: `${HOUR_HEIGHT / 2}px` }} />
                                </div>
                              ))}

                              {/* Appointment blocks */}
                              {dayItems.map((item) => {
                                const top    = getCalendarTop(item.time);
                                const height = Math.max(HOUR_HEIGHT, HOUR_HEIGHT); // 1-hour default
                                const colors = statusColors(item.status);
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setPopoverItem(popoverItem?.id === item.id ? null : item)}
                                    className={`absolute left-1 right-1 rounded-md border-l-[3px] px-2 py-1 text-left overflow-hidden shadow-sm hover:brightness-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${colors.bg} ${colors.border}`}
                                    style={{ top: `${top}px`, height: `${height - 4}px`, zIndex: 10 }}
                                  >
                                    <p className={`text-[11px] font-bold leading-tight truncate ${colors.text}`}>{item.customer}</p>
                                    <p className={`text-[10px] leading-tight truncate ${colors.text} opacity-80`}>{formatTime24(item.time)} · {item.service}</p>
                                    <p className={`text-[10px] leading-tight truncate ${colors.text} opacity-70`}>{item.staff}</p>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── DAY VIEW — single-column timeline ────────────────────── */}
                {calSubView === "day" && (() => {
                  // All appointments for the selected day, sorted by start time
                  const dayItems = filtered
                    .filter((item) => {
                      if (!item.startsAt) {
                        // fall back: treat items without startsAt as today
                        const anchor = calendarAnchor;
                        const t = new Date();
                        return (
                          t.getFullYear() === anchor.getFullYear() &&
                          t.getMonth()    === anchor.getMonth() &&
                          t.getDate()     === anchor.getDate()
                        );
                      }
                      const d = new Date(item.startsAt);
                      return (
                        d.getFullYear() === calendarAnchor.getFullYear() &&
                        d.getMonth()    === calendarAnchor.getMonth() &&
                        d.getDate()     === calendarAnchor.getDate()
                      );
                    })
                    .slice()
                    .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

                  // detect overlapping blocks so we can tile them side-by-side
                  // assign each item a column index within its overlap group
                  type ItemWithCol = AppointmentItem & { _col: number; _cols: number };
                  const placed: ItemWithCol[] = [];
                  for (const item of dayItems) {
                    const startMin = parseTimeToMinutes(item.time);
                    const endMin   = startMin + 60; // assume 60-min default
                    // find overlapping already-placed items
                    const overlapping = placed.filter((p) => {
                      const ps = parseTimeToMinutes(p.time);
                      const pe = ps + 60;
                      return startMin < pe && endMin > ps;
                    });
                    // find first free column
                    const usedCols = new Set(overlapping.map((p) => p._col));
                    let col = 0;
                    while (usedCols.has(col)) col++;
                    const totalCols = Math.max(col + 1, ...overlapping.map((p) => p._cols));
                    // update all overlapping items to same totalCols
                    for (const p of overlapping) p._cols = totalCols;
                    placed.push({ ...item, _col: col, _cols: totalCols });
                  }

                  return (
                    <div className="overflow-y-auto" style={{ maxHeight: `${HOUR_HEIGHT * 9}px` }}>
                      <div className="relative flex" style={{ minWidth: "480px" }}>
                        {/* Time-label column */}
                        <div className="w-16 shrink-0 bg-white select-none">
                          {HOURS.map((h) => (
                            <div
                              key={h}
                              className="relative border-b border-hairline flex items-start justify-end pr-3 pt-1"
                              style={{ height: `${HOUR_HEIGHT}px` }}
                            >
                              <span className="text-[11px] font-medium text-subtle -translate-y-2.5">
                                {h === 12
                                  ? "12:00 PM"
                                  : h < 12
                                    ? `${String(h).padStart(2, "0")}:00 AM`
                                    : `${String(h - 12).padStart(2, "0")}:00 PM`}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Main timeline column */}
                        <div
                          className="relative flex-1 bg-white"
                          style={{ height: `${HOUR_HEIGHT * HOURS.length}px` }}
                        >
                          {/* Hour + half-hour grid lines */}
                          {HOURS.map((h) => (
                            <React.Fragment key={h}>
                              <div
                                className="absolute left-0 right-0 border-t border-hairline"
                                style={{ top: `${(h - CAL_START_HOUR) * HOUR_HEIGHT}px` }}
                              />
                              <div
                                className="absolute left-0 right-0 border-t border-dashed border-hairline"
                                style={{ top: `${(h - CAL_START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }}
                              />
                            </React.Fragment>
                          ))}

                          {/* Current-time indicator */}
                          {(() => {
                            const now = new Date();
                            const nowMins = now.getHours() * 60 + now.getMinutes();
                            const isAnchorToday =
                              calendarAnchor.getDate()     === now.getDate() &&
                              calendarAnchor.getMonth()    === now.getMonth() &&
                              calendarAnchor.getFullYear() === now.getFullYear();
                            if (!isAnchorToday) return null;
                            const top = (nowMins - CAL_START_HOUR * 60) / 60 * HOUR_HEIGHT;
                            if (top < 0) return null;
                            return (
                              <div
                                className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                                style={{ top: `${top}px` }}
                              >
                                <span className="w-2.5 h-2.5 rounded-full bg-burnt shrink-0 -ml-1.5" />
                                <div className="flex-1 h-px bg-burnt" />
                              </div>
                            );
                          })()}

                          {/* Appointment blocks */}
                          {placed.map((item) => {
                            const top    = getCalendarTop(item.time);
                            const height = Math.max(HOUR_HEIGHT * 0.9, HOUR_HEIGHT); // 1-hr default
                            const colors = statusColors(item.status);
                            const colW   = 100 / item._cols;
                            const left   = colW * item._col;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setPopoverItem(popoverItem?.id === item.id ? null : item)}
                                className={`absolute rounded-lg border-l-[3px] px-3 py-1.5 text-left overflow-hidden shadow-sm hover:brightness-95 active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${colors.bg} ${colors.border}`}
                                style={{
                                  top:    `${top + 2}px`,
                                  height: `${height - 6}px`,
                                  left:   `calc(${left}% + 4px)`,
                                  width:  `calc(${colW}% - 8px)`,
                                  zIndex: 10,
                                }}
                              >
                                <p className={`text-xs font-bold leading-tight truncate ${colors.text}`}>
                                  {item.customer}
                                </p>
                                <p className={`text-[11px] leading-snug truncate ${colors.text} opacity-80`}>
                                  {formatTime24(item.time)} · {item.service}
                                </p>
                                <p className={`text-[11px] leading-snug truncate ${colors.text} opacity-70`}>
                                  {item.staff}
                                </p>
                                {height >= HOUR_HEIGHT && (
                                  <span className={`mt-1 inline-flex items-center rounded-full border px-2 py-px text-[10px] font-semibold ${colors.pill}`}>
                                    {item.status}
                                  </span>
                                )}
                              </button>
                            );
                          })}

                          {/* Empty state */}
                          {dayItems.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                              <Icon name="calendar" className="size-8 text-line" />
                              <p className="text-sm text-subtle">No appointments scheduled for this day.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── RESOURCES VIEW ───────────────────────────────────────── */}
                {calSubView === "resources" && (
                  <div className="overflow-x-auto">
                    {/* Staff header */}
                    <div className="flex border-b border-hairline" style={{ minWidth: `${staffList.length * 160 + 64}px` }}>
                      <div className="w-16 shrink-0 bg-white px-2 py-2 text-[10px] text-subtle font-semibold">GMT+8</div>
                      {staffList.map((s) => (
                        <div key={s} className="flex-1 border-l border-hairline bg-white px-3 py-2 text-center" style={{ minWidth: "160px" }}>
                          <p className="text-xs font-semibold text-ink truncate">{s}</p>
                          <p className="text-[10px] text-muted">09:00 – 17:00</p>
                        </div>
                      ))}
                    </div>

                    <div className="overflow-y-auto" style={{ maxHeight: `${HOUR_HEIGHT * 8}px` }}>
                      <div className="relative flex" style={{ minWidth: `${staffList.length * 160 + 64}px` }}>
                        {/* Time labels */}
                        <div className="w-16 shrink-0 bg-white">
                          {HOURS.map((h) => (
                            <div key={h} className="border-b border-hairline flex items-start justify-end pr-2 pt-1" style={{ height: `${HOUR_HEIGHT}px` }}>
                              <span className="text-[10px] text-subtle font-medium">{String(h).padStart(2,"0")}:00</span>
                            </div>
                          ))}
                        </div>
                        {/* Each staff column across all loaded items */}
                        {staffList.map((staffName) => {
                          const staffItems = itemsByStaff.get(staffName) ?? [];
                          const colors0 = { bg: "bg-mist", border: "border-line", text: "text-subtle", pill: "bg-mist text-subtle border-line" };
                          return (
                            <div
                              key={staffName}
                              className="relative flex-1 border-l border-hairline bg-white"
                              style={{ height: `${HOUR_HEIGHT * HOURS.length}px`, minWidth: "160px" }}
                            >
                              {HOURS.map((h) => (
                                <div key={h} className="absolute w-full border-b border-hairline" style={{ top: `${(h - CAL_START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}>
                                  <div className="absolute w-full border-b border-dashed border-hairline" style={{ top: `${HOUR_HEIGHT / 2}px` }} />
                                </div>
                              ))}
                              {staffItems.map((item) => {
                                const top    = getCalendarTop(item.time);
                                const height = HOUR_HEIGHT;
                                const colors = statusColors(item.status);
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setPopoverItem(popoverItem?.id === item.id ? null : item)}
                                    className={`absolute left-1 right-1 rounded-md border-l-[3px] px-2 py-1 text-left overflow-hidden shadow-sm hover:brightness-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${colors.bg} ${colors.border}`}
                                    style={{ top: `${top}px`, height: `${height - 4}px`, zIndex: 10 }}
                                  >
                                    <p className={`text-[11px] font-bold leading-tight truncate ${colors.text}`}>{item.customer}</p>
                                    <p className={`text-[10px] leading-tight truncate ${colors.text} opacity-80`}>{formatTime24(item.time)} · {item.service}</p>
                                    <span className={`mt-0.5 inline-flex items-center rounded-full border px-1.5 py-px text-[9px] font-semibold ${colors.pill}`}>{item.status}</span>
                                  </button>
                                );
                              })}
                              {staffItems.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-[10px] text-subtle">No bookings</span>
                                </div>
                              )}
                            </div>
                          );
                          void colors0;
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty state for calendar */}
                {filtered.length === 0 && (
                  <div className="py-12 text-center text-sm text-subtle border-t border-hairline">
                    No appointments found. Try adjusting your filter or navigate to another week.
                  </div>
                )}
              </div>

            ) : (
              /* ══════════════════════════════════════════════════════════════
                 LIST / TABLE VIEW
                ══════════════════════════════════════════════════════════════ */
              <>
                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-hairline">
                  {filtered.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm text-subtle">No appointments found.</p>
                  ) : (
                    filtered.map((row) => {
                      const isExpanded = expandedAppointmentId === row.id;
                      return (
                        <div key={row.id} className="px-5 py-4">
                          <button type="button" onClick={() => setExpandedAppointmentId(isExpanded ? null : row.id)} className="w-full text-left" aria-expanded={isExpanded}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-ink">{row.customer}</p>
                                <p className="mt-1 text-sm text-muted">{row.time} · {row.service}</p>
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
                                {row.status !== "Confirmed" && <AdminButton size="xs" variant="primary" onClick={() => handleStatusChange(row.id, "Confirmed")}>Confirm</AdminButton>}
                                {row.status !== "Check In"  && <AdminButton size="xs" variant="outline" onClick={() => handleStatusChange(row.id, "Check In")}>Check In</AdminButton>}
                                <AdminButton size="xs" variant="danger" onClick={() => setCancelTarget(row)}>Cancel</AdminButton>
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
                        {["Time","Customer","Service","Staff","Source","Status","Action"].map((h, i) => (
                          <th key={h} className={`px-5 py-3 text-[11px] leading-4 uppercase tracking-wide ${i === 6 ? "text-right" : ""}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {filtered.length === 0 ? (
                        <tr><td colSpan={7} className="px-5 py-8 text-center text-xs text-subtle">No appointments found.</td></tr>
                      ) : (
                        filtered.map((row) => (
                          <tr key={row.id} className="hover:bg-mist transition-colors">
                            <td className="px-5 py-3.5 font-medium text-body">{row.time}</td>
                            <td className="px-5 py-3.5 font-semibold text-ink">{row.customer}</td>
                            <td className="px-5 py-3.5 text-muted">{row.service}</td>
                            <td className="px-5 py-3.5 text-muted">{row.staff}</td>
                            <td className="px-5 py-3.5">
                              <span className={row.source === "Walk-In" ? "text-burnt font-medium" : "text-muted"}>{row.source}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              {(row.status === "Check In" || row.status === "Pending approval") ? (
                                <button type="button" onClick={() => handleStatusChange(row.id, "Confirmed")} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 rounded-md">
                                  <AppointmentStatusPill status={row.status} />
                                </button>
                              ) : (
                                <AppointmentStatusPill status={row.status} />
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right relative">
                              <button type="button" onClick={() => setActiveMenuId(activeMenuId === row.id ? null : row.id)} className="flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 text-glyph ml-auto">
                                <Icon name="more" weight="fill" className="size-5" />
                              </button>
                              {activeMenuId === row.id && (
                                <div className="absolute right-4 mt-1 w-44 rounded-[10px] bg-white border border-hairline shadow-lg py-1 z-30 text-left text-sm">
                                  {row.status !== "Confirmed" && <button type="button" onClick={() => handleStatusChange(row.id, "Confirmed")} className="w-full text-left px-4 py-2 hover:bg-mist text-body">Confirm</button>}
                                  {row.status !== "Check In"  && <button type="button" onClick={() => handleStatusChange(row.id, "Check In")}  className="w-full text-left px-4 py-2 hover:bg-mist text-body">Check In</button>}
                                  <button type="button" onClick={() => { setCancelTarget(row); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-danger-bg text-danger font-medium">Cancel booking</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 sm:p-6 border-t border-hairline flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
                  <span>Showing {filtered.length} of {items.length} appointments · All times in Asia/Manila (UTC+8)</span>
                </div>
              </>
            )}
          </Surface>
        </PageContent>
      </div>

      {/* ── Appointment detail popover (from calendar click) ───────────────── */}
      {popoverItem && (
        <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center p-4 bg-black/30 backdrop-blur-xs" onClick={() => setPopoverItem(null)}>
          <div
            className="w-full max-w-sm rounded-[10px] bg-white border border-line shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-ink">{popoverItem.customer}</p>
                <p className="text-sm text-muted mt-0.5">{popoverItem.service}</p>
              </div>
              <AppointmentStatusPill status={popoverItem.status} />
            </div>
            {/* details */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div><span className="text-subtle block">Time</span><span className="font-medium text-ink">{popoverItem.time}</span></div>
              <div><span className="text-subtle block">Staff</span><span className="font-medium text-ink">{popoverItem.staff}</span></div>
              <div><span className="text-subtle block">Source</span><span className={`font-medium ${popoverItem.source === "Walk-In" ? "text-burnt" : "text-ink"}`}>{popoverItem.source}</span></div>
            </div>
            {/* actions */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-hairline">
              {popoverItem.status !== "Confirmed" && (
                <AdminButton size="xs" variant="primary" onClick={() => handleStatusChange(popoverItem.id, "Confirmed")}>Confirm</AdminButton>
              )}
              {popoverItem.status !== "Check In" && (
                <AdminButton size="xs" variant="outline" onClick={() => handleStatusChange(popoverItem.id, "Check In")}>Check In</AdminButton>
              )}
              <AdminButton size="xs" variant="danger" onClick={() => { setCancelTarget(popoverItem); setPopoverItem(null); }}>Cancel</AdminButton>
              <AdminButton size="xs" variant="outline" onClick={() => setPopoverItem(null)} className="ml-auto">Close</AdminButton>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-white px-4 py-2.5 rounded-[10px] shadow-xl text-xs font-medium">
          {toastMessage}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-[10px] bg-white p-6 shadow-2xl border border-line">
            <h3 className="font-display text-[22px] leading-tight text-ink">Cancel Appointment?</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Are you sure you want to cancel the appointment for{" "}
              <span className="font-semibold text-ink">{cancelTarget.customer}</span> ({cancelTarget.service}) at {cancelTarget.time}?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <AdminButton variant="outline" size="xs" onClick={() => setCancelTarget(null)}>Keep</AdminButton>
              <AdminButton variant="danger" size="xs" onClick={handleConfirmCancel}>Confirm Cancel</AdminButton>
            </div>
          </div>
        </div>
      )}

      {/* New Appointment Modal (QA #4) */}
      <NewAppointmentModal
        isOpen={isNewBookingOpen}
        tenantId={tenantId}
        onClose={() => setIsNewBookingOpen(false)}
        onCreated={(result: NewAppointmentResult) => {
          setItems((prev) => [{
            id:       result.id,
            time:     result.time,
            customer: result.customer,
            service:  result.service,
            staff:    result.staff,
            source:   result.source,
            status:   "Confirmed",
            startsAt: result.startsAt,
          }, ...prev]);
        }}
        showToast={showToast}
      />
      <WalkInModal
        isOpen={isWalkInOpen}
        tenantId={tenantId}
        onClose={() => setIsWalkInOpen(false)}
        onCreated={(result: WalkInResult) => {
          setItems((prev) => [{
            id: result.id,
            time: result.time,
            customer: result.customer,
            service: result.service,
            staff: result.staff,
            source: "Walk-In",
            status: "Confirmed",
            startsAt: result.startsAt,
          }, ...prev]);
        }}
        showToast={showToast}
      />
    </div>
  );
}
