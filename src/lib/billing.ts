import { TRIAL_DAYS } from "./registration/options";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const RENEWAL_WINDOW_DAYS = 7;
export const REVIEW_TARGET_DAYS = 3;

export function nextBillingDate(approvedAt: string | null, now: Date): Date | null {
  if (!approvedAt) return null;
  const start = new Date(approvedAt);
  const next = new Date(start.getTime() + TRIAL_DAYS * DAY_MS);
  while (next.getTime() < now.getTime() - DAY_MS) {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / DAY_MS);
}
