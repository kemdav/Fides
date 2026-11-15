import { DAY_MS } from "@/lib/billing";

export type ActivityCategory = "verification" | "account" | "pricing";

export type ActivityEvent = {
  id: string;
  title: string;
  business: string;
  actor: string;
  action: string;
  category: ActivityCategory;
  createdAt: string;
  before: string;
  after: string;
  reason: string;
};

export const categoryOptions = [
  { value: "all", label: "All actions" },
  { value: "verification", label: "Verification" },
  { value: "account", label: "Account access" },
  { value: "pricing", label: "Pricing" },
] as const;

export const dateOptions = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Last 7 days" },
] as const;

export type CategoryFilter = (typeof categoryOptions)[number]["value"];
export type DateFilter = (typeof dateOptions)[number]["value"];

function startOfDay(value: number): number {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function daysAgo(event: ActivityEvent, now: number): number {
  return Math.round((startOfDay(now) - startOfDay(Date.parse(event.createdAt))) / DAY_MS);
}

export function formatEventTime(event: ActivityEvent, now: number): string {
  const ago = daysAgo(event, now);
  const day = ago === 0 ? "Today" : ago === 1 ? "Yesterday" : `${ago} days ago`;
  const time = new Date(event.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day}, ${time}`;
}

export function filterEvents(
  events: ActivityEvent[],
  { query, category, date }: { query: string; category: CategoryFilter; date: DateFilter },
  now: number
): ActivityEvent[] {
  const needle = query.trim().toLowerCase();
  return events.filter((event) => {
    if (category !== "all" && event.category !== category) return false;
    const ago = daysAgo(event, now);
    if (date === "today" && ago !== 0) return false;
    if (date === "yesterday" && ago !== 1) return false;
    if (date === "week" && ago > 7) return false;
    if (!needle) return true;
    return [event.title, event.business, event.action, event.actor].some((value) => value.toLowerCase().includes(needle));
  });
}

export function eventsToCsv(events: ActivityEvent[], now: number): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = ["Event", "Business", "Actor", "Action", "When", "Before", "After", "Reason"];
  const rows = events.map((event) =>
    [event.title, event.business, event.actor, event.action, formatEventTime(event, now), event.before, event.after, event.reason]
      .map(escape)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}
