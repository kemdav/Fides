import { DAY_MS, REVIEW_TARGET_DAYS } from "@/lib/billing";

export { REVIEW_TARGET_DAYS };

export type SubmissionStatus = "pending" | "approved" | "rejected" | "suspended";

export type SubmissionDocument = {
  key: string;
  label: string;
  meta: string;
};

export type Submission = {
  id: string;
  reference: string;
  initials: string;
  business: string;
  category: string;
  owner: string;
  location: string;
  email: string;
  phone: string;
  plan: string;
  submittedAt: string;
  reviewedAt: string | null;
  status: SubmissionStatus;
  documents: SubmissionDocument[];
  note?: string[];
};

export type SubmissionSort = "oldest" | "newest";

export function daysWaiting(submission: Submission, now: number): number {
  return Math.max(0, Math.floor((now - Date.parse(submission.submittedAt)) / DAY_MS));
}

export function formatWaiting(days: number): string {
  if (days === 0) return "Today";
  return days === 1 ? "1 day" : `${days} days`;
}

export const statusLabels: Record<SubmissionStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export function formatSubmittedOn(submission: Submission): string {
  return new Date(submission.submittedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isOverdue(submission: Submission, now: number): boolean {
  return submission.status === "pending" && daysWaiting(submission, now) > REVIEW_TARGET_DAYS;
}

export function sortSubmissions(items: Submission[], sort: SubmissionSort): Submission[] {
  const direction = sort === "oldest" ? 1 : -1;
  return [...items].sort(
    (a, b) => direction * (Date.parse(a.submittedAt) - Date.parse(b.submittedAt) || a.reference.localeCompare(b.reference))
  );
}

export function matchesQuery(submission: Submission, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    submission.business.toLowerCase().includes(needle) ||
    submission.reference.toLowerCase().includes(needle) ||
    submission.owner.toLowerCase().includes(needle) ||
    submission.email.toLowerCase().includes(needle)
  );
}

export function isReviewedToday(submission: Submission, now: number): boolean {
  if (!submission.reviewedAt) return false;
  return new Date(submission.reviewedAt).toDateString() === new Date(now).toDateString();
}

export const reviewChecks = [
  "Business details are complete and consistent",
  "Owner identity details match the registration",
  "Contact email and phone number look valid",
] as const;

export const REASON_MIN = 10;
export const REASON_MAX = 500;
