import { z } from "zod";

/**
 * Reusable schema for email fields with trimming, non-empty, and format checks.
 */
export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .email("Please enter a valid email address.");

/**
 * Reusable password schema enforcing a minimum of 8 characters.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.");

/**
 * Schema for Sign In.
 * Validates presence of email and password without imposing min-length
 * on password at login to avoid leaking credential policy or blocking legacy accounts.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Schema for Sign Up with password strength & confirmation validation.
 */
export const signupSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters.")
      .max(100, "Full name is too long.")
      .optional()
      .or(z.literal("")),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

/**
 * Schema for requesting a password reset email.
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Schema for setting a new password via reset link.
 */
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
