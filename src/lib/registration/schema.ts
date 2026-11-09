import { z } from "zod";
import { ID_TYPES, PLAN_OPTIONS } from "./options";

export type PasswordChecks = {
  length: boolean;
  mixedCase: boolean;
  unique: boolean;
};

export function checkPassword(value: string): PasswordChecks {
  return {
    length: value.length > 6,
    mixedCase: /[a-z]/.test(value) && /[A-Z]/.test(value),
    unique: /[^A-Za-z]/.test(value),
  };
}

export function isStrongPassword(value: string): boolean {
  const checks = checkPassword(value);
  return checks.length && checks.mixedCase && checks.unique;
}

const text = (label: string, max = 120) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} is too long.`);

const currentYear = new Date().getFullYear();

const base = z.object({
  fullName: text("Full name", 100).min(2, "Full name must be at least 2 characters."),
  email: z.string().trim().toLowerCase().min(1, "Business email is required.").email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required.")
    .regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid phone number."),
  password: z
    .string()
    .min(1, "Password is required.")
    .refine(isStrongPassword, "Password does not meet all the requirements."),
  confirmPassword: z.string().min(1, "Please confirm your password."),
  acceptTerms: z.literal(true, { error: "You must agree to the Terms of Service and Privacy Policy." }),

  ownerLegalName: text("Owner's legal full name", 120),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date of birth.")
    .refine((value) => {
      const dob = new Date(value);
      const limit = new Date();
      limit.setFullYear(limit.getFullYear() - 18);
      return dob <= limit;
    }, "The business owner must be at least 18 years old.")
    .refine((value) => new Date(value).getFullYear() >= 1900, "Enter a valid date of birth."),
  idType: z.enum(ID_TYPES.map((item) => item.value) as [string, ...string[]], {
    error: "Select an ID type.",
  }),

  businessName: text("Business name", 120).min(2, "Business name must be at least 2 characters."),
  businessType: text("Business type", 80),
  establishedYear: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Enter a 4-digit year.")
    .refine((value) => Number(value) >= 1900 && Number(value) <= currentYear, `Enter a year between 1900 and ${currentYear}.`),
  streetAddress: text("Street address", 200),
  city: text("City", 80),
  province: text("Province / region", 80),
  zipCode: text("ZIP code", 12),

  planCode: z.enum(PLAN_OPTIONS.map((plan) => plan.code) as [string, ...string[]], {
    error: "Select a subscription package.",
  }),
  confirmAccuracy: z.literal(true, { error: "Please confirm that your information is accurate." }),
});

export type RegistrationInput = z.infer<typeof base>;
export type RegistrationField = keyof RegistrationInput;

export const accountStepSchema = base.pick({
  fullName: true,
  email: true,
  phone: true,
  password: true,
  confirmPassword: true,
  acceptTerms: true,
});

export const identityStepSchema = base.pick({
  ownerLegalName: true,
  dateOfBirth: true,
  idType: true,
});

export const businessStepSchema = base.pick({
  businessName: true,
  businessType: true,
  establishedYear: true,
  streetAddress: true,
  city: true,
  province: true,
  zipCode: true,
});

export const planStepSchema = base.pick({ planCode: true });

export const registrationSchema = base.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export function validateStep(
  schema: z.ZodType,
  values: Record<string, unknown>
): Partial<Record<string, string>> {
  const result = schema.safeParse(values);
  if (result.success) return {};
  const errors: Partial<Record<string, string>> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
