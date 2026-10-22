"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

/**
 * Server Action to sign in a user with email and password.
 * On success, refreshes the layout cache and redirects to `/dashboard`.
 * On failure, redirects to `/login` with an error message query parameter.
 */
export async function login(formData: FormData): Promise<void> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    redirect("/login?error=" + encodeURIComponent("Email and password are required."));
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // Clear cache and navigate to the protected dashboard
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Server Action to log out the active user and clear session cookies.
 * On completion, clears the layout cache and redirects to `/login`.
 */
export async function logout(): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Supabase signOut error:", error.message);
  }

  // Invalidate router cache and navigate to login
  revalidatePath("/", "layout");
  redirect("/login");
}
