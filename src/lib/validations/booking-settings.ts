import { z } from "zod";

export const staffAssignmentModeSchema = z.enum([
  "specific_staff",
  "any_available",
]);

export const bookingSettingsSchema = z
  .object({
    autoConfirm: z.boolean(),
    staffAssignmentMode: staffAssignmentModeSchema,
    defaultBufferMinutes: z
      .number()
      .int("Buffer time must be a whole number of minutes.")
      .min(0, "Buffer time cannot be negative.")
      .max(240, "Buffer time cannot exceed 240 minutes."),
    bookingLeadTimeMinutes: z
      .number()
      .int("Minimum advance notice must be a whole number of minutes.")
      .min(0, "Minimum advance notice cannot be negative.")
      .max(43200, "Minimum advance notice cannot exceed 30 days."),
    maxAdvanceDays: z
      .number()
      .int("Maximum advance booking must be a whole number of days.")
      .min(1, "Maximum advance booking must be at least 1 day.")
      .max(365, "Maximum advance booking cannot exceed 365 days."),
    cancellationWindowHours: z
      .number()
      .int("Cancellation deadline must be a whole number of hours.")
      .min(0, "Cancellation deadline cannot be negative.")
      .max(720, "Cancellation deadline cannot exceed 30 days."),
    rescheduleWindowHours: z
      .number()
      .int("Rescheduling deadline must be a whole number of hours.")
      .min(0, "Rescheduling deadline cannot be negative.")
      .max(720, "Rescheduling deadline cannot exceed 30 days."),
    cancellationPolicyNotes: z
      .string()
      .trim()
      .max(500, "Cancellation policy rules must be 500 characters or fewer."),
    slotIntervalMinutes: z
      .number()
      .int("Slot interval must be a whole number of minutes.")
      .min(5, "Slot interval must be at least 5 minutes.")
      .max(120, "Slot interval cannot exceed 120 minutes."),
  })
  .refine(
    (val) => val.bookingLeadTimeMinutes < val.maxAdvanceDays * 24 * 60,
    {
      message:
        "Minimum advance notice must be shorter than the maximum advance booking window.",
      path: ["bookingLeadTimeMinutes"],
    }
  );

export type BookingSettingsInput = z.infer<typeof bookingSettingsSchema>;