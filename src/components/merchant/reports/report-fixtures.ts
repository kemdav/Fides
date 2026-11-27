export const SOURCE_LABELS = {
  online: "Online Web/PWA",
  walkIn: "In-Person Walk-In",
  phone: "Phone/Message",
} as const;

export type BookingSource = keyof typeof SOURCE_LABELS;
export type Outcome = "completed" | "cancelled" | "noShow";

export const SOURCES = [
  { id: "online", short: "Online", split: "Online Web/PWA", color: "bg-burnt", token: "var(--color-burnt)" },
  { id: "walkIn", short: "Walk-in", split: "Walk-in", color: "bg-sky-deep", token: "var(--color-sky-deep)" },
  { id: "phone", short: "Phone", split: "Phone/Message", color: "bg-body", token: "var(--color-body)" },
] as const;

export const STAFF = {
  sofia: { name: "Sofia Cruz", rule: "15% of service price", rate: 0.15, fixedCents: 0 },
  miguel: { name: "Miguel Tan", rule: "20% of service price", rate: 0.2, fixedCents: 0 },
  lia: { name: "Lia Ramos", rule: "Fixed ₱150 / service", rate: 0, fixedCents: 15_000 },
  chloe: { name: "Chloe Lim", rule: "10% of service price", rate: 0.1, fixedCents: 0 },
} as const;

type Staff = keyof typeof STAFF;
export const STAFF_IDS: readonly Staff[] = ["sofia", "miguel", "lia", "chloe"];
export const METHODS = ["Cash", "GCash", "Card"] as const;
const SERVICES = [
  { name: "Haircut", category: "Hair" },
  { name: "Hair color", category: "Hair" },
  { name: "Facial", category: "Skin" },
  { name: "Massage", category: "Wellness" },
] as const;

export const CATEGORIES = ["Hair", "Skin", "Wellness"] as const;

type Activity = {
  id: string;
  day: string;
  source: BookingSource;
  staff: Staff;
};

export type Receipt = Activity & {
  outcome: "completed";
  receiptDay: string;
  time: string;
  customer: string;
  service: (typeof SERVICES)[number];
  quantity: number;
  method: (typeof METHODS)[number];
  grossCents: number;
};

export type Appointment = Receipt | (Activity & { outcome: Exclude<Outcome, "completed"> });

const CUSTOMERS = ["Ana Reyes", "Walk-in Client", "Daniel Lim", "Bea Flores", "Mika Yu", "Paolo Cruz"] as const;

function completed(day: string, staff: Staff, grossCents: number, index: number, id: string): Receipt {
  const source = SOURCES[index % SOURCES.length]?.id ?? "online";
  const time = `${String(9 + index % 9).padStart(2, "0")}:${index % 2 ? "30" : "00"}`;
  const settledNextDay = index % 11 === 0;
  const nextDay = new Date(Date.parse(day) + 86_400_000).toISOString().slice(0, 10);
  return {
    id, day, staff, source, grossCents, time, outcome: "completed",
    receiptDay: settledNextDay ? nextDay : day,
    customer: CUSTOMERS[index % CUSTOMERS.length] ?? CUSTOMERS[0],
    service: SERVICES[index % SERVICES.length] ?? SERVICES[0],
    quantity: 1,
    method: METHODS[index % METHODS.length] ?? METHODS[0],
  };
}

const OCTOBER_FEATURED: readonly Receipt[] = [
  { ...completed("2026-10-21", "sofia", 45_000, 0, "FD-2026-1042"), receiptDay: "2026-10-21", time: "09:30" },
  { ...completed("2026-10-21", "miguel", 180_000, 1, "FD-2026-1041"), time: "10:00" },
  { ...completed("2026-10-21", "lia", 90_000, 2, "FD-2026-1040"), time: "10:45" },
  { ...completed("2026-10-20", "miguel", 120_000, 3, "FD-2026-1039"), time: "16:30" },
];

function allocateMonth(month: number, staff: Staff, count: number, grossCents: number): Receipt[] {
  const prefix = `2026-${String(month).padStart(2, "0")}`;
  const featured = month === 10 ? OCTOBER_FEATURED.filter((row) => row.staff === staff) : [];
  const remaining = count - featured.length;
  const balance = grossCents - featured.reduce((total, row) => total + row.grossCents, 0);
  const base = Math.floor(balance / remaining);
  return [
    ...featured,
    ...Array.from({ length: remaining }, (_, index) => {
      const day = `${prefix}-${String(1 + (index * 7 + STAFF_IDS.indexOf(staff)) % (month === 10 ? 19 : 27)).padStart(2, "0")}`;
      const cents = base + (index < balance % remaining ? 1 : 0);
      return completed(day, staff, cents, index + STAFF_IDS.indexOf(staff), `FD-${prefix}-${STAFF_IDS.indexOf(staff) + 1}${String(index + 1).padStart(3, "0")}`);
    }),
  ];
}

function missed(day: string, staff: Staff, cancelled: number, noShow: number): Appointment[] {
  return Array.from({ length: cancelled + noShow }, (_, index) => ({
    id: `${day}-${staff}-${index}`, day, staff,
    source: SOURCES[index % SOURCES.length]?.id ?? "online",
    outcome: index < cancelled ? "cancelled" : "noShow",
  }));
}

const MONTHLY_GROSS_PHP = [58_500, 60_950, 63_000, 92_800, 58_000, 64_000, 61_500, 72_000, 78_500];
const earlierMonths = MONTHLY_GROSS_PHP.flatMap((gross, index) => [
  ...allocateMonth(index + 1, "sofia", 36, gross * 35),
  ...allocateMonth(index + 1, "miguel", 31, gross * 40),
  ...allocateMonth(index + 1, "lia", 29, gross * 25),
]);

const october = [
  ...allocateMonth(10, "sofia", 48, 2_850_000),
  ...allocateMonth(10, "miguel", 42, 3_800_000),
  ...allocateMonth(10, "lia", 36, 1_800_000),
  ...missed("2026-10-13", "sofia", 6, 3),
  ...missed("2026-10-15", "miguel", 7, 3),
  ...missed("2026-10-19", "lia", 5, 2),
];

const novemberStaff = [
  ...Array<Staff>(48).fill("sofia"), ...Array<Staff>(43).fill("miguel"),
  ...Array<Staff>(36).fill("lia"), ...Array<Staff>(29).fill("chloe"),
];

const november = [
  ...[[15, 7, 4], [19, 8, 4], [18, 7, 4], [22, 8, 5], [21, 9, 5]].flatMap((counts, dateIndex) =>
    counts.flatMap((count, sourceIndex) =>
      Array.from({ length: count }, (_, index) => {
        const day = `2026-11-${String(9 + dateIndex).padStart(2, "0")}`;
        const priorDays = [0, 26, 57, 86, 121].at(dateIndex) ?? 0;
        const priorSources = counts.slice(0, sourceIndex).reduce((sum, value) => sum + value, 0);
        const staffIndex = ((priorDays + priorSources + index) * 17) % novemberStaff.length;
        const receipt = completed(day, novemberStaff[staffIndex] ?? "sofia", 45_000 + (index % 6) * 10_000, index, `FD-2026-11-${dateIndex}${sourceIndex}${String(index).padStart(2, "0")}`);
        return { ...receipt, source: SOURCES[sourceIndex]?.id ?? "online" };
      }),
    ),
  ),
  ...missed("2026-11-09", "sofia", 4, 2),
  ...missed("2026-11-10", "miguel", 7, 2),
  ...missed("2026-11-11", "lia", 4, 1),
  ...missed("2026-11-12", "chloe", 3, 2),
  completed("2026-11-27", "chloe", 95_000, 1, "FD-2026-11-2701"),
];

export const APPOINTMENTS: readonly Appointment[] = [...earlierMonths, ...october, ...november];
export const RECEIPTS = APPOINTMENTS.filter((row) => row.outcome === "completed");
