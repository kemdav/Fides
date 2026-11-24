export function addScheduleDays(date: string, days: number) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function scheduleWeekStart(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addScheduleDays(date, -((day + 6) % 7));
}

export type StaffScheduleAppointment = {
  id: string;
  customer: string;
  services: string[];
  resources: string[];
  start: string;
  end: string;
  status: string;
};

export type StaffWorkDay = {
  date: string;
  onLeave: boolean;
  dayEnd: number;
  blocks: { start: number; end: number; type: "work" | "break" }[];
};

export type StaffSchedule = {
  days: StaffWorkDay[];
  appointments: StaffScheduleAppointment[];
  next: StaffScheduleAppointment | null;
};
