"use server";

import { RegistrationEmailError, sendRegistrationCode, verifyRegistrationCode } from "@/lib/auth/registration-email";
import { limitByClient, MINUTES } from "@/lib/rate-limit";

function fail(error: unknown) {
  if (error instanceof RegistrationEmailError) return { ok: false as const, error: error.message };
  console.error("[registration-email] verification could not be completed");
  return { ok: false as const, error: "We couldn’t verify your email right now. Please try again." };
}

export async function sendRegistrationCodeAction(email: string) {
  if (await limitByClient("registration-code-send", { limit: 8, windowMs: 15 * MINUTES })) {
    return { ok: false as const, error: "Too many requests. Please try again later." };
  }
  try {
    return { ok: true as const, ...await sendRegistrationCode(email) };
  } catch (error) {
    return fail(error);
  }
}

export async function verifyRegistrationCodeAction(email: string, code: string) {
  if (await limitByClient("registration-code-verify", { limit: 20, windowMs: 15 * MINUTES })) {
    return { ok: false as const, error: "Too many requests. Please try again later." };
  }
  try {
    return { ok: true as const, ...await verifyRegistrationCode(email, code) };
  } catch (error) {
    return fail(error);
  }
}
