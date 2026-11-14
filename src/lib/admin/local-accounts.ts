import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * ADMIN ACCOUNTS (local, NOT in Supabase)
 * ---------------------------------------
 * This is the single place where administrator credentials live.
 * To add, remove or change an admin, edit the list below and restart the server.
 *
 * The login page (/login) checks these first; a match opens the Admin page,
 * anything else continues through the normal Supabase business-owner login.
 */
export type AdminAccount = {
  id: string;
  /** What the admin types in the email/username field (compared case-insensitively). */
  username: string;
  password: string;
  displayName: string;
};

export const ADMIN_ACCOUNTS: readonly AdminAccount[] = [
  { id: "admin-1", username: "Fides.adminacc1.com", password: "123QWEasd", displayName: "Fides Admin 1" },
  { id: "admin-2", username: "Fides.adminacc2.com", password: "123QWEasd", displayName: "Fides Admin 2" },
];

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyAdminCredentials(username: string, password: string): AdminAccount | null {
  const name = username.trim().toLowerCase();
  let match: AdminAccount | null = null;
  for (const account of ADMIN_ACCOUNTS) {
    // Check every account so timing does not reveal which username exists.
    const nameOk = safeEqual(account.username.toLowerCase(), name);
    const passOk = safeEqual(account.password, password);
    if (nameOk && passOk) match = account;
  }
  return match;
}

export function findAdminAccount(id: string): AdminAccount | null {
  return ADMIN_ACCOUNTS.find((account) => account.id === id) ?? null;
}
