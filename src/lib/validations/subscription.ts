import { z } from "zod";

export const schedulePlanChangeSchema = z.object({
  tenantId: z.string().uuid("Invalid workspace identifier."),
  targetTierCode: z.enum(["basic", "business", "enterprise"]),
});

export const cancelSubscriptionSchema = z.object({
  tenantId: z.string().uuid("Invalid workspace identifier."),
  reason: z
    .string()
    .trim()
    .max(500, "Reason must be 500 characters or fewer.")
    .optional()
    .default(""),
});

export const tenantActionSchema = z.object({
  tenantId: z.string().uuid("Invalid workspace identifier."),
});

export const billingDetailsSchema = z.object({
  tenantId: z.string().uuid("Invalid workspace identifier."),
  billingName: z
    .string()
    .trim()
    .min(2, "Billing name is required.")
    .max(120, "Billing name is too long."),
  billingEmail: z
    .string()
    .trim()
    .email("Enter a valid billing email address.")
    .max(160, "Billing email is too long."),
  sameAsBusinessEmail: z.boolean(),
  streetBarangay: z
    .string()
    .trim()
    .min(2, "Street / barangay is required.")
    .max(200, "Street / barangay is too long."),
  city: z
    .string()
    .trim()
    .min(2, "City is required.")
    .max(100, "City is too long."),
  province: z
    .string()
    .trim()
    .min(2, "Province is required.")
    .max(100, "Province is too long."),
  postalCode: z
    .string()
    .trim()
    .min(3, "Postal code is required.")
    .max(16, "Postal code is too long."),
  tin: z
    .string()
    .trim()
    .max(32, "TIN is too long.")
    .optional()
    .default(""),
  branchCode: z
    .string()
    .trim()
    .max(12, "Branch code is too long.")
    .optional()
    .default("000"),
});

export const invoiceDeliveryPreferencesSchema = z.object({
  tenantId: z.string().uuid("Invalid workspace identifier."),
  ccEmail: z
    .string()
    .trim()
    .max(160, "CC email is too long.")
    .refine(
      (val) => val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Enter a valid CC email address."
    ),
});

export const renewalReminderSettingsSchema = z.object({
  tenantId: z.string().uuid("Invalid workspace identifier."),
  renewalRemindersEnabled: z.boolean(),
});

export const submitPaymentDetailsSchema = z.object({
  tenantId: z.string().uuid("Invalid workspace identifier."),
  invoiceId: z.string().uuid("Invalid invoice identifier."),
  bankTransferReference: z
    .string()
    .trim()
    .min(3, "Bank transfer reference is required.")
    .max(120, "Bank transfer reference is too long."),
  transferDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid transfer date."),
  amountPhp: z
    .string()
    .trim()
    .refine((val) => {
      const parsed = Number(val.replace(/,/g, ""));
      return Number.isFinite(parsed) && parsed > 0;
    }, "Enter a valid transfer amount greater than 0."),
});

export const ALLOWED_RECEIPT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
] as const;

export const MAX_RECEIPT_FILE_BYTES = 10 * 1024 * 1024; // 10 MB