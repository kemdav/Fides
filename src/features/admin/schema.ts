import { z } from "zod";

// input for every admin operation. pure module: forms may import it too.

export const REASON_MIN = 10;
export const REASON_MAX = 500;
/** bulk actions work one tenant at a time, so keep a request bounded */
export const BULK_MAX = 100;

const id = z.uuid("Choose a valid record.");
const reason = z
  .string()
  .trim()
  .min(REASON_MIN, `Give a reason of at least ${REASON_MIN} characters.`)
  .max(REASON_MAX, `Keep the reason under ${REASON_MAX} characters.`);
const planCode = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,59}$/, "Choose a valid plan.");
const ids = z.array(id).min(1, "Select at least one tenant.").max(BULK_MAX, `Select ${BULK_MAX} tenants or fewer.`);
const limit = z.number().int("Use a whole number.").min(1, "Use 1 or more.").max(100000, "That limit is too high.").nullable();

export const applicationInput = z.strictObject({ applicationId: id });

export const rejectApplicationInput = z.strictObject({ applicationId: id, reason });

export const tenantAccessInput = z.strictObject({
  applicationIds: ids,
  access: z.enum(["active", "suspended"]),
  reason,
});

export const changePlanInput = z.strictObject({ applicationId: id, planCode, reason });

export const remindersInput = z.strictObject({ applicationIds: ids });

export const saveTierInput = z.strictObject({
  /** absent when creating a new tier */
  code: planCode.optional(),
  name: z.string().trim().min(1, "Enter a tier name.").max(60, "Keep the name under 60 characters."),
  price: z.number().positive("Enter a price above zero.").max(1000000, "That price is too high."),
  staffLimit: limit,
  locationLimit: limit,
});

export const tierInput = z.strictObject({ code: planCode });

export const documentLinkInput = z.strictObject({ documentId: id, download: z.boolean() });
