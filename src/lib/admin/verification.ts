export type SubmissionStatus = "pending" | "approved" | "changes_requested" | "rejected";

export type SubmissionDocument = {
  key: "permit" | "identification";
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
  submittedOn: string;
  status: SubmissionStatus;
  documents: SubmissionDocument[];
  note?: string[];
};

export type SubmissionSort = "oldest" | "newest";

export const REVIEW_TARGET_DAYS = 3;

/** the prototype pretends today is oct 9 so waiting times stay stable */
export const SAMPLE_TODAY = new Date("2026-10-09T00:00:00");
export const DAY_MS = 24 * 60 * 60 * 1000;

const documents = (permit: string, identification: string): SubmissionDocument[] => [
  { key: "permit", label: "Business permit", meta: `PDF · ${permit} · View` },
  { key: "identification", label: "Owner identification", meta: `PDF · ${identification} · View` },
];

export const sampleSubmissions: Submission[] = [
  {
    id: "bella-vita-salon",
    reference: "FID-1048",
    initials: "BV",
    business: "Bella Vita Salon",
    category: "Beauty & wellness",
    owner: "Maria Santos",
    location: "Makati, Philippines",
    email: "maria@bellavita.example",
    submittedOn: "2026-10-05",
    status: "pending",
    documents: documents("2.4 MB", "1.2 MB"),
  },
  {
    id: "northside-dental",
    reference: "FID-1049",
    initials: "ND",
    business: "Northside Dental",
    category: "Healthcare",
    owner: "Dr. Paolo Reyes",
    location: "Quezon City, Philippines",
    email: "paolo@northsidedental.example",
    submittedOn: "2026-10-06",
    status: "pending",
    documents: documents("1.9 MB", "0.9 MB"),
  },
  {
    id: "studio-twelve",
    reference: "FID-1050",
    initials: "ST",
    business: "Studio Twelve",
    category: "Fitness",
    owner: "Andrea Cruz",
    location: "Taguig, Philippines",
    email: "andrea@studiotwelve.example",
    submittedOn: "2026-10-07",
    status: "pending",
    documents: documents("2.1 MB", "1.4 MB"),
  },
  {
    id: "calm-wellness",
    reference: "FID-1051",
    initials: "CW",
    business: "Calm Wellness",
    category: "Beauty & wellness",
    owner: "Joanna Lim",
    location: "Pasig, Philippines",
    email: "joanna@calmwellness.example",
    submittedOn: "2026-10-07",
    status: "pending",
    documents: documents("3.0 MB", "1.1 MB"),
  },
  {
    id: "bloom-beauty",
    reference: "FID-1052",
    initials: "BB",
    business: "Bloom Beauty",
    category: "Beauty & wellness",
    owner: "Camille Navarro",
    location: "Mandaluyong, Philippines",
    email: "camille@bloombeauty.example",
    submittedOn: "2026-10-08",
    status: "pending",
    documents: documents("1.7 MB", "1.3 MB"),
  },
  {
    id: "summit-fitness",
    reference: "FID-1053",
    initials: "SF",
    business: "Summit Fitness",
    category: "Fitness",
    owner: "Rafael Mendoza",
    location: "Cebu City, Philippines",
    email: "rafael@summitfitness.example",
    submittedOn: "2026-10-09",
    status: "pending",
    documents: documents("2.6 MB", "1.0 MB"),
  },
  {
    id: "olive-and-oak-spa",
    reference: "FID-1041",
    initials: "OO",
    business: "Olive & Oak Spa",
    category: "Beauty & wellness",
    owner: "Isabel Tan",
    location: "Makati, Philippines",
    email: "isabel@oliveandoak.example",
    submittedOn: "2026-10-02",
    status: "approved",
    documents: documents("2.2 MB", "1.2 MB"),
    note: ["All verification checks were completed."],
  },
  {
    id: "form-movement",
    reference: "FID-1044",
    initials: "FM",
    business: "Form Movement",
    category: "Fitness",
    owner: "Gabriel Ocampo",
    location: "Makati, Philippines",
    email: "gabriel@formmovement.example",
    submittedOn: "2026-10-03",
    status: "changes_requested",
    documents: documents("1.8 MB", "1.5 MB"),
    note: ["Upload a valid, readable business permit.", "Submit an owner ID that matches the registered business details."],
  },
];

export const decidedTodayBaseline = 1;

export function daysWaiting(submission: Submission): number {
  const submitted = new Date(`${submission.submittedOn}T00:00:00`);
  return Math.max(0, Math.round((SAMPLE_TODAY.getTime() - submitted.getTime()) / DAY_MS));
}

export function formatWaiting(days: number): string {
  if (days === 0) return "Today";
  return days === 1 ? "1 day" : `${days} days`;
}

export const statusLabels: Record<SubmissionStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  changes_requested: "Changes requested",
  rejected: "Rejected",
};

export function formatSubmittedOn(submission: Submission): string {
  return new Date(`${submission.submittedOn}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function isOverdue(submission: Submission): boolean {
  return submission.status === "pending" && daysWaiting(submission) > REVIEW_TARGET_DAYS;
}

export function sortSubmissions(items: Submission[], sort: SubmissionSort): Submission[] {
  const direction = sort === "oldest" ? 1 : -1;
  return [...items].sort(
    (a, b) => direction * (a.submittedOn.localeCompare(b.submittedOn) || a.reference.localeCompare(b.reference))
  );
}

export function matchesQuery(submission: Submission, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    submission.business.toLowerCase().includes(needle) || submission.reference.toLowerCase().includes(needle)
  );
}

export const reviewChecks = [
  "Business name matches the permit",
  "Permit is valid and legible",
  "Owner identity matches the registration",
] as const;

export const changeRequirements = [
  {
    id: "permit",
    label: "Business permit is missing, expired or unreadable.",
    message: "Please upload a current, readable copy of your business permit.",
  },
  {
    id: "identification",
    label: "Owner identification is missing or does not match.",
    message: "Please upload a valid owner identification that matches your registration.",
  },
  {
    id: "details",
    label: "Business details do not match the submitted documents.",
    message: "Please correct your business details so they match the submitted documents.",
  },
  {
    id: "others",
    label: "Others",
    message: "Our review team needs additional information to complete verification.",
  },
] as const;

export const REASON_MIN = 10;
export const REASON_MAX = 500;
