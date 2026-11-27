"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifyAdminCredentials } from "@/lib/admin/local-accounts";
import { createAdminSession } from "@/lib/admin/session";
import { limitByClient, MINUTES } from "@/lib/rate-limit";

export type AdminLoginState = {
  status: "idle" | "field-error" | "invalid" | "rate-limited";
  email: string;
  fieldErrors?: { email?: string; password?: string };
};

export async function adminLogin(_previous: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: NonNullable<AdminLoginState["fieldErrors"]> = {};
  if (!email) fieldErrors.email = "Enter your administrator email.";
  if (!password) fieldErrors.password = "Enter your password.";
  if (fieldErrors.email || fieldErrors.password) return { status: "field-error", email, fieldErrors };

  if (
    await limitByClient("admin-login-ip", { limit: 12, windowMs: MINUTES }) ||
    await limitByClient("admin-login", { limit: 6, windowMs: MINUTES }, email)
  ) return { status: "rate-limited", email };

  const account = verifyAdminCredentials(email, password);
  if (!account) return { status: "invalid", email };

  await createAdminSession(account);
  revalidatePath("/", "layout");
  redirect("/admin");
}
