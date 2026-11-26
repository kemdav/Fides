import "server-only";
import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import { sendRegistrationCodeEmail } from "@/lib/mail/emails";
import { isMailConfigured } from "@/lib/mail/mailer";
import { REGISTRATION_CODE_LENGTH } from "@/lib/registration/options";
import { createAdminClient } from "@/lib/supabase/admin";

const CODE_MINUTES = 10;
const COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const SEND_WINDOW_MS = 60 * 60_000;
const PROOF_LIFETIME_MS = 24 * SEND_WINDOW_MS;
const schema = z.string().trim().toLowerCase().email().max(254);

export class RegistrationEmailError extends Error {}

function normalizeEmail(raw: unknown) {
  const result = schema.safeParse(raw);
  if (!result.success) throw new RegistrationEmailError("Enter a valid business email address.");
  return result.data;
}

function digest(purpose: "code" | "proof", parts: string[]) {
  const env = getServerEnv();
  const secret = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing registration email signing secret.");
  return createHmac("sha256", secret).update(JSON.stringify(["registration-email", purpose, ...parts])).digest("hex");
}

function equalHash(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function sendRegistrationCode(rawEmail: unknown) {
  const email = normalizeEmail(rawEmail);
  if (!isMailConfigured()) throw new RegistrationEmailError("Email delivery is temporarily unavailable.");

  const codes = createAdminClient().from("registration_email_codes");
  const { data: current, error: lookupError } = await codes.select("id, sent_at, window_started_at, send_count").eq("email", email).maybeSingle();
  if (lookupError) throw lookupError;

  const now = Date.now();
  if (current && now - Date.parse(current.sent_at) < COOLDOWN_SECONDS * 1000) {
    throw new RegistrationEmailError("A code was just sent. Wait one minute before requesting another.");
  }
  const inWindow = current && now - Date.parse(current.window_started_at) < SEND_WINDOW_MS;
  if (inWindow && current.send_count >= 5) {
    throw new RegistrationEmailError("Too many codes requested. Please try again later.");
  }

  const id = randomUUID();
  const code = String(randomInt(10 ** REGISTRATION_CODE_LENGTH)).padStart(REGISTRATION_CODE_LENGTH, "0");
  const sentAt = new Date(now).toISOString();
  const row = {
    id, email, code_hash: digest("code", [id, email, code]),
    attempts: 0, sent_at: sentAt, used_at: null,
    expires_at: new Date(now + CODE_MINUTES * 60_000).toISOString(),
    window_started_at: inWindow ? current.window_started_at : sentAt,
    send_count: inWindow ? current.send_count + 1 : 1,
  };
  const { data, error } = current
    ? await codes.update(row).eq("email", email).eq("id", current.id).select("id").maybeSingle()
    : await codes.upsert(row, { onConflict: "email", ignoreDuplicates: true }).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new RegistrationEmailError("A code was just requested. Please wait before trying again.");

  try {
    await sendRegistrationCodeEmail({ to: email, code, minutesValid: CODE_MINUTES });
  } catch {
    throw new RegistrationEmailError("We couldn’t send the code. Please try again in a moment.");
  }
  return { retryAt: now + COOLDOWN_SECONDS * 1000 };
}

export async function verifyRegistrationCode(rawEmail: unknown, rawCode: unknown) {
  const email = normalizeEmail(rawEmail);
  if (typeof rawCode !== "string" || rawCode.length !== REGISTRATION_CODE_LENGTH || /\D/.test(rawCode)) {
    throw new RegistrationEmailError("Enter the six-digit code from your email.");
  }
  const codes = createAdminClient().from("registration_email_codes");
  const { data: row, error: lookupError } = await codes.select("*").eq("email", email).maybeSingle();
  if (lookupError) throw lookupError;
  const now = new Date();
  if (!row || row.used_at || Date.parse(row.expires_at) <= now.getTime()) {
    throw new RegistrationEmailError("This code is no longer valid. Request a new code.");
  }
  const limitMessage = "Too many incorrect attempts. Request a new code.";
  if (row.attempts >= MAX_ATTEMPTS) throw new RegistrationEmailError(limitMessage);

  const matches = equalHash(row.code_hash, digest("code", [row.id, email, rawCode]));
  const timestamp = now.toISOString();
  const { data, error } = await codes
    .update(matches ? { used_at: timestamp } : { attempts: row.attempts + 1 })
    .eq("email", email).eq("id", row.id).eq("attempts", row.attempts)
    .is("used_at", null).gt("expires_at", timestamp).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new RegistrationEmailError("The code changed while we were checking it. Please try again.");
  if (!matches) {
    throw new RegistrationEmailError(row.attempts + 1 >= MAX_ATTEMPTS ? limitMessage : "That code is incorrect. Check your email and try again.");
  }

  const expiry = String(now.getTime() + PROOF_LIFETIME_MS);
  return { proof: `${expiry}.${digest("proof", [email, expiry])}` };
}

export function hasRegistrationEmailProof(email: string, proof: unknown) {
  if (typeof proof !== "string" || !/^\d{13}\.[a-f0-9]{64}$/.test(proof)) return false;
  const [expiry, signature] = proof.split(".");
  return Number(expiry) > Date.now() && equalHash(signature, digest("proof", [email.trim().toLowerCase(), expiry]));
}
