import "server-only";
import { redirect } from "next/navigation";
import type { AdminAccount } from "./local-accounts";
import { getAdminSession } from "./session";

/** Admin pages: signed-in local admin required, otherwise back to the login page. */
export async function requireAdminPortal(): Promise<AdminAccount> {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return session;
}

/** Admin server actions: refuse to run without a valid admin session. */
export async function assertAdminAction(): Promise<AdminAccount> {
  const session = await getAdminSession();
  if (!session) throw new Error("Your admin session has expired. Please log in again.");
  return session;
}
