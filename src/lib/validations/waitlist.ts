import { z } from "zod";

export const addToWaitlistSchema = z.object({
  guestName: z.string().trim().min(1, "Customer name is required.").max(120),
  guestPhone: z.string().trim().max(30).optional().nullable(),
  serviceName: z.string().trim().max(120).optional().nullable(),
  staffName: z.string().trim().max(120).optional().nullable(),
  serviceId: z.string().uuid().optional().nullable(),
  staffId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  tenantIdParam: z.string().uuid().optional().nullable(),
});

export const assignWaitlistSlotSchema = z.object({
  waitlistEntryId: z.string().uuid("A valid waiting-list entry is required."),
  tenantIdParam: z.string().uuid().optional().nullable(),
  staffId: z.string().uuid().optional().nullable(),
  staffName: z.string().trim().max(120).optional().nullable(),
  resourceId: z.string().uuid().optional().nullable(),
  resourceName: z.string().trim().max(120).optional().nullable(),
  serviceId: z.string().uuid().optional().nullable(),
  serviceName: z.string().trim().max(120).optional().nullable(),
  priceCents: z.number().int().nonnegative().optional().nullable(),
  startsAt: z.string().min(1, "A valid start time is required."),
  durationMinutes: z.number().int().positive().max(480).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  notify: z.boolean().default(true),
});

export const cancelWaitlistEntrySchema = z.object({
  waitlistEntryId: z.string().uuid("A valid waiting-list entry is required."),
  tenantIdParam: z.string().uuid().optional().nullable(),
  reason: z.string().trim().max(300).optional().nullable(),
});

export const createDirectWalkInSchema = z.object({
  customerName: z.string().trim().min(1, "Customer name is required.").max(120),
  customerEmail: z.string().trim().email("Enter a valid email address.").optional().or(z.literal("")).nullable(),
  customerPhone: z.string().trim().max(30).optional().nullable(),
  serviceName: z.string().trim().max(120).optional().nullable(),
  serviceId: z.string().uuid().optional().nullable(),
  staffName: z.string().trim().max(120).optional().nullable(),
  staffId: z.string().uuid().optional().nullable(),
  resourceId: z.string().uuid().optional().nullable(),
  startsAt: z.string().min(1, "Start time is required."),
  durationMinutes: z.number().int().positive().max(480).optional().nullable(),
  priceCents: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  tenantIdParam: z.string().uuid().optional().nullable(),
});
