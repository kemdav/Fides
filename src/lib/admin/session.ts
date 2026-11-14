import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ADMIN_ACCOUNTS, findAdminAccount, type AdminAccount } from "./local-accounts";

const COOKIE = "fides_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

/** Signing key: ADMIN_SESSION_SECRET if set, otherwise derived from the credentials + server secret. */
function secret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ??
    `fides-admin|${ADMIN_ACCOUNTS.map((a) => a.id + a.password).join("|")}|${process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`
  );
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
