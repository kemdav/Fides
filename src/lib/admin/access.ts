import "server-only";
import { notFound } from "next/navigation";
import { getServerEnv } from "@/lib/env";

export function isAdminPortalOpen(): boolean {
  return getServerEnv().ADMIN_PORTAL_PUBLIC_ACCESS;
}

export function requireAdminPortal(): void {
  if (!isAdminPortalOpen()) notFound();
}

export function assertAdminAction(): void {
  if (!isAdminPortalOpen()) {
    throw new Error("The admin portal is not enabled.");
  }
}
