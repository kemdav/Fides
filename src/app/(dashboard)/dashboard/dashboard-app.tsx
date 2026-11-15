"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { logout } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

type Props = {
  owner: string;
  email: string;
  phone: string;
  reference: string;
  business: { name: string; type: string; address: string; established: number | null; logoUrl: string | null };
  plan: { name: string; price: number };
};

type Section = "overview" | "appointments" | "services" | "staff" | "customers" | "reports" | "settings";

const NAV: { id: Section; label: string; path: string }[] = [
  { id: "overview", label: "Overview", path: "M4 4h7v7H4V4Zm9 0h7v5h-7V4ZM4 13h7v7H4v-7Zm9-2h7v9h-7v-9Z" },
  { id: "appointments", label: "Appointments", path: "M7 2v3M17 2v3M4 8h16M5 4h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" },
  { id: "services", label: "Services", path: "M4 7h16M4 12h16M4 17h10" },
  { id: "staff", label: "Staff", path: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 7m2 9a7 7 0 0 0-3-5.7" },
  { id: "customers", label: "Customers", path: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0" },
  { id: "reports", label: "Reports", path: "M4 20V10m6 10V4m6 16v-7m4 7H2" },
  { id: "settings", label: "Settings", path: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-2-1.2L14.6 3h-4l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7.4 7.4 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9c.6.5 1.300.9 2 1.200l.4 2.600h4l.4-2.600c.7-.3 1.400-.7 2-1.200l2.300.9 2-3.400-2-1.500c.1-.4.1-.8.1-1.200Z" },
];

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={cn("size-5 shrink-0", className)}>
      <path d={d} />
    </svg>
  );
}

type Appointment = { id: number; time: string; customer: string; service: string; staff: string; status: "confirmed" | "pending" | "completed" | "cancelled"; price: number };
type Service = { id: number; name: string; minutes: number; price: number; active: boolean };
type StaffMember = { id: number; name: string; role: string; available: boolean };
type Customer = { id: number; name: string; email: string; visits: number; lastVisit: string };

const seedAppointments: Appointment[] = [
  { id: 1, time: "09:00", customer: "Angela Reyes", service: "Signature Haircut", staff: "Mika", status: "completed", price: 650 },
  { id: 2, time: "10:30", customer: "Paolo Dizon", service: "Classic Facial", staff: "Rhea", status: "confirmed", price: 1200 },
  { id: 3, time: "13:00", customer: "Lara Mendoza", service: "Hair Color", staff: "Mika", status: "confirmed", price: 2400 },
  { id: 4, time: "15:30", customer: "Jules Tan", service: "Full Body Massage", staff: "Dante", status: "pending", price: 1500 },
  { id: 5, time: "17:00", customer: "Bea Ortega", service: "Manicure & Pedicure", staff: "Rhea", status: "pending", price: 900 },
];
const seedServices: Service[] = [
  { id: 1, name: "Signature Haircut", minutes: 45, price: 650, active: true },
  { id: 2, name: "Classic Facial", minutes: 60, price: 1200, active: true },
  { id: 3, name: "Hair Color", minutes: 120, price: 2400, active: true },
  { id: 4, name: "Full Body Massage", minutes: 90, price: 1500, active: true },
  { id: 5, name: "Manicure & Pedicure", minutes: 75, price: 900, active: false },
];
const seedStaff: StaffMember[] = [
  { id: 1, name: "Mika Villanueva", role: "Senior Stylist", available: true },
  { id: 2, name: "Rhea Castillo", role: "Aesthetician", available: true },
  { id: 3, name: "Dante Ramos", role: "Massage Therapist", available: false },
];
const seedCustomers: Customer[] = [
  { id: 1, name: "Angela Reyes", email: "angela@example.com", visits: 12, lastVisit: "Today" },
  { id: 2, name: "Paolo Dizon", email: "paolo@example.com", visits: 5, lastVisit: "Yesterday" },
  { id: 3, name: "Lara Mendoza", email: "lara@example.com", visits: 8, lastVisit: "3 days ago" },
  { id: 4, name: "Jules Tan", email: "jules@example.com", visits: 2, lastVisit: "1 week ago" },
  { id: 5, name: "Bea Ortega", email: "bea@example.com", visits: 1, lastVisit: "2 weeks ago" },
];
const weeklyRevenue = [
  { day: "Mon", value: 4200 },
  { day: "Tue", value: 5600 },
  { day: "Wed", value: 3800 },
  { day: "Thu", value: 6900 },
  { day: "Fri", value: 8100 },
  { day: "Sat", value: 9400 },
  { day: "Sun", value: 3100 },
];

const peso = (value: number) => `₱${value.toLocaleString("en-PH")}`;

const statusTone: Record<Appointment["status"], string> = {
  confirmed: "bg-info-bg text-info",
  pending: "bg-warn-bg text-warn-fg",
  completed: "bg-wash text-success",
  cancelled: "bg-danger-bg text-danger-dark",
};

function Card({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl bg-white p-5 shadow-[0_3px_14px_rgb(44_58_75/0.06)] sm:p-6", className)}>
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40", on ? "bg-burnt" : "bg-line")}
    >
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

const btn = "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40";
const btnPrimary = cn(btn, "bg-burnt text-white hover:bg-burnt-dark");
const btnOutline = cn(btn, "border-2 border-outline/70 text-ink hover:bg-mist");
const inputCls = "h-11 w-full rounded-lg border border-outline/50 bg-white px-3 text-sm text-ink placeholder:text-subtle focus-visible:border-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/30";

export function DashboardApp({ owner, email, phone, reference, business, plan }: Props) {
  const [section, setSection] = useState<Section>("overview");
  const [menu, setMenu] = useState(false);
  const [appointments, setAppointments] = useState(seedAppointments);
  const [services, setServices] = useState(seedServices);
  const [staff, setStaff] = useState(seedStaff);
  const [filter, setFilter] = useState<"all" | Appointment["status"]>("all");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [newService, setNewService] = useState({ name: "", minutes: "", price: "" });
  const [newAppt, setNewAppt] = useState({ customer: "", service: seedServices[0].name, time: "" });
  const [brand, setBrand] = useState("#c35000");
  const [notify, setNotify] = useState({ email: true, sms: false, reminders: true });
  const [profile, setProfile] = useState({ name: business.name, phone, address: business.address });

  const initials = useMemo(() => business.name.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase(), [business.name]);
  const revenueToday = appointments.filter((a) => a.status !== "cancelled").reduce((sum, a) => sum + a.price, 0);
  const peak = Math.max(...weeklyRevenue.map((d) => d.value));

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }

  function go(next: Section) {
    setSection(next);
    setMenu(false);
    window.scrollTo({ top: 0 });
  }

  const nav = (
    <nav aria-label="Dashboard" className="flex flex-col gap-1.5">
      {NAV.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => go(item.id)}
          aria-current={section === item.id ? "page" : undefined}
          className={cn(
            "flex h-11 items-center gap-3 rounded-[9px] px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40",
            section === item.id ? "bg-burnt/10 text-burnt" : "text-ink hover:bg-mist"
          )}
        >
          <Icon d={item.path} />
          {item.label}
        </button>
      ))}
    </nav>
  );

  const filtered = appointments.filter((a) => (filter === "all" || a.status === filter) && a.customer.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col gap-5 border-r border-line bg-white p-5 lg:flex">
        <div>
          <p className="font-display text-[40px] leading-[1.2] text-burnt">Fides.</p>
          <p className="text-xs font-semibold tracking-[1.3px]">BUSINESS DASHBOARD</p>
        </div>
        {nav}
        <div className="mt-auto flex flex-col gap-3">
          <div className="rounded-xl bg-burnt/10 p-3 text-xs">
            <p className="font-semibold text-burnt">{plan.name} plan</p>
            <p className="text-muted">{peso(plan.price)} / month</p>
          </div>
          <form action={logout}>
            <button type="submit" className={cn(btnOutline, "w-full")}>
              Log out
            </button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-2 lg:hidden">
        <p className="font-display text-3xl text-burnt">Fides.</p>
        <button type="button" aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu(true)} className="flex size-11 flex-col items-center justify-center gap-1.5 rounded-lg text-burnt">
          <span className="h-0.5 w-6 rounded bg-current" />
          <span className="h-0.5 w-6 rounded bg-current" />
          <span className="h-0.5 w-6 rounded bg-current" />
        </button>
      </header>
      {menu ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-white p-4 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-display text-3xl text-burnt">Fides.</p>
            <button type="button" aria-label="Close menu" onClick={() => setMenu(false)} className="flex size-11 items-center justify-center rounded-lg text-2xl text-burnt">
              ×
            </button>
          </div>
          {nav}
          <form action={logout} className="mt-auto">
            <button type="submit" className={cn(btnOutline, "w-full")}>
              Log out
            </button>
          </form>
        </div>
      ) : null}

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sky text-lg font-semibold">
                {business.logoUrl ? <Image src={business.logoUrl} alt="" width={56} height={56} className="size-full object-cover" unoptimized /> : initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs tracking-[1.2px] text-muted">WELCOME BACK, {owner.split(" ")[0].toUpperCase()}</p>
                <h1 className="truncate font-display text-[28px] leading-[1.2] sm:text-[34px]">{profile.name}</h1>
                <p className="text-sm text-muted">{business.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-warn-bg px-2.5 py-1 text-xs font-semibold text-warn-fg">Preview · changes are not saved</span>
              <button type="button" className={btnPrimary} onClick={() => setSection("appointments")}>
                + New appointment
              </button>
            </div>
          </div>

          {section === "overview" && (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Today's appointments", value: String(appointments.length), note: `${appointments.filter((a) => a.status === "pending").length} awaiting confirmation`, featured: true },
                  { label: "Revenue today", value: peso(revenueToday), note: "Based on scheduled services" },
                  { label: "Active services", value: String(services.filter((s) => s.active).length), note: `${services.length} in catalog` },
                  { label: "Staff available", value: `${staff.filter((s) => s.available).length}/${staff.length}`, note: "On duty today" },
                ].map((metric) => (
                  <div key={metric.label} className={cn("flex min-h-[150px] flex-col gap-2 rounded-[10px] p-6 shadow-[0_3px_7px_rgb(44_58_75/0.06)]", metric.featured ? "bg-burnt text-white" : "bg-white")}>
                    <p className="text-sm font-semibold">{metric.label}</p>
                    <p className="text-[32px] font-semibold leading-9">{metric.value}</p>
                    <p className={cn("mt-auto text-[13px]", metric.featured ? "text-white" : "text-muted")}>{metric.note}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <Card title="Revenue this week">
                  <div className="flex h-[220px] items-end gap-3 sm:gap-5" role="img" aria-label="Weekly revenue bar chart">
                    {weeklyRevenue.map((d) => (
                      <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                        <span className="hidden text-[11px] text-subtle sm:block">{peso(d.value)}</span>
                        <div className="w-full max-w-[44px] rounded-t-md bg-burnt" style={{ height: `${(d.value / peak) * 150}px` }} />
                        <span className="text-[11px] text-subtle">{d.day}</span>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card title="Your booking page" className="flex flex-col gap-3">
                  <p className="text-sm text-muted">Share this link so customers can discover and book your services.</p>
                  <div className="flex items-center gap-2 rounded-lg bg-mist px-3 py-2.5 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">{profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.fides.app</span>
                    <button type="button" className="text-xs font-semibold text-burnt" onClick={() => flash("Booking link copied (preview)")}>
                      Copy
                    </button>
                  </div>
                  <button type="button" className={btnOutline} onClick={() => flash("Preview opened (not available yet)")}>
                    Preview page
                  </button>
                  <p className="mt-auto text-xs text-subtle">Account reference {reference}</p>
                </Card>
              </div>

              <Card title="Today's schedule" action={<button type="button" onClick={() => go("appointments")} className="text-sm font-semibold text-burnt hover:underline">View all →</button>}>
                <ul className="flex flex-col divide-y divide-hairline">
                  {appointments.slice(0, 4).map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                      <span className="w-14 text-sm font-semibold">{a.time}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{a.customer}</span>
                        <span className="block truncate text-xs text-muted">{a.service} · {a.staff}</span>
                      </span>
                      <span className={cn("rounded-md px-2 py-1 text-xs font-semibold capitalize", statusTone[a.status])}>{a.status}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          )}

          {section === "appointments" && (
            <>
              <Card title="Book an appointment">
                <form
                  className="grid gap-3 sm:grid-cols-[1fr_1fr_140px_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!newAppt.customer.trim() || !newAppt.time) return flash("Enter a customer name and time");
                    const service = services.find((s) => s.name === newAppt.service);
                    setAppointments((list) => [...list, { id: Date.now(), time: newAppt.time, customer: newAppt.customer.trim(), service: newAppt.service, staff: staff[0]?.name.split(" ")[0] ?? "—", status: "pending" as const, price: service?.price ?? 0 }].sort((a, b) => a.time.localeCompare(b.time)));
                    setNewAppt({ ...newAppt, customer: "", time: "" });
                    flash("Appointment added (preview only)");
                  }}
                >
                  <input className={inputCls} placeholder="Customer name" aria-label="Customer name" value={newAppt.customer} onChange={(e) => setNewAppt({ ...newAppt, customer: e.target.value })} />
                  <select className={inputCls} aria-label="Service" value={newAppt.service} onChange={(e) => setNewAppt({ ...newAppt, service: e.target.value })}>
                    {services.filter((s) => s.active).map((s) => <option key={s.id}>{s.name}</option>)}
                  </select>
                  <input type="time" className={inputCls} aria-label="Time" value={newAppt.time} onChange={(e) => setNewAppt({ ...newAppt, time: e.target.value })} />
                  <button type="submit" className={btnPrimary}>Add</button>
                </form>
              </Card>
              <Card
                title="Appointments"
                action={
                  <input type="search" placeholder="Search customer" aria-label="Search appointments" value={query} onChange={(e) => setQuery(e.target.value)} className={cn(inputCls, "h-10 w-44 sm:w-60")} />
                }
              >
                <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Status filter">
                  {(["all", "confirmed", "pending", "completed", "cancelled"] as const).map((item) => (
                    <button key={item} type="button" role="tab" aria-selected={filter === item} onClick={() => setFilter(item)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold capitalize", filter === item ? "bg-burnt text-white" : "bg-mist text-muted hover:text-ink")}>
                      {item}
                    </button>
                  ))}
                </div>
                {filtered.length === 0 ? <p className="py-6 text-sm text-muted">No appointments match.</p> : (
                  <ul className="flex flex-col divide-y divide-hairline">
                    {filtered.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                        <span className="w-14 text-sm font-semibold">{a.time}</span>
                        <span className="min-w-[160px] flex-1">
                          <span className="block text-sm font-semibold">{a.customer}</span>
                          <span className="block text-xs text-muted">{a.service} · {a.staff} · {peso(a.price)}</span>
                        </span>
                        <span className={cn("rounded-md px-2 py-1 text-xs font-semibold capitalize", statusTone[a.status])}>{a.status}</span>
                        <span className="flex gap-2">
                          {a.status === "pending" ? <button type="button" className="text-xs font-semibold text-burnt hover:underline" onClick={() => setAppointments((l) => l.map((x) => x.id === a.id ? { ...x, status: "confirmed" } : x))}>Confirm</button> : null}
                          {a.status === "confirmed" ? <button type="button" className="text-xs font-semibold text-success hover:underline" onClick={() => setAppointments((l) => l.map((x) => x.id === a.id ? { ...x, status: "completed" } : x))}>Complete</button> : null}
                          {a.status !== "cancelled" && a.status !== "completed" ? <button type="button" className="text-xs font-semibold text-danger hover:underline" onClick={() => setAppointments((l) => l.map((x) => x.id === a.id ? { ...x, status: "cancelled" } : x))}>Cancel</button> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}

          {section === "services" && (
            <>
              <Card title="Add a service">
                <form
                  className="grid gap-3 sm:grid-cols-[1.4fr_120px_140px_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const minutes = Number(newService.minutes);
                    const price = Number(newService.price);
                    if (!newService.name.trim() || !(minutes > 0) || !(price > 0)) return flash("Enter a name, duration and price");
                    setServices((l) => [...l, { id: Date.now(), name: newService.name.trim(), minutes, price, active: true }]);
                    setNewService({ name: "", minutes: "", price: "" });
                    flash("Service added (preview only)");
                  }}
                >
                  <input className={inputCls} placeholder="Service name" aria-label="Service name" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} />
                  <input className={inputCls} inputMode="numeric" placeholder="Minutes" aria-label="Duration in minutes" value={newService.minutes} onChange={(e) => setNewService({ ...newService, minutes: e.target.value.replace(/\D/g, "") })} />
                  <input className={inputCls} inputMode="numeric" placeholder="Price (₱)" aria-label="Price" value={newService.price} onChange={(e) => setNewService({ ...newService, price: e.target.value.replace(/\D/g, "") })} />
                  <button type="submit" className={btnPrimary}>Add</button>
                </form>
              </Card>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {services.map((s) => (
                  <Card key={s.id} className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold">{s.name}</h3>
                      <Toggle on={s.active} label={`${s.name} active`} onChange={(value) => setServices((l) => l.map((x) => x.id === s.id ? { ...x, active: value } : x))} />
                    </div>
                    <p className="text-[28px] font-semibold leading-8">{peso(s.price)}</p>
                    <p className="text-sm text-muted">{s.minutes} minutes</p>
                    <button type="button" className="mt-auto self-start text-sm font-semibold text-danger hover:underline" onClick={() => setServices((l) => l.filter((x) => x.id !== s.id))}>Remove</button>
                  </Card>
                ))}
              </div>
            </>
          )}

          {section === "staff" && (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {staff.map((m) => (
                <Card key={m.id} className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-12 items-center justify-center rounded-full bg-sky text-sm font-semibold">{m.name.split(" ").map((p) => p[0]).join("")}</span>
                    <div>
                      <p className="text-sm font-semibold">{m.name}</p>
                      <p className="text-xs text-muted">{m.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-mist px-3 py-2.5 text-sm">
                    <span>{m.available ? "Available today" : "Day off"}</span>
                    <Toggle on={m.available} label={`${m.name} available`} onChange={(value) => setStaff((l) => l.map((x) => x.id === m.id ? { ...x, available: value } : x))} />
                  </div>
                  <button type="button" className={btnOutline} onClick={() => flash("Schedule editor coming soon")}>Edit schedule</button>
                </Card>
              ))}
            </div>
          )}

          {section === "customers" && (
            <Card title="Customers" action={<span className="text-xs text-muted">{seedCustomers.length} total</span>}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-xs text-subtle">
                    <tr><th className="py-2 font-normal">Name</th><th className="py-2 font-normal">Email</th><th className="py-2 font-normal">Visits</th><th className="py-2 font-normal">Last visit</th></tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {seedCustomers.map((c) => (
                      <tr key={c.id}><td className="py-3 font-semibold">{c.name}</td><td className="py-3 text-muted">{c.email}</td><td className="py-3">{c.visits}</td><td className="py-3 text-muted">{c.lastVisit}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {section === "reports" && (
            <>
              <div className="grid gap-5 sm:grid-cols-3">
                {[{ l: "Weekly revenue", v: peso(weeklyRevenue.reduce((s, d) => s + d.value, 0)) }, { l: "Best day", v: "Saturday" }, { l: "Avg. ticket", v: peso(Math.round(revenueToday / Math.max(1, appointments.length))) }].map((m) => (
                  <Card key={m.l}><p className="text-sm text-muted">{m.l}</p><p className="mt-1 text-[28px] font-semibold leading-9">{m.v}</p></Card>
                ))}
              </div>
              <Card title="BIR-ready reports">
                <p className="mb-4 text-sm text-muted">Generate organized records to support your tax preparation.</p>
                <div className="flex flex-wrap gap-3">
                  {["Sales summary", "Quarterly report", "Annual report"].map((r) => (
                    <button key={r} type="button" className={btnOutline} onClick={() => flash(`${r} export is not available in preview`)}>{r}</button>
                  ))}
                </div>
              </Card>
            </>
          )}

          {section === "settings" && (
            <div className="grid gap-5 xl:grid-cols-2">
              <Card title="Business profile">
                <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); flash("Settings updated in preview only"); }}>
                  <label className="flex flex-col gap-1.5 text-sm font-semibold">Business name<input className={inputCls} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label>
                  <label className="flex flex-col gap-1.5 text-sm font-semibold">Phone<input className={inputCls} value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></label>
                  <label className="flex flex-col gap-1.5 text-sm font-semibold">Address<input className={inputCls} value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></label>
                  <p className="text-xs text-subtle">Owner: {owner} · {email}{business.established ? ` · Est. ${business.established}` : ""}</p>
                  <button type="submit" className={cn(btnPrimary, "self-start")}>Save changes</button>
                </form>
              </Card>
              <div className="flex flex-col gap-5">
                <Card title="Brand color">
                  <div className="flex items-center gap-4">
                    <input type="color" aria-label="Brand color" value={brand} onChange={(e) => setBrand(e.target.value)} className="size-12 cursor-pointer rounded-lg border border-line bg-white p-1" />
                    <div className="flex-1 rounded-lg p-3 text-sm font-semibold text-white" style={{ backgroundColor: brand }}>Booking button preview</div>
                  </div>
                </Card>
                <Card title="Notifications">
                  <ul className="flex flex-col gap-3 text-sm">
                    {([["email", "Email alerts for new bookings"], ["sms", "SMS alerts"], ["reminders", "Automated customer reminders"]] as const).map(([key, label]) => (
                      <li key={key} className="flex items-center justify-between gap-4"><span>{label}</span><Toggle on={notify[key]} label={label} onChange={(value) => setNotify({ ...notify, [key]: value })} /></li>
                    ))}
                  </ul>
                </Card>
                <Card title="Subscription">
                  <p className="text-sm"><span className="font-semibold text-burnt">{plan.name}</span> · {peso(plan.price)} / month</p>
                  <button type="button" className={cn(btnOutline, "mt-3")} onClick={() => flash("Plan changes are not available in preview")}>Change plan</button>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>

      {toast ? (
        <div role="status" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
