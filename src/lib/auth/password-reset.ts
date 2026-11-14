import "server-only";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { getServerEnv } from "@/lib/env";
import { sendPasswordResetCodeEmail } from "@/lib/mail/emails";
import { isMailConfigured } from "@/lib/mail/mailer";
import { isStrongPassword } from "@/lib/registration/schema";
import { createAdminClient } from "@/lib/supabase/admin";

/** No 0/O/1/I so a code read from an email is hard to mistype. 32^4 ≈ 1 million codes. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 4;
export const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 45;

export class ResetError extends Error {}

function secret(): string {
  const env = getServerEnv();
  const value = env.PASSWORD_RESET_SECRET ?? env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new ResetError("Password reset is not configured on the server.");
  return value;
}

const hash = (purpose: "code" | "token", rowId: string, value: string) =>
  createHmac("sha256", secret()).update(`${purpose}:${rowId}:${value}`).digest("hex");

function matches(expectedHex: string, actualHex: string): boolean {
  const a = Buffer.from(expectedHex, "hex");
  const b = Buffer.from(actualHex, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function generateCode(): string {
  return Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

export const normalizeCode = (value: string) => value.replace(/\s+/g, "").toUpperCase();
const normalizeEmail = (value: string) => value.trim().toLowerCase();

async function findUser(email: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("account_applications")
    .select("user_id, full_name")
    .ilike("email", email.replace(/[%_]/g, "\\$&"))
    .maybeSingle();
  return data;
}

/**
 * Step 1: email a new 4-character code. Always succeeds for the caller whether or not the
 * address is registered, so the form cannot be used to discover which emails have accounts.
 */
export async function requestResetCode(rawEmail: string): Promise<void> {
  if (!isMailConfigured()) throw new ResetError("Email delivery is not configured yet. Please contact support.");

  const email = normalizeEmail(rawEmail);
  const user = await findUser(email);
  if (!user) return;

  const admin = createAdminClient();
  const { data: latest } = await admin
    .from("password_reset_codes")
    .select("created_at")
    .eq("user_id", user.user_id)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest && Date.now() - new Date(latest.created_at).getTime() < RESEND_COOLDOWN_SECONDS * 1000) return;

  // Only the newest code is ever valid.
  await admin.from("password_reset_codes").delete().eq("user_id", user.user_id);

  const id = crypto.randomUUID();
  const code = generateCode();
  const { error } = await admin.from("password_reset_codes").insert({
    id,
    user_id: user.user_id,
    email,
    code_hash: hash("code", id, code),
    attempts: 0,
    expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
    verified_at: null,
    reset_token_hash: null,
    consumed_at: null,
  });
  if (error) throw new ResetError("We could not start the password reset. Please try again.");

  try {
    await sendPasswordResetCodeEmail({ to: email, code, minutesValid: CODE_MINUTES });
  } catch (mailError) {
    await admin.from("password_reset_codes").delete().eq("id", id);
    console.error("Password reset email failed:", mailError instanceof Error ? mailError.message : mailError);
    throw new ResetError("We could not send the code email. Please try again in a moment.");
  }
}

/** Step 2: check the code. Returns a one-time token that authorises step 3. */
export async function verifyResetCode(rawEmail: string, rawCode: string): Promise<{ token: string }> {
  const email = normalizeEmail(rawEmail);
  const code = normalizeCode(rawCode);
  const invalid = new ResetError("That code is incorrect or has expired. Check your email and try again.");
  if (code.length !== CODE_LENGTH) throw invalid;

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("password_reset_codes")
    .select("*")
    .ilike("email", email.replace(/[%_]/g, "\\$&"))
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row || new Date(row.expires_at).getTime() < Date.now()) throw invalid;
  if (row.attempts >= MAX_ATTEMPTS) {
    await admin.from("password_reset_codes").delete().eq("id", row.id);
    throw new ResetError("Too many incorrect attempts. Please request a new code.");
  }

  if (!matches(row.code_hash, hash("code", row.id, code))) {
    await admin.from("password_reset_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    const left = MAX_ATTEMPTS - row.attempts - 1;
    throw new ResetError(left > 0 ? `Incorrect code. ${left} ${left === 1 ? "attempt" : "attempts"} left.` : "Too many incorrect attempts. Please request a new code.");
  }

  const token = randomBytes(32).toString("hex");
  await admin
    .from("password_reset_codes")
    .update({
      verified_at: new Date().toISOString(),
      reset_token_hash: hash("token", row.id, token),
      expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
    })
    .eq("id", row.id);
  return { token };
}

/** Step 3: set the new password after a verified code. */
export async function completePasswordReset(rawEmail: string, token: string, password: string): Promise<void> {
  if (!isStrongPassword(password)) throw new ResetError("Password does not meet all the requirements.");
  const email = normalizeEmail(rawEmail);
  const expired = new ResetError("Your reset session has expired. Please start again.");

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("password_reset_codes")
    .select("*")
    .ilike("email", email.replace(/[%_]/g, "\\$&"))
    .is("consumed_at", null)
    .not("verified_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row || !row.reset_token_hash || new Date(row.expires_at).getTime() < Date.now()) throw expired;
  if (!matches(row.reset_token_hash, hash("token", row.id, token))) throw expired;

  const { error } = await admin.auth.admin.updateUserById(row.user_id, { password });
  if (error) {
    if (/same|different/i.test(error.message)) throw new ResetError("Choose a password you have not used before.");
    throw new ResetError("We could not save your new password. Please try again.");
  }
  await admin.from("password_reset_codes").delete().eq("user_id", row.user_id);
}
