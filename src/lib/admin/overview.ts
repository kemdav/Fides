import type { DistributionSlice } from "@/components/admin/overview/user-distribution";
import type { WeekEntry } from "@/components/admin/overview/activity-chart";
import type { Tenant } from "./tenants";
import type { Submission } from "./verification";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayKey(value: number): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function buildWeek(submissions: Submission[], now: number): WeekEntry[] {
  const days = Array.from({ length: 7 }, (_, index) => now - (6 - index) * 24 * 60 * 60 * 1000);
  return days.map((day) => {
    const key = dayKey(day);
    return {
      day: DAY_LABELS[new Date(day).getDay()],
      submitted: submissions.filter((item) => dayKey(Date.parse(item.submittedAt)) === key).length,
      reviewed: submissions.filter((item) => item.reviewedAt && dayKey(Date.parse(item.reviewedAt)) === key).length,
    };
  });
}

export function buildDistribution(tenants: Tenant[]): DistributionSlice[] {
  const counts = new Map<string, number>();
  for (const tenant of tenants) counts.set(tenant.plan, (counts.get(tenant.plan) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 3).map(([name, count]) => ({ name, count }));
  if (sorted.length > 3) {
    top[2] = { name: "Other plans", count: sorted.slice(2).reduce((sum, [, count]) => sum + count, 0) };
  }
  return top;
}
