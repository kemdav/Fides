"use server";

import { RegistrationEmailError, sendRegistrationCode, verifyRegistrationCode } from "@/lib/auth/registration-email";

function fail(error: unknown) {
  if (error instanceof RegistrationEmailError) return { ok: false as const, error: error.message };
  console.error("Registration email verification failed", error);
  return { ok: false as const, error: "We couldn’t verify your email right now. Please try again." };
}

export async function sendRegistrationCodeAction(email: string) {
  try {
    return { ok: true as const, ...await sendRegistrationCode(email) };
  } catch (error) {
    return fail(error);
  }
}

export async function verifyRegistrationCodeAction(email: string, code: string) {
  try {
    return { ok: true as const, ...await verifyRegistrationCode(email, code) };
  } catch (error) {
    return fail(error);
  }
}
