import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your business email address.").email("Enter a valid email address, e.g. maria@bellavita.ph."),
  password: z.string().min(1, "Enter your password."),
});

export type LoginFieldErrors = { email?: string; password?: string };

export function loginFieldErrors(error: z.ZodError): LoginFieldErrors {
  const fields: LoginFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if ((key === "email" || key === "password") && !fields[key]) fields[key] = issue.message;
  }
  return fields;
}

/** Only allow post-login redirects into the dashboard (no open redirects). */
export function safeRedirect(value: unknown): string {
  const fallback = "/dashboard";
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/dashboard") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

export type LoginInput = z.infer<typeof loginSchema>;
