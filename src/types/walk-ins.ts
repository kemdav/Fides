export type WaitlistStatus =
  | "waiting"
  | "notified"
  | "converted"
  | "expired"
  | "cancelled";

export interface WalkInServiceOption {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
}

export interface WalkInStaffOption {
  id: string;
  fullName: string;
  resourceLabel: string;
  eligibleServicesLabel: string;
  isAvailableNow: boolean;
  nextAvailableLabel: string;
  nextAvailableIso: string | null;
}

export interface WaitlistQueueItem {
  id: string;
  position: number;
  totalWaiting: number;
  joinedAt: string;
  joinedTimeLabel: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  serviceId: string | null;
  serviceName: string;
  serviceDurationMinutes: number;
  servicePriceCents: number;
  requestedStaffId: string | null;
  requestedStaffName: string | null; // null => "Any available"
  status: WaitlistStatus;
  notifiedAt: string | null;
  notes: string | null;
  estimatedWaitMinutes: number;
}

export interface AssignableSlotOption {
  startsAt: string;
  endsAt: string;
  label: string; // e.g. "10:45 AM → 11:45 AM"
  durationMinutes: number;
}

export interface WalkInKpis {
  waitingNow: number;
  availableStaffCount: number;
  availableStaffSummary: string;
  walkInsServedToday: number;
  typicalWaitingMinutes: number;
  totalActiveStaff: number;
}

export interface WalkInWorkspaceData {
  tenantId: string;
  kpis: WalkInKpis;
  waitingList: WaitlistQueueItem[];
  availableNow: WalkInStaffOption[];
  services: WalkInServiceOption[];
  staff: WalkInStaffOption[];
}