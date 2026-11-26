import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { findAdminAccount, type AdminAccount } from "./local-accounts";

const COOKIE = "fides_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

let devSecret: string | null = null;

/** Signing key: ADMIN_SESSION_SECRET (at least 32 characters). Required in production. */
function secret(): string {
  const configured = process.env.ADMIN_SESSION_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_SESSION_SECRET must be set to a random string of at least 32 characters.");
  }
  // development only: a throwaway key, admin sessions end when the server restarts
  devSecret ??= randomBytes(32).toString("hex");
  return devSecret;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export async function createAdminSession(account: AdminAccount): Promise<void> {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${account.id}.${expires}`;
  const store = await cookies();
  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function getAdminSession(): Promise<AdminAccount | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [id, expires, signature] = parts;
  const expected = sign(`${id}.${expires}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!(Number(expires) > Date.now())) return null;
  return findAdminAccount(id);
}
