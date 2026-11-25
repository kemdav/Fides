export function normalizeTimeZone(raw?: string | null): string {
  const candidate = raw?.split(/\s*\(/)[0]?.trim() || "Asia/Manila";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch {
    return "Asia/Manila";
  }
}

export function formatPhp(cents: number, forceDecimals = false): string {
  const amount = cents / 100;
  const hasCents = cents % 100 !== 0;
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: forceDecimals || hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPhpInputValue(cents: number): string {
  return (cents / 100).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatLongDate(iso: string | null, timeZone = "Asia/Manila"): string {
  if (!iso) return "—";
  const tz = normalizeTimeZone(timeZone);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: tz,
  }).format(new Date(iso));
}

export function formatShortDate(iso: string | null, timeZone = "Asia/Manila"): string {
  if (!iso) return "—";
  const tz = normalizeTimeZone(timeZone);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: tz,
  }).format(new Date(iso));
}

export function formatMonthDay(iso: string | null, timeZone = "Asia/Manila"): string {
  if (!iso) return "—";
  const tz = normalizeTimeZone(timeZone);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: tz,
  }).format(new Date(iso));
}

export function formatPeriodRange(
  startIso: string,
  endIso: string,
  timeZone = "Asia/Manila",
  shortMonth = false
): string {
  const tz = normalizeTimeZone(timeZone);
  const start = new Date(startIso);
  const end = new Date(endIso);
  const monthFmt = shortMonth ? "short" : "long";

  const startMonth = new Intl.DateTimeFormat("en-US", { month: monthFmt, timeZone: tz }).format(start);
  const endMonth = new Intl.DateTimeFormat("en-US", { month: monthFmt, timeZone: tz }).format(end);
  const startDay = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: tz }).format(start);
  const endDay = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: tz }).format(end);
  const endYear = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: tz }).format(end);

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}, ${endYear}`;
  }
  return `${startMonth} ${startDay}–${endMonth} ${endDay}, ${endYear}`;
}

export function formatPeriodNoYear(
  startIso: string,
  endIso: string,
  timeZone = "Asia/Manila"
): string {
  const tz = normalizeTimeZone(timeZone);
  const start = new Date(startIso);
  const end = new Date(endIso);
  const startMonth = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: tz }).format(start);
  const endMonth = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: tz }).format(end);
  const startDay = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: tz }).format(start);
  const endDay = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: tz }).format(end);

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}`;
  }
  return `${startMonth} ${startDay}–${endMonth} ${endDay}`;
}

export function getNextCycleBounds(
  currentPeriodEndIso: string,
  timeZone = "Asia/Manila"
): {
  nextStartIso: string;
  nextEndIso: string;
} {
  const tz = normalizeTimeZone(timeZone);
  const nextStart = new Date(new Date(currentPeriodEndIso).getTime() + 1000);
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: tz,
  }).formatToParts(nextStart);

  const year = Number(
    parts.find((p) => p.type === "year")?.value ?? nextStart.getUTCFullYear()
  );
  const month = Number(
    parts.find((p) => p.type === "month")?.value ?? nextStart.getUTCMonth() + 1
  );
  const day = Number(
    parts.find((p) => p.type === "day")?.value ?? nextStart.getUTCDate()
  );

  // Month index in Date.UTC is 0-based, so passing 1-based `month` with day 0 yields the last day of `month`.
  const safeEnd =
    day === 1
      ? new Date(Date.UTC(year, month, 0, 12, 0, 0))
      : new Date(Date.UTC(year, month, day - 1, 12, 0, 0));

  return {
    nextStartIso: nextStart.toISOString(),
    nextEndIso: safeEnd.toISOString(),
  };
}

export function formatLastSaved(iso: string | null, timeZone = "Asia/Manila"): string {
  if (!iso) return "Not saved yet";
  const tz = normalizeTimeZone(timeZone);
  const d = new Date(iso);
  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: tz,
  }).format(d);
  const timePart = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  }).format(d);
  return `${datePart} at ${timePart} (${tz})`;
}