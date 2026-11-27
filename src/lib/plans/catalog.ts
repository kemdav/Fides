// the plans as the public pages show them. pure module: used on the server and in the browser.

export type PublicPlan = {
  code: string;
  name: string;
  /** pesos per month */
  price: number;
  description: string;
  /** "(Includes all Basic features, plus:)" when the plan builds on another */
  includes: string | null;
  features: string[];
};

export type TierRow = {
  code: string;
  name: string;
  price_cents: number;
  description: string;
  features: string[];
};

const BUILDS_ON = /^Everything in (.+)$/i;

/** A tier whose first feature is "Everything in X" shows that as a heading, not as a bullet. */
export function toPublicPlan(row: TierRow): PublicPlan {
  const [first, ...rest] = row.features;
  const base = first ? BUILDS_ON.exec(first)?.[1] : undefined;
  return {
    code: row.code,
    name: row.name,
    price: row.price_cents / 100,
    description: row.description,
    includes: base ? `(Includes all ${base} features, plus:)` : null,
    features: base ? rest : row.features,
  };
}

/** The plan preselected at sign-up. */
export function defaultPlanCode(plans: readonly PublicPlan[]): string {
  return plans.find((plan) => plan.code === "business")?.code ?? plans[0]?.code ?? "business";
}

/** Plan codes saved in registration drafts before the two plan catalogs were merged. */
export function currentPlanCode(code: string, plans: readonly PublicPlan[]): string {
  const renamed = code === "starter" ? "basic" : code === "professional" ? "business" : code;
  return plans.some((plan) => plan.code === renamed) ? renamed : defaultPlanCode(plans);
}

/**
 * Shown only when the database cannot be reached (for example a build without one).
 * `subscription_tiers` is the real catalog.
 */
export const FALLBACK_TIERS: readonly TierRow[] = [
  {
    code: "basic",
    name: "Basic",
    price_cents: 49900,
    description:
      "Get started with essential tools to manage your services and bookings. Ideal for new providers building their business.",
    features: [
      "Real-Time Booking Calendar",
      "Custom Service & Pricing Menu",
      "Staff & Resource Allocation",
      "Walk-in Registration & Booking",
      "QR Code Check-in System",
      "Instant Booking & Status Email Alerts",
      "Status Tracking & Audit Logs",
      "Daily Operations Dashboard",
      "Customer Profile & Visit History",
      "Basic Sales & Activity Reports",
      "Annual BIR Tax-Ready Reports",
    ],
  },
  {
    code: "business",
    name: "Business",
    price_cents: 149900,
    description:
      "Unlock powerful tools to grow your bookings and streamline your daily operations. Ideal for growing providers ready to expand their reach.",
    features: [
      "Everything in Basic",
      "24/7 AI Booking Assistant",
      "Automated Email Reminders",
      "Smart Waiting List Management",
      "Automated Commission Tracking",
      "Detailed Sales & Operational Analytics",
      "Quarterly BIR Tax-Ready Reports",
    ],
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price_cents: 299900,
    description:
      "Take your business further with advanced tools for teams, locations, and operations. Ideal for established providers ready to scale.",
    features: [
      "Everything in Business",
      "Multi-Branch Management",
      "Centralized Executive Dashboard & Analytics",
      "Multi-Branch Inventory Tracking",
      "Consolidated Multi-Branch BIR Reporting",
      "Location-Based Role & Access Control",
    ],
  },
];
