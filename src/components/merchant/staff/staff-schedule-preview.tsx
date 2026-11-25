"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { loadStaffScheduleAction } from "@/app/actions/staff-schedule";
import { Icon } from "@/components/admin/icon";
import { StatusPill } from "@/components/admin/primitives";
import { Modal } from "@/components/ui/modal";
import { addScheduleDays, scheduleWeekStart, type StaffSchedule, type StaffScheduleAppointment } from "@/lib/merchant/staff-schedule";
import { cn } from "@/lib/utils";

const views = ["Day", "Week", "List"] as const;
const dayLabel = new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", weekday: "short", day: "numeric" });
const dateLabel = new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
const atDate = (date: string) => new Date(`${date}T00:00:00Z`);

function statusLabel(status: string) {
  if (status === "checked_in") return "Checked in";
  return status[0].toUpperCase() + status.slice(1).replaceAll("_", " ");
}

function statusTone(status: string) {
  if (status === "confirmed" || status === "completed") return "success";
  if (status === "pending_approval") return "warning";
  if (status === "checked_in" || status === "in_service") return "info";
  return "neutral";
}

export function StaffSchedulePreview(props: {
  tenantId: string;
  staffId: string;
  name: string;
  role: string;
  timezone: string;
  today: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="xs" aria-haspopup="dialog" onClick={() => setOpen(true)}>Preview schedule</Button>
      {open && <ScheduleDialog {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function ScheduleDialog({ tenantId, staffId, name, role, timezone, today, onClose }: {
  tenantId: string;
  staffId: string;
  name: string;
  role: string;
  timezone: string;
  today: string;
  onClose: () => void;
}) {
  const [view, setView] = useState<(typeof views)[number]>("Week");
  const [date, setDate] = useState(today);
  const [result, setResult] = useState<{ week: string; data: StaffSchedule | null }>();
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<StaffScheduleAppointment | null>(null);
  const week = scheduleWeekStart(date);
  const data = result?.week === week ? result.data : undefined;

  useEffect(() => {
    let current = true;
    loadStaffScheduleAction({ tenantId, staffId, date: week }).then(
      (data) => { if (current) setResult({ week, data }); },
      () => { if (current) setResult({ week, data: null }); },
    );
    return () => { current = false; };
  }, [tenantId, staffId, week, retry]);

  const localDate = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone, dateStyle: "short" });
  const time = new Intl.DateTimeFormat("en-PH", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const zone = new Intl.DateTimeFormat("en", { timeZone: timezone, timeZoneName: "shortOffset" })
    .formatToParts(atDate(date)).find((part) => part.type === "timeZoneName")?.value;
  const minutes = (instant: number | string) => {
    const [hours, mins] = time.format(new Date(instant)).split(":").map(Number);
    return hours * 60 + mins;
  };
  const appointmentDate = (instant: string) => localDate.format(new Date(instant));
  const displayedDays = data?.days.filter((day) => view !== "Day" || day.date === date) ?? [];
  const dayBookings = displayedDays.map((day) => ({
    ...day,
    appointments: (data?.appointments ?? []).filter((appointment) =>
      appointmentDate(appointment.start) <= day.date
        && localDate.format(Date.parse(appointment.end) - 1) >= day.date
    ),
  }));
  const startMinute = (appointment: StaffScheduleAppointment, day: string) => appointmentDate(appointment.start) < day ? 0 : minutes(appointment.start);
  const displayedMinutes = dayBookings.flatMap((day) => [
    ...day.blocks.flatMap((block) => [minutes(block.start), block.end === day.dayEnd ? 1439 : minutes(block.end) - 1]),
    ...day.appointments.map((appointment) => startMinute(appointment, day.date)),
  ]);
  const firstHour = Math.max(0, Math.floor(Math.min(480, ...displayedMinutes) / 60));
  const lastHour = Math.min(23, Math.floor(Math.max(960, ...displayedMinutes) / 60));
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, index) => firstHour + index);
  const period = view === "Day" ? dateLabel.format(atDate(date)) : dateLabel.formatRange(atDate(week), atDate(addScheduleDays(week, 6)));
  const navigate = (direction: number) => {
    setDate(addScheduleDays(date, direction * (view === "Day" ? 1 : 7)));
    setSelected(null);
  };

  return (
    <Modal open unstyled onClose={onClose} labelledBy="staff-schedule-title"
      className="m-auto w-[calc(100%-1rem)] max-w-6xl overflow-hidden rounded-xl border border-hairline bg-white text-ink shadow-2xl sm:w-[calc(100%-2rem)]">
      <div className="flex max-h-[94dvh] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-6 sm:pt-6">
          <div>
            <h2 id="staff-schedule-title" className="font-display text-2xl leading-tight sm:text-3xl">{name} · Assigned schedule</h2>
            <p className="mt-1 text-sm text-muted">{role} · Read-only appointment preview</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close schedule" className="rounded-md p-2 text-muted hover:bg-mist">
            <Icon name="close" className="size-5" />
          </button>
        </header>

        <div className="min-h-0 space-y-4 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button variant="brand-outline" size="xs" className="size-8 rounded-full p-0" aria-label="Previous period" onClick={() => navigate(-1)}><Icon name="chevron-left" weight="medium" className="size-4" /></Button>
              <span className="text-sm font-semibold" aria-live="polite">{period}</span>
              <Button variant="brand-outline" size="xs" className="size-8 rounded-full p-0" aria-label="Next period" onClick={() => navigate(1)}><Icon name="chevron-right" weight="medium" className="size-4" /></Button>
              <span className="text-xs text-muted">{timezone}{zone && ` (${zone.replace("GMT", "UTC")})`}</span>
            </div>
            <div className="inline-flex w-full gap-1 rounded-full border border-hairline bg-mist p-1 sm:w-auto" role="group" aria-label="Schedule view">
              {views.map((mode) => (
                <button key={mode} type="button" aria-pressed={view === mode}
                  className={cn("flex min-h-9 flex-1 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burnt sm:min-w-16",
                    view === mode ? "bg-burnt text-on-burnt shadow-sm" : "text-body hover:bg-white")}
                  onClick={() => { setView(mode); setSelected(null); }}>{mode}</button>
              ))}
            </div>
          </div>

          {data && (
            <div className="rounded-lg bg-mist p-3 text-sm">
              {data.next ? (
                <>
                  <p className="font-semibold">Next appointment: {data.next.customer} · {time.format(new Date(data.next.start))}</p>
                  <p className="mt-1 text-xs text-muted">{[dateLabel.format(atDate(appointmentDate(data.next.start))), ...data.next.services, ...data.next.resources, statusLabel(data.next.status)].join(" · ")}</p>
                </>
              ) : <p className="text-muted">No upcoming assigned appointments.</p>}
            </div>
          )}

          {selected && (
            <section aria-label="Appointment details" aria-live="polite" className="flex items-start justify-between gap-3 rounded-lg border border-hairline p-3">
              <div className="space-y-1 text-sm">
                <h3 className="font-semibold">{selected.customer}</h3>
                <p className="text-muted">{dateLabel.format(atDate(appointmentDate(selected.start)))} · {time.format(new Date(selected.start))}–{time.format(new Date(selected.end))}{appointmentDate(selected.end) !== appointmentDate(selected.start) && ` · Ends ${dateLabel.format(atDate(appointmentDate(selected.end)))}`}</p>
                {selected.services.length > 0 && <p>{selected.services.join(", ")}</p>}
                {selected.resources.length > 0 && <p className="text-muted">{selected.resources.join(", ")}</p>}
                <StatusPill tone={statusTone(selected.status)}>{statusLabel(selected.status)}</StatusPill>
              </div>
              <Button variant="secondary" size="xs" onClick={() => setSelected(null)}>Close details</Button>
            </section>
          )}

          {data === undefined && <p role="status" className="rounded-lg bg-mist p-5 text-sm text-muted">Loading schedule…</p>}
          {data === null && (
            <div className="rounded-lg bg-mist p-5 text-sm">
              <p role="alert">The schedule could not be loaded.</p>
              <Button variant="brand-outline" size="xs" className="mt-2" onClick={() => { setResult(undefined); setRetry(retry + 1); }}>Try again</Button>
            </div>
          )}
          {data && view === "List" && (
            data.appointments.length ? (
              <ul className="divide-y divide-hairline rounded-lg border border-hairline">
                {data.appointments.map((appointment) => (
                  <li key={appointment.id}>
                    <button type="button" onClick={() => setSelected(appointment)} className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-3 text-left hover:bg-mist">
                      <span className="text-sm">
                        <span className="block font-semibold">{appointment.customer}</span>
                        <span className="text-xs text-muted">{[dayLabel.format(atDate(appointmentDate(appointment.start))), time.format(new Date(appointment.start)), ...appointment.services].join(" · ")}</span>
                      </span>
                      <StatusPill tone={statusTone(appointment.status)}>{statusLabel(appointment.status)}</StatusPill>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="rounded-lg bg-mist p-5 text-sm text-muted">No assigned appointments this week.</p>
          )}
          {data && view !== "List" && (
            <div className="max-h-[54dvh] overflow-auto rounded-md border border-hairline" tabIndex={0} role="region" aria-label={`${view} appointment calendar`}>
              <table className={cn("w-full table-fixed border-separate border-spacing-0 text-xs", view === "Week" && "min-w-[780px]")}>
                <thead className="sticky top-0 z-10 bg-white text-left">
                  <tr>
                    <th scope="col" className="w-16 border-b border-hairline px-2 py-2 text-muted">Time</th>
                    {dayBookings.map((day) => <th scope="col" key={day.date} className="border-b border-hairline px-2 py-2">{dayLabel.format(atDate(day.date))}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {hours.map((hour) => (
                    <tr key={hour}>
                      <th scope="row" className="border-b border-hairline px-2 py-2 text-left align-top font-normal text-muted">{String(hour).padStart(2, "0")}:00</th>
                      {dayBookings.map((day) => {
                        const overlapping = day.blocks.filter((block) =>
                          minutes(block.start) < (hour + 1) * 60 && (block.end === day.dayEnd ? 1440 : minutes(block.end)) > hour * 60
                        );
                        const working = !day.onLeave && overlapping.some((block) => block.type === "work");
                        const label = day.onLeave ? "On leave" : overlapping.some((block) => block.type === "break") ? "Break" : working ? "" : "Off shift";
                        const bookings = day.appointments.filter((booking) => Math.floor(startMinute(booking, day.date) / 60) === hour);
                        return (
                          <td key={day.date} className={cn("h-12 border-b border-l border-hairline p-1 align-top", !working && "bg-mist")}>
                            {label && <span className="block px-1 text-[11px] text-muted">{label}</span>}
                            {bookings.map((booking) => (
                              <button key={booking.id} type="button" onClick={() => setSelected(booking)}
                                className={cn("mb-1 block w-full rounded px-1.5 py-1 text-left hover:brightness-95", booking.status === "confirmed" ? "bg-wash" : booking.status === "pending_approval" ? "bg-warn-bg" : "bg-mist")}>
                                <span className="block break-words font-semibold">{booking.customer}</span>
                                <span className="text-[11px] text-muted">{time.format(new Date(booking.start))} · {statusLabel(booking.status)}</span>
                              </button>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data && view !== "List" && <p className="text-xs text-muted">Shaded cells show time outside shifts or during breaks. Weeks start on Monday.</p>}
        </div>
      </div>
    </Modal>
  );
}
