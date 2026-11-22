import "server-only";
import { scryptSync, timingSafeEqual } from "node:crypto";

/**
 * ADMIN ACCOUNTS (local, NOT in Supabase)
 * ---------------------------------------
 * Accounts come from the ADMIN_ACCOUNTS environment variable, a JSON array:
 *   [{"id":"admin-1","username":"you@example.com","displayName":"Your Name","passwordHash":"scrypt:..."}]
 * Create each passwordHash with: node scripts/hash-admin-password.mjs "<password>"
 * Passwords are never stored in the repo. Restart the server after changing the variable.
 *
 * Only the admin login page (/admin/login) checks these; a match opens the Admin page.
 * The general login (/login) never accepts them.
 */
export type AdminAccount = {
  id: string;
  /** What the admin types in the email/username field (compared case-insensitively). */
  username: string;
  displayName: string;
};

type StoredAccount = AdminAccount & { passwordHash: string };

function loadAccounts(): StoredAccount[] {
  const raw = process.env.ADMIN_ACCOUNTS;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StoredAccount =>
        !!item &&
        typeof item.id === "string" &&
        typeof item.username === "string" &&
        typeof item.displayName === "string" &&
        typeof item.passwordHash === "string" &&
        item.passwordHash.split(":").length === 3
    );
  } catch {
    return [];
  }
}

function hashMatches(password: string, stored: string): boolean {
  const [, saltHex, hashHex] = stored.split(":");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const DUMMY_HASH = `scrypt:${"00".repeat(16)}:${"00".repeat(64)}`;

function toPublic({ id, username, displayName }: StoredAccount): AdminAccount {
  return { id, username, displayName };
}

export function verifyAdminCredentials(username: string, password: string): AdminAccount | null {
  const name = username.trim().toLowerCase();
  const account = loadAccounts().find((item) => item.username.toLowerCase() === name);
  // Always run one hash so timing does not reveal whether the username exists.
  const ok = hashMatches(password, account?.passwordHash ?? DUMMY_HASH);
  return account && ok ? toPublic(account) : null;
}

export function findAdminAccount(id: string): AdminAccount | null {
  const account = loadAccounts().find((item) => item.id === id);
  return account ? toPublic(account) : null;
}

