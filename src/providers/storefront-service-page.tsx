"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  CheckIcon,
} from "@/components/ui";
import {
  StorefrontFooter,
  StorefrontHeader,
} from "@/components/storefront";
import {
  BOOKING_ADDONS,
  getStorefrontNav,
} from "@/components/storefront/storefront-data";
import { Icon } from "@/components/admin/icon";
import { useTenant } from "@/providers/tenant-provider";

export type BookingServiceOption = {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  duration: string;
  price: string;
};

type BookingAddonOption = (typeof BOOKING_ADDONS)[number];

function parseNumber(value: string) {
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toBookedItem(service: BookingServiceOption) {
  return {
    durationMinutes: parseNumber(service.duration),
    priceCents: Math.round(parseNumber(service.price) * 100),
  };
}

export type BookingStaffOption = {
  id: string;
  fullName: string;
  title: string | null;
};

const BOOKING_STEPS = ["Service", "Staff", "Date & time", "Review"];
const TIME_OPTIONS = ["9:00 AM", "10:30 AM", "1:00 PM", "2:30 PM", "4:00 PM"];

function formatPrice(priceCents: number) {
  return `₱${Math.round(priceCents / 100).toLocaleString("en-PH")}`;
}

function formatDuration(minutes: number) {
  return `${minutes} min`;
}

function toggleId(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}

function SelectableOption({
  selected,
  onToggle,
  eyebrow,
  title,
  description,
  meta,
}: {
  selected: boolean;
  onToggle: () => void;
  eyebrow?: string;
  title: string;
  description?: string | null;
  meta: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
        selected
          ? "border-burnt bg-burnt/5"
          : "border-line bg-white hover:border-burnt/50"
      }`}
    >
      {selected ? (
        <CheckIcon tone="success" className="mt-0.5 size-5" />
      ) : (
        <span
          aria-hidden
          className="mt-0.5 size-5 shrink-0 rounded-full border border-outline bg-white"
        />
      )}
      <span className="min-w-0 flex-1">
        {eyebrow ? (
          <span className="block text-xs font-bold uppercase tracking-wide text-burnt">
            {eyebrow}
          </span>
        ) : null}
        <span className="block font-semibold text-ink">{title}</span>
        {description ? (
          <span className="mt-1 block text-sm/6 text-muted">{description}</span>
        ) : null}
        <span className="mt-2 block text-sm font-semibold text-ink">
          {meta}
        </span>
      </span>
    </button>
  );
}

// Roles that don't perform services (front desk, management, admin) are hidden
// from the staff picker.
const NON_SERVICE_ROLE_PATTERN =
  /\b(admin|administrat\w*|manage\w*|owner|front desk|reception\w*|coordinator|cashier|accountant|secretary|assistant manager)\b/i;

function isServiceProvider(member: BookingStaffOption) {
  return !member.title || !NON_SERVICE_ROLE_PATTERN.test(member.title);
}

function StaffRadioOption({
  value,
  label,
  description,
  checked,
  onSelect,
}: {
  value: string;
  label: string;
  description?: string;
  checked: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-burnt/40 ${
        checked
          ? "border-burnt bg-burnt/5"
          : "border-line bg-white hover:border-burnt/50"
      }`}
    >
      <input
        type="radio"
        name="staff-member"
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="mt-1 size-4 shrink-0 accent-burnt focus-visible:outline-none"
      />
      <span className="min-w-0">
        <span className="block font-semibold text-ink">{label}</span>
        {description ? (
          <span className="mt-1 block text-sm text-muted">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

function ReviewRow({
  label,
  onEdit,
  children,
}: {
  label: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-center justify-between gap-3 sm:block">
        <dt className="text-sm text-muted">{label}</dt>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          aria-label={`Edit ${label.toLowerCase()}`}
          className="-ml-3 h-7 px-3 font-semibold text-burnt hover:bg-burnt/10 sm:mt-1"
        >
          Edit
        </Button>
      </div>
      <dd className="text-sm font-semibold text-ink sm:text-right">
        {children}
      </dd>
    </div>
  );
}

const WEEKDAY_LABELS =["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Local-time YYYY-MM-DD key for a calendar day. */
function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isClosedHours(hours: string | null | undefined) {
  return !!hours && /closed/i.test(hours);
}

/** Minutes since midnight for a label like "2:30 PM". */
function parseTimeLabel(label: string) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label.trim());
  if (!match) return 0;
  const hours = (Number(match[1]) % 12) + (/pm/i.test(match[3]) ? 12 : 0);
  return hours * 60 + Number(match[2]);
}

function BookingCalendar({
  selectedDate,
  closedWeekdays,
  onSelect,
}: {
  selectedDate: string;
  closedWeekdays: Set<number>;
  onSelect: (value: string) => void;
}) {
  const [today] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [visibleMonth, setVisibleMonth] = useState(() => {
    if (selectedDate) {
      const [year, month] = selectedDate.split("-").map(Number);
      return new Date(year, month - 1, 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay();
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();
  const monthLabel = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  function shiftMonth(offset: number) {
    setVisibleMonth(new Date(year, month + offset, 1));
  }

  return (
    <div className="mt-3 rounded-xl border border-line p-4 sm:max-w-md">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={isCurrentMonth}
          onClick={() => shiftMonth(-1)}
          className="grid size-9 place-items-center rounded-lg border border-line text-ink transition-colors hover:border-burnt/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
        >
          <Icon name="chevron-down" weight="bold" className="size-4 rotate-90" />
        </button>
        <p aria-live="polite" className="text-sm font-semibold text-ink">
          {monthLabel}
        </p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => shiftMonth(1)}
          className="grid size-9 place-items-center rounded-lg border border-line text-ink transition-colors hover:border-burnt/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
        >
          <Icon name="chevron-down" weight="bold" className="size-4 -rotate-90" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="py-1 text-xs font-semibold text-muted">
            {label}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const date = new Date(year, month, index + 1);
          const value = getDateKey(date);
          const isPast = date < today;
          const isClosed = closedWeekdays.has(date.getDay());
          const isDisabled = isPast || isClosed;
          const isSelected = selectedDate === value;
          const isToday = date.getTime() === today.getTime();
          return (
            <button
              key={value}
              type="button"
              disabled={isDisabled}
              aria-pressed={isSelected}
              aria-label={`${formatSelectedDate(value)}${
                isClosed ? " (closed)" : ""
              }`}
              onClick={() => onSelect(value)}
              className={`aspect-square rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 disabled:cursor-not-allowed ${
                isSelected
                  ? "bg-burnt text-white"
                  : isDisabled
                    ? "text-muted/40 line-through decoration-muted/30"
                    : `text-ink hover:bg-burnt/10 ${
                        isToday ? "ring-1 ring-burnt/50" : ""
                      }`
              }`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      {closedWeekdays.size > 0 ? (
        <p className="mt-3 text-xs text-muted">
          Unavailable dates are past days or days the business is closed.
        </p>
      ) : null}
    </div>
  );
}

function formatSelectedDate(value: string) {
  if (!value) return "Not selected";
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function StorefrontShell({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const tenant = useTenant();
  const navLinks = getStorefrontNav(slug);

  return (
    <div className="flex min-h-dvh flex-col bg-powder text-ink">
      <StorefrontHeader
        businessName={tenant.businessName}
        navLinks={navLinks}
        homeHref={`/${slug}`}
        contactHref={`/${slug}/contact`}
        bookHref={`/${slug}/book`}
      />
      {children}
      <StorefrontFooter
        businessName={tenant.businessName}
        navLinks={navLinks}
        contactHref={`/${slug}/contact`}
        bookHref={`/${slug}/book`}
      />
    </div>
  );
}

export function StorefrontServicePage({
  slug,
  services,
  staff,
  initialServiceId,
}: {
  slug: string;
  services: BookingServiceOption[];
  staff: BookingStaffOption[];
  initialServiceId: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  // Furthest step reached, so users can jump back and forth between
  // steps they've already completed.
  const [furthestStep, setFurthestStep] = useState(0);
  const [selectedServiceId] = useState(() =>
    services.some((service) => service.id === initialServiceId)
      ? initialServiceId
      : ""
  );
  const [extraServiceIds, setExtraServiceIds] = useState<string[]>([]);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("any");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const tenant = useTenant();
  const closedWeekdays = useMemo(() => {
    const closed = new Set<number>();
    if (isClosedHours(tenant.hours_sun)) closed.add(0);
    if (isClosedHours(tenant.hours_mon_fri)) [1, 2, 3, 4, 5].forEach((day) => closed.add(day));
    if (isClosedHours(tenant.hours_sat)) closed.add(6);
    return closed;
  }, [tenant.hours_sun, tenant.hours_mon_fri, tenant.hours_sat]);
  const now = new Date();
  const isTodaySelected = selectedDate === getDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const selectedService = services.find(
    (service) => service.id === selectedServiceId
  );
  const otherServices = services.filter(
    (service) => service.id !== selectedServiceId
  );
  const extraServices = otherServices.filter((service) =>
    extraServiceIds.includes(service.id)
  );
  const bookedServiceIds = selectedService
    ? [selectedService.id, ...extraServices.map((service) => service.id)]
    : [];
  // Add-ons are offered for any booked service; an add-on with no links
  // applies to every service.
  const availableAddons: BookingAddonOption[] = BOOKING_ADDONS.filter(
    (addon) =>
      addon.linkedServiceIds.length === 0 ||
      addon.linkedServiceIds.some((id) => bookedServiceIds.includes(id))
  );
  const selectedAddons = availableAddons.filter((addon) =>
    addonIds.includes(addon.id)
  );
  const bookedItems = [
    ...(selectedService ? [toBookedItem(selectedService)] : []),
    ...extraServices.map(toBookedItem),
    ...selectedAddons,
  ];
  const totalMinutes = bookedItems.reduce(
    (sum, item) => sum + item.durationMinutes,
    0
  );
  const totalCents = bookedItems.reduce(
    (sum, item) => sum + item.priceCents,
    0
  );
  const hasExtras = extraServices.length > 0 || selectedAddons.length > 0;
  const serviceStaff = staff.filter((member) => isServiceProvider(member));
  const selectedStaff =
    selectedStaffId === "any"
      ? null
      : serviceStaff.find((member) => member.id === selectedStaffId) ?? null;

  function continueToNextStep() {
    setError(null);
    if (step === 0 && !selectedService) {
      setError("Choose a service to continue.");
      return;
    }
    if (step === 2 && (!selectedDate || !selectedTime)) {
      setError("Choose a date and time to continue.");
      return;
    }
    const next = Math.min(step + 1, BOOKING_STEPS.length - 1);
    setStep(next);
    setFurthestStep((current) => Math.max(current, next));
  }

  function goToStep(index: number) {
    setError(null);
    setStep(index);
  }

  function continueToAccount() {
    if (!selectedService || !selectedDate || !selectedTime) return;
    router.push("/login");
  }

  return (
    <StorefrontShell slug={slug}>
      <main className="flex-1 bg-powder">
        <div className="mx-auto w-full max-w-[1080px] px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
          <Link
            href={`/${slug}/services`}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-burnt hover:underline"
          >
            <span aria-hidden>←</span> All services
          </Link>

          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-burnt">
              Online booking
            </p>
            <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
              Book an appointment
            </h1>
            <p className="mt-2 max-w-2xl text-sm/6 text-muted">
              Choose a service, a team member, and a preferred time. You can
              review everything before continuing to your account.
            </p>
          </div>

          <ol
            aria-label="Booking steps"
            className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {BOOKING_STEPS.map((label, index) => {
              const isCurrent = index === step;
              const isComplete = !isCurrent && index < furthestStep;
              const isReachable =
                !isCurrent &&
                index <= furthestStep &&
                (index < 3 || (!!selectedDate && !!selectedTime));
              return (
                <li key={label}>
                  <button
                    type="button"
                    aria-current={isCurrent ? "step" : undefined}
                    disabled={!isReachable}
                    onClick={() => goToStep(index)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
                      isCurrent
                        ? "border-burnt bg-white text-burnt"
                        : isComplete
                          ? "border-success/30 bg-white text-ink"
                          : isReachable
                            ? "border-outline/50 bg-white text-ink"
                            : "border-outline/50 bg-white/60 text-muted"
                    } ${
                      isReachable
                        ? "cursor-pointer hover:border-burnt/50 hover:bg-burnt/5"
                        : ""
                    }`}
                  >
                    {isComplete ? (
                      <CheckIcon tone="success" className="size-5" />
                    ) : (
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-full text-xs ${
                          isCurrent
                            ? "bg-burnt text-white"
                            : "bg-mist text-muted"
                        }`}
                      >
                        {index + 1}
                      </span>
                    )}
                    {label}
                  </button>
                </li>
              );
            })}
          </ol>

          <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-8">
            {step === 0 ? (
              <div>
                <h2 className="text-xl font-semibold text-ink">
                  Your selected service
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {selectedService
                    ? "Review the service details before choosing your staff member."
                    : "Choose a service from the storefront to begin your booking."}
                </p>
                {selectedService ? (
                  <div className="mt-6 rounded-xl border border-burnt/40 bg-burnt/5 p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-burnt">
                          {selectedService.category}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-ink">
                          {selectedService.name}
                        </h3>
                        {selectedService.description ? (
                          <p className="mt-2 max-w-2xl text-sm/6 text-muted">
                            {selectedService.description}
                          </p>
                        ) : null}
                      </div>
                      <CheckIcon tone="success" className="size-6" />
                    </div>
                    <dl className="mt-5 grid gap-4 border-t border-burnt/15 pt-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Duration
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-ink">
                          {selectedService.duration}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Price
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-ink">
                          {selectedService.price}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <p className="mt-6 rounded-lg bg-wash p-4 text-sm text-muted">
                    {services.length === 0
                      ? "There are no services available to book right now."
                      : "No service is selected. Return to the services page to choose one."}
                  </p>
                )}
                <Link
                  href={`/${slug}/services`}
                  className="mt-4 inline-flex text-sm font-semibold text-burnt hover:underline"
                >
                  {selectedService ? "Change service" : "Browse services"}
                </Link>

                {selectedService && availableAddons.length > 0 ? (
                  <div className="mt-8">
                    <h3 className="text-base font-semibold text-ink">
                      Add-ons{" "}
                      <span className="text-sm font-normal text-muted">
                        (optional)
                      </span>
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      Enhance your appointment with extras.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {availableAddons.map((addon) => (
                        <SelectableOption
                          key={addon.id}
                          selected={addonIds.includes(addon.id)}
                          onToggle={() =>
                            setAddonIds((ids) => toggleId(ids, addon.id))
                          }
                          title={addon.name}
                          description={addon.description}
                          meta={`+${formatDuration(addon.durationMinutes)} · +${formatPrice(addon.priceCents)}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedService && otherServices.length > 0 ? (
                  <div className="mt-8">
                    <h3 className="text-base font-semibold text-ink">
                      Additional services{" "}
                      <span className="text-sm font-normal text-muted">
                        (optional)
                      </span>
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      Book more than one service in the same visit.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {otherServices.map((service) => (
                        <SelectableOption
                          key={service.id}
                          selected={extraServiceIds.includes(service.id)}
                          onToggle={() =>
                            setExtraServiceIds((ids) =>
                              toggleId(ids, service.id)
                            )
                          }
                          eyebrow={service.category}
                          title={service.name}
                          description={service.description}
                          meta={`${service.duration} · ${service.price}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedService && hasExtras ? (
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-wash px-4 py-3 text-sm">
                    <span className="text-muted">
                      {bookedItems.length} items selected
                    </span>
                    <span className="font-semibold text-ink">
                      Estimated total: {formatDuration(totalMinutes)} ·{" "}
                      {formatPrice(totalCents)}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 1 ? (
              <div>
                <h2 className="text-xl font-semibold text-ink">
                  Choose your staff member
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Select someone specific or let the team choose who is
                  available.
                </p>
                <div
                  role="radiogroup"
                  aria-label="Staff member"
                  className="mt-6 grid gap-3 sm:grid-cols-2"
                >
                  <StaffRadioOption
                    value="any"
                    label="Any available staff member"
                    description="Let the team match you with someone."
                    checked={selectedStaffId === "any"}
                    onSelect={setSelectedStaffId}
                  />
                  {serviceStaff.map((member) => (
                    <StaffRadioOption
                      key={member.id}
                      value={member.id}
                      label={member.fullName}
                      checked={selectedStaffId === member.id}
                      onSelect={setSelectedStaffId}
                    />
                  ))}
                </div>
                {serviceStaff.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">
                    No individual staff profiles are listed. You can continue
                    with any available team member.
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <h2 className="text-xl font-semibold text-ink">
                  Choose a preferred date and time
                </h2>
                <p className="mt-1 text-sm text-muted">
                  These are preferences for the front-end booking preview;
                  availability is not confirmed.
                </p>
                <h3 className="mt-6 text-sm font-semibold text-ink">
                  Date
                </h3>
                <BookingCalendar
                  selectedDate={selectedDate}
                  closedWeekdays={closedWeekdays}
                  onSelect={(value) => {
                    setSelectedDate(value);
                    setSelectedTime("");
                    setError(null);
                  }}
                />

                <h3 className="mt-7 text-sm font-semibold text-ink">
                  Preferred time
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TIME_OPTIONS.map((time) => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        aria-pressed={isSelected}
                        disabled={
                          !selectedDate ||
                          (isTodaySelected && parseTimeLabel(time) <= nowMinutes)
                        }
                        onClick={() => {
                          setSelectedTime(time);
                          setError(null);
                        }}
                        className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
                          isSelected
                            ? "border-burnt bg-burnt text-white"
                            : "border-line bg-white text-ink hover:border-burnt/50"
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <h2 className="text-xl font-semibold text-ink">
                  Review your appointment
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Check your selections before continuing to account access.
                </p>
                <dl className="mt-6 divide-y divide-line rounded-xl border border-line px-4">
                  <ReviewRow label="Services" onEdit={() => goToStep(0)}>
                    {selectedService ? (
                      <ul className="space-y-1.5">
                        {[selectedService, ...extraServices].map((service) => (
                          <li
                            key={service.id}
                            className="flex flex-wrap justify-end gap-x-2"
                          >
                            <span>{service.name}</span>
                            <span className="font-normal text-muted">
                              {service.duration} · {service.price}
                            </span>
                          </li>
                        ))}
                        {selectedAddons.map((addon) => (
                          <li
                            key={addon.id}
                            className="flex flex-wrap justify-end gap-x-2"
                          >
                            <span>
                              <span className="font-normal text-muted">
                                Add-on:{" "}
                              </span>
                              {addon.name}
                            </span>
                            <span className="font-normal text-muted">
                              +{formatDuration(addon.durationMinutes)} · +
                              {formatPrice(addon.priceCents)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "Choose a service"
                    )}
                  </ReviewRow>
                  <ReviewRow label="Staff" onEdit={() => goToStep(1)}>
                    {selectedStaff?.fullName ?? "Any available staff member"}
                  </ReviewRow>
                  <ReviewRow label="Preferred date" onEdit={() => goToStep(2)}>
                    {formatSelectedDate(selectedDate)}
                  </ReviewRow>
                  <ReviewRow label="Preferred time" onEdit={() => goToStep(2)}>
                    {selectedTime || "Not selected"}
                  </ReviewRow>
                </dl>
                {selectedService ? (
                  <div className="mt-3 flex flex-col gap-1 rounded-xl bg-burnt/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-semibold text-ink">
                      Total
                    </span>
                    <span className="text-sm text-ink">
                      <span className="text-muted">
                        {formatDuration(totalMinutes)}
                      </span>
                      <span className="mx-2 text-muted" aria-hidden>
                        ·
                      </span>
                      <span className="text-base font-bold">
                        {formatPrice(totalCents)}
                      </span>
                    </span>
                  </div>
                ) : null}
                <p className="mt-4 rounded-lg bg-wash px-4 py-3 text-sm/6 text-muted">
                  This storefront preview does not submit or confirm
                  appointments. Continue to the customer account screen to
                  proceed.
                </p>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="mt-5 text-sm font-medium text-danger">
                {error}
              </p>
            ) : null}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-between">
              {step > 0 ? (
                <Button
                  variant="brand-outline"
                  size="md"
                  onClick={() => {
                    setError(null);
                    setStep((current) => Math.max(current - 1, 0));
                  }}
                >
                  Back
                </Button>
              ) : (
                <span />
              )}
              {step < 3 ? (
                <Button
                  variant="brand"
                  size="lg"
                  onClick={continueToNextStep}
                  disabled={step === 0 && services.length === 0}
                >
                  {step === 2 ? "Review appointment" : "Continue"}
                  <span aria-hidden>→</span>
                </Button>
              ) : (
                <Button
                  variant="brand"
                  size="lg"
                  onClick={continueToAccount}
                  disabled={!selectedService || !selectedDate || !selectedTime}
                >
                  Continue to account
                  <span aria-hidden>→</span>
                </Button>
              )}
            </div>
          </section>
        </div>
      </main>
    </StorefrontShell>
  );
}