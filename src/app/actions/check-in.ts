"use server";

import { updateAppointmentStatusAction } from "@/app/actions/appointments";
import type { ActionResult } from "@/app/actions/appointments";
import { checkInSchema } from "@/features/check-in/schema";

export async function checkInAppointmentAction(input: unknown): Promise<ActionResult> {
  const parsed = checkInSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Enter the full appointment check-in code." };

  const result = await updateAppointmentStatusAction({
    appointmentId: parsed.data.code,
    tenantIdParam: parsed.data.tenantId,
    newStatus: "Check In",
    expectedStatus: "confirmed",
  });

  return result.success
    ? { success: true, message: "Appointment checked in." }
    : { success: false, error: "Check-in failed. Verify that the code is for a confirmed appointment in this workspace." };
}
