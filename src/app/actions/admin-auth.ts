"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { limitByClient, MINUTES } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export type AdminLoginState = {
  status: "idle" | "field-error" | "invalid" | "rate-limited";
  email: string;
  fieldErrors?: { email?: string; password?: string };
};

const credentials = z.object({
  email: z.string().trim().pipe(z.email("Enter your administrator email.")),
  password: z.string().min(1, "Enter your password.").max(200, "Enter your password."),
});

export async function adminLogin(_previous: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const email = String(formData.get("email") ?? "").trim();

  const parsed = credentials.safeParse({ email, password: String(formData.get("password") ?? "") });
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors;
    return { status: "field-error", email, fieldErrors: { email: errors.email?.[0], password: errors.password?.[0] } };
  }

  if (await limitByClient("admin-login", { limit: 6, windowMs: MINUTES }, email)) return { status: "rate-limited", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { status: "invalid", email };

  // a valid password is not enough: the account must be an active platform admin.
  // the answer is the same either way so this page never confirms a merchant account exists
  const { data: admin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .eq("active", true)
    .maybeSingle();
  if (!admin) {
    await supabase.auth.signOut({ scope: "local" });
    return { status: "invalid", email };
  }

  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/admin/login");
}
