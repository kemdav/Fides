export type StaffAssignmentMode = "specific_staff" | "any_available";

export interface BookingSettingsFormValues {
  autoConfirm: boolean;
  staffAssignmentMode: StaffAssignmentMode;
  defaultBufferMinutes: number;
  bookingLeadTimeMinutes: number;
  maxAdvanceDays: number;
  cancellationWindowHours: number;
  rescheduleWindowHours: number;
  cancellationPolicyNotes: string;
  slotIntervalMinutes: number;
}

export interface BookingSettingsMetadata {
  tenantId: string;
  tenantSlug: string;
  businessName: string;
  timeZone: string;
  canEdit: boolean;
  userRole: string;
  userName: string;
  userEmail: string;
  lastSavedAt: string | null;
  lastSavedByName: string | null;
}

export interface BookingSettingsWorkspaceData {
  settings: BookingSettingsFormValues;
  meta: BookingSettingsMetadata;
}

export const DEFAULT_BOOKING_SETTINGS: BookingSettingsFormValues = {
  autoConfirm: false,
  staffAssignmentMode: "any_available",
  defaultBufferMinutes: 10,
  bookingLeadTimeMinutes: 120,
  maxAdvanceDays: 30,
  cancellationWindowHours: 24,
  rescheduleWindowHours: 24,
  cancellationPolicyNotes: "",
  slotIntervalMinutes: 15,
};