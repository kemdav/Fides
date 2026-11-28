import { z } from "zod";

export const checkInCodeSchema = z.string().trim().toLowerCase().uuid();

export const checkInSchema = z.object({
  tenantId: z.uuid(),
  code: checkInCodeSchema,
});
