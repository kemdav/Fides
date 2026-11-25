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
import { getStorefrontNav } from "@/components/storefront/storefront-data";
import { useTenant } from "@/providers/tenant-provider";

export type BookingServiceOption = {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  duration: string;
  price: string;
};

export type BookingStaffOption = {
  id: string;
  fullName: string;
  title: string | null;
};

const BOOKING_STEPS = ["Service", "Staff", "Date & time", "Review"];
const TIME_OPTIONS = ["9:00 AM", "10:30 AM", "1:00 PM", "2:30 PM", "4:00 PM"];

function getDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateOptions() {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12)
  );

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + index + 1);
    return {
      value: getDateKey(date),
      weekday: new Intl.DateTimeFormat("en", {
        weekday: "short",
        timeZone: "UTC",
      }).format(date),
      label: new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(date),
    };
  });
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
  const [selectedServiceId] = useState(() =>
    services.some((service) => service.id === initialServiceId)
      ? initialServiceId
      : ""
  );
  const [selectedStaffId, setSelectedStaffId] = useState("any");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const dates = useMemo(() => getDateOptions(), []);

  const selectedService = services.find(
    (service) => service.id === selectedServiceId
  );
  const selectedStaff =
    selectedStaffId === "any"
      ? null
      : staff.find((member) => member.id === selectedStaffId) ?? null;

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
    setStep((current) => Math.min(current + 1, BOOKING_STEPS.length - 1));
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
              const isComplete = index < step;
              const isCurrent = index === step;
              return (
                <li key={label}>
                  <button
                    type="button"
                    aria-current={isCurrent ? "step" : undefined}
                    disabled={index >= step}
                    onClick={() => {
                      setError(null);
                      setStep(index);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-3 text-left text-sm font-semibold transition-colors ${
                      isCurrent
                        ? "border-burnt bg-white text-burnt"
                        : isComplete
                          ? "border-success/30 bg-white text-ink"
                          : "border-outline/50 bg-white/60 text-muted"
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
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    aria-pressed={selectedStaffId === "any"}
                    onClick={() => setSelectedStaffId("any")}
                    className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
                      selectedStaffId === "any"
                        ? "border-burnt bg-burnt/5"
                        : "border-line hover:border-burnt/50"
                    }`}
                  >
                    <span className="block font-semibold text-ink">
                      Any available staff member
                    </span>
                    <span className="mt-1 block text-sm text-muted">
                      Let the team match you with someone.
                    </span>
                  </button>
                  {staff.map((member) => {
                    const isSelected = selectedStaffId === member.id;
                    return (
                      <button
                        key={member.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedStaffId(member.id)}
                        className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
                          isSelected
                            ? "border-burnt bg-burnt/5"
                            : "border-line hover:border-burnt/50"
                        }`}
                      >
                        <span className="block font-semibold text-ink">
                          {member.fullName}
                        </span>
                        {member.title ? (
                          <span className="mt-1 block text-sm text-muted">
                            {member.title}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                {staff.length === 0 ? (
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
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {dates.map((date) => {
                    const isSelected = selectedDate === date.value;
                    return (
                      <button
                        key={date.value}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          setSelectedDate(date.value);
                          setSelectedTime("");
                          setError(null);
                        }}
                        className={`rounded-lg border px-3 py-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
                          isSelected
                            ? "border-burnt bg-burnt text-white"
                            : "border-line bg-white text-ink hover:border-burnt/50"
                        }`}
                      >
                        <span className="block text-xs">{date.weekday}</span>
                        <span className="mt-1 block text-sm font-semibold">
                          {date.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

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
                        disabled={!selectedDate}
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
                  <div className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between">
                    <dt className="text-sm text-muted">Service</dt>
                    <dd className="text-sm font-semibold text-ink">
                      {selectedService?.name ?? "Choose a service"}
                      {selectedService ? (
                        <span className="ml-2 font-normal text-muted">
                          {selectedService.duration} · {selectedService.price}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between">
                    <dt className="text-sm text-muted">Staff</dt>
                    <dd className="text-sm font-semibold text-ink">
                      {selectedStaff?.fullName ?? "Any available staff member"}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between">
                    <dt className="text-sm text-muted">Preferred date</dt>
                    <dd className="text-sm font-semibold text-ink">
                      {formatSelectedDate(selectedDate)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between">
                    <dt className="text-sm text-muted">Preferred time</dt>
                    <dd className="text-sm font-semibold text-ink">
                      {selectedTime || "Not selected"}
                    </dd>
                  </div>
                </dl>
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
                  Confirm booking
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