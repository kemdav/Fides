export type ActivityCategory = "verification" | "account" | "pricing";

export type ActivityEvent = {
  id: string;
  title: string;
  business: string;
  actor: string;
  action: string;
  category: ActivityCategory;
  daysAgo: number;
  time: string;
  before: string;
  after: string;
  reason: string;
};

export const activityEvents: ActivityEvent[] = [
  {
    id: "olive-oak-approved",
    title: "Olive & Oak Spa approved",
    business: "Olive & Oak Spa",
    actor: "Alex Laurent",
    action: "Verification completed",
    category: "verification",
    daysAgo: 0,
    time: "09:42",
    before: "Pending",
    after: "Approved",
    reason: "Business registration and owner identity validated.",
  },
  {
    id: "form-movement-changes",
    title: "Form Movement needs updated documents",
    business: "Form Movement",
    actor: "Alex Laurent",
    action: "Changes requested",
    category: "verification",
    daysAgo: 1,
    time: "15:18",
    before: "Pending",
    after: "Changes requested",
    reason: "Business permit was unreadable and the owner identification did not match the registration.",
  },
  {
    id: "aura-suspended",
    title: "Aura Skin Clinic suspended",
    business: "Aura Skin Clinic",
    actor: "Alex Laurent",
    action: "Billing review",
    category: "account",
    daysAgo: 1,
    time: "11:06",
    before: "Active",
    after: "Suspended",
    reason: "Payment failed after repeated billing attempts.",
  },
];

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

export function formatEventTime(event: ActivityEvent): string {
  const day = event.daysAgo === 0 ? "Today" : event.daysAgo === 1 ? "Yesterday" : `${event.daysAgo} days ago`;
  return `${day}, ${event.time}`;
}

export function filterEvents(
  events: ActivityEvent[],
  { query, category, date }: { query: string; category: CategoryFilter; date: DateFilter }
): ActivityEvent[] {
  const needle = query.trim().toLowerCase();
  return events.filter((event) => {
    if (category !== "all" && event.category !== category) return false;
    if (date === "today" && event.daysAgo !== 0) return false;
    if (date === "yesterday" && event.daysAgo !== 1) return false;
    if (date === "week" && event.daysAgo > 7) return false;
    if (!needle) return true;
    return [event.title, event.business, event.action, event.actor].some((value) =>
      value.toLowerCase().includes(needle)
    );
  });
}

export function eventsToCsv(events: ActivityEvent[]): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = ["Event", "Business", "Actor", "Action", "When", "Before", "After", "Reason"];
  const rows = events.map((event) =>
    [event.title, event.business, event.actor, event.action, formatEventTime(event), event.before, event.after, event.reason]
      .map(escape)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}
