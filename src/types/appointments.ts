export interface AppointmentServiceOption {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
  eligibleStaffIds: string[];
}

export interface AppointmentStaffOption {
  id: string;
  fullName: string;
}
