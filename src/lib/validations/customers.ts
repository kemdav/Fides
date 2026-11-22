import { z } from "zod";

const optionalEmailSchema = z
  .string()
  .trim()
  .refine(
    (val) => val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    "Enter a valid email address."
  );

const optionalBirthdaySchema = z
  .string()
  .trim()
  .refine(
    (val) => val === "" || /^\d{4}-\d{2}-\d{2}$/.test(val),
    "Enter a valid date (YYYY-MM-DD)."
  );

export const createCustomerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters.")
      .max(120, "Full name must be 120 characters or fewer."),
    email: optionalEmailSchema,
    phone: z
      .string()
      .trim()
      .min(7, "Enter a valid phone number.")
      .max(30, "Phone number is too long."),
    birthday: optionalBirthdaySchema,
    marketingOptIn: z.boolean(),
    sendInvite: z.boolean(),
  })
  .refine((data) => !data.sendInvite || data.email.length > 0, {
    message: "Add an email address to send an account invite.",
    path: ["email"],
  });

export const updateCustomerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(120, "Full name must be 120 characters or fewer."),
  email: optionalEmailSchema,
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number.")
    .max(30, "Phone number is too long."),
  birthday: optionalBirthdaySchema,
  marketingOptIn: z.boolean(),
});

export const customerNoteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Enter a note before posting.")
    .max(1000, "Notes must be 1,000 characters or fewer."),
});

export const acceptCustomerInviteSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
      .regex(/[a-z]/, "Password must include at least one lowercase letter.")
      .regex(/[0-9]/, "Password must include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });