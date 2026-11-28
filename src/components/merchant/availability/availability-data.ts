import type { ManilaWeekDay } from "@/lib/date-utils";

export type Weekday = ManilaWeekDay["day"];
export type Shift = { start: string; end: string; breakStart: string; breakEnd: string };
export type StaffSchedule = {
  id: string;
  name: string;
  serviceId: string;
  shifts: Partial<Record<Weekday, Shift>>;
};

export const weekdays = [
  { value: "Mon", label: "Monday" }, { value: "Tue", label: "Tuesday" },
  { value: "Wed", label: "Wednesday" }, { value: "Thu", label: "Thursday" },
  { value: "Fri", label: "Friday" }, { value: "Sat", label: "Saturday" },
  { value: "Sun", label: "Sunday" },
] as const;

export const closingDay = { value: "Sun", label: "Sunday" } as const;
export const defaultWeek = "2026-10-19";
export const lunch = { start: "12:00", end: "13:00" } as const;
export const allTargets = "all";

export const services = [
  { id: "haircut", name: "Signature haircut", calendarName: "Haircut" },
  { id: "color", name: "Hair color", calendarName: "Color" },
  { id: "massage", name: "Massage", calendarName: "Massage" },
  { id: "facial", name: "Facial", calendarName: "Facial" },
];

export const resourceTypes = [
  { value: "chair", label: "Styling chair" }, { value: "room", label: "Treatment room" },
  { value: "equipment", label: "Equipment" }, { value: "other", label: "Other" },
] as const;

export const resourceHours = [
  { value: "business", label: "Business hours" }, { value: "appointment", label: "By appointment" },
] as const;

export type Resource = {
  id: string;
  name: string;
  type: (typeof resourceTypes)[number]["value"];
  hours: (typeof resourceHours)[number]["value"];
  capacity: number;
  serviceIds: string[];
  archived: boolean;
};

export const blockTypes = [
  { value: "leave", label: "Staff leave" }, { value: "break", label: "Temporary break" },
  { value: "holiday", label: "Business holiday" }, { value: "closure", label: "Business closure" },
  { value: "resource", label: "Resource closure" },
] as const;

export type TimeBlock = {
  id: string;
  kind: (typeof blockTypes)[number]["value"];
  target: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  reason: string;
};

export const defaultShift: Shift = { start: "09:00", end: "18:00", breakStart: lunch.start, breakEnd: lunch.end };

function shift(start: string, end: string): Shift {
  return { ...defaultShift, start, end };
}

const standardShift = defaultShift;
const earlyShift = shift("09:00", "17:30");
const lateShift = shift("10:00", "18:00");
const shortShift = shift("09:00", "17:00");
const weekendShift = shift("10:00", "17:00");

export const initialStaff: StaffSchedule[] = [
  { id: "sofia", name: "Sofia Cruz", serviceId: "haircut", shifts: { Mon: standardShift, Tue: standardShift, Wed: standardShift, Thu: standardShift, Fri: standardShift, Sat: weekendShift } },
  { id: "miguel", name: "Miguel Tan", serviceId: "color", shifts: { Mon: standardShift, Tue: earlyShift, Wed: lateShift, Fri: standardShift, Sat: weekendShift } },
  { id: "lia", name: "Lia Ramos", serviceId: "massage", shifts: { Tue: lateShift, Wed: lateShift, Thu: shortShift, Fri: lateShift, Sat: weekendShift } },
  { id: "chloe", name: "Chloe Lim", serviceId: "facial", shifts: { Mon: shortShift, Tue: standardShift, Wed: earlyShift, Thu: shortShift, Fri: shortShift, Sat: weekendShift } },
];

export const initialResources: Resource[] = [
  { id: "chair-a", name: "Chair A", type: "chair", hours: "business", capacity: 1, serviceIds: ["haircut"], archived: false },
  { id: "chair-b", name: "Chair B", type: "chair", hours: "business", capacity: 1, serviceIds: ["color", "haircut"], archived: false },
  { id: "treatment-room", name: "Treatment room", type: "room", hours: "business", capacity: 1, serviceIds: ["massage", "facial"], archived: false },
];

export const initialBlocks: TimeBlock[] = [
  { id: "all-saints", kind: "holiday", target: allTargets, startDate: "2026-11-01", endDate: "2026-11-01", allDay: true, startTime: "09:00", endTime: "18:00", reason: "All Saints' Day" },
  { id: "sofia-leave", kind: "leave", target: "sofia", startDate: "2026-11-03", endDate: "2026-11-03", allDay: true, startTime: "09:00", endTime: "18:00", reason: "Approved personal leave" },
];
