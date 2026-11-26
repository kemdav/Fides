import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/access";
import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = {
  title: "Admin log in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/admin");
  return <AdminLoginForm />;
}
