"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifyAdminCredentials } from "@/lib/admin/local-accounts";
import { createAdminSession } from "@/lib/admin/session";

export type AdminLoginState = {
  status: "idle" | "field-error" | "invalid" | "rate-limited";
  email: string;
  fieldErrors?: { email?: string; password?: string };
};

const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;
const attempts = new Map<string, { count: number; lockedUntil: number }>();

export async function adminLogin(_previous: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: NonNullable<AdminLoginState["fieldErrors"]> = {};
  if (!email) fieldErrors.email = "Enter your administrator email.";
  if (!password) fieldErrors.password = "Enter your password.";
  if (fieldErrors.email || fieldErrors.password) return { status: "field-error", email, fieldErrors };

  const key = email.toLowerCase();
  const record = attempts.get(key);
  if (record && record.lockedUntil > Date.now()) return { status: "rate-limited", email };

  const account = verifyAdminCredentials(email, password);
  if (!account) {
    const count = (record && record.lockedUntil === 0 ? record.count : 0) + 1;
    attempts.set(key, { count, lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0 });
    return { status: count >= MAX_ATTEMPTS ? "rate-limited" : "invalid", email };
  }

  attempts.delete(key);
  await createAdminSession(account);
  revalidatePath("/", "layout");
  redirect("/admin");
}
