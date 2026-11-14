"use server";

import { z } from "zod";
import { completePasswordReset, requestResetCode, ResetError, verifyResetCode } from "@/lib/auth/password-reset";
import { checkPassword } from "@/lib/registration/schema";

export type ResetResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const emailSchema = z.string().trim().min(1, "Enter your registered email address.").email("Enter a valid email address.");

function fail(error: unknown): { ok: false; error: string } {
  if (error instanceof ResetError) return { ok: false, error: error.message };
  console.error("Password reset error:", error instanceof Error ? error.message : error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

/** Sends the 4-character code to the registered email. */
export async function sendResetCodeAction(email: string): Promise<ResetResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  try {
    await requestResetCode(parsed.data);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function verifyResetCodeAction(email: string, code: string): Promise<ResetResult<{ token: string }>> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  try {
    const { token } = await verifyResetCode(parsed.data, code);
    return { ok: true, token };
  } catch (error) {
    return fail(error);
  }
}

export async function resetPasswordAction(email: string, token: string, password: string, confirm: string): Promise<ResetResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  if (!password) return { ok: false, error: "Enter a new password." };
  const checks = checkPassword(password);
  if (!checks.length || !checks.mixedCase || !checks.unique) return { ok: false, error: "Password does not meet all the requirements." };
  if (password !== confirm) return { ok: false, error: "Passwords do not match." };
  try {
    await completePasswordReset(parsed.data, token, password);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
