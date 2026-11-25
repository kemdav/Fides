"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type {
  ActionResult,
  CreateAddonInput,
  CreatePackageInput,
  CreateServiceInput,
  UpdateAddonInput,
  UpdatePackageInput,
  UpdateServiceInput,
} from "@/types/services";

/**
 * Revalidates merchant dashboard and public storefront paths.
 */
async function revalidateServicePaths(tenantSlug?: string) {
  if (tenantSlug) {
    revalidatePath(`/${tenantSlug}`, "page");
    revalidatePath(`/${tenantSlug}/services`, "page");
    revalidatePath(`/${tenantSlug}/dashboard`, "layout");
    revalidatePath(`/${tenantSlug}/dashboard/services`, "page");
  }
  revalidatePath("/[slug]", "page");
  revalidatePath("/[slug]/services", "page");
  revalidatePath("/[slug]/dashboard/services", "page");
  revalidatePath("/[slug]/dashboard", "layout");
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${base || "service"}-${suffix}`;
}

/**
 * Verifies that the authenticated user is an owner, admin, or platform admin of the given tenant.
 */
async function verifyMerchantPermission(tenantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { authorized: false, error: "Authentication required.", supabase, user: null, slug: undefined };
  }

  // Fetch tenant info to resolve slug
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, slug")
    .eq("id", tenantId)
    .single();

  if (!tenant) {
    return { authorized: false, error: "Tenant not found.", supabase, user, slug: undefined };
  }

  // Check profile role & tenant membership
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("profile_id", user.id)
    .maybeSingle();

  const isOwnerOrAdmin =
    membership && ["owner", "admin"].includes(membership.role);
  const isDirectProfileOwner =
    profile?.tenant_id === tenantId &&
    ["owner", "admin"].includes(profile.role || "");

  if (!isOwnerOrAdmin && !isDirectProfileOwner) {
    return { authorized: false, error: "Unauthorized. Merchant admin privileges required.", supabase, user, slug: tenant.slug };
  }

  return { authorized: true, error: null, supabase, user, slug: tenant.slug };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service CRUD Actions
// ─────────────────────────────────────────────────────────────────────────────

export async function createServiceAction(
  input: CreateServiceInput
): Promise<ActionResult<{ id: string }>> {
  const check = await verifyMerchantPermission(input.tenantId);
  if (!check.authorized || !check.supabase) {
    return { success: false, error: check.error || "Unauthorized" };
  }
  const supabase = check.supabase;

  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    return { success: false, error: "Service title is required." };
  }
  if (input.durationMinutes <= 0) {
    return { success: false, error: "Duration must be greater than 0 minutes." };
  }
  if (input.priceCents < 0) {
    return { success: false, error: "Price cannot be negative." };
  }

  // Verify staff members belong to tenant
  const staffIds = input.staffIds || [];
  if (staffIds.length > 0) {
    const { data: validStaff } = await supabase
      .from("staff_members")
      .select("id")
      .eq("tenant_id", input.tenantId)
      .in("id", staffIds);

    const validSet = new Set(validStaff?.map((s) => s.id) || []);
    for (const sid of staffIds) {
      if (!validSet.has(sid)) {
        return { success: false, error: "Invalid staff member assignment." };
      }
    }
  }

  const slug = slugify(trimmedName);

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .insert({
      tenant_id: input.tenantId,
      name: trimmedName,
      slug,
      description: input.description?.trim() || null,
      duration_minutes: input.durationMinutes,
      buffer_minutes: input.bufferMinutes ?? 0,
      price_cents: input.priceCents,
      category_id: input.categoryId || null,
      active: input.active ?? true,
      is_archived: false,
    })
    .select("id")
    .single();

  if (serviceError || !service) {
    return { success: false, error: serviceError?.message || "Failed to create service." };
  }

  // Insert assigned staff
  if (staffIds.length > 0) {
    const staffSkills = staffIds.map((sid) => ({
      tenant_id: input.tenantId,
      service_id: service.id,
      staff_id: sid,
    }));
    await supabase.from("staff_service_skills").insert(staffSkills);
  }

  await revalidateServicePaths(check.slug);
  return { success: true, message: "Service created successfully.", data: { id: service.id } };
}

export async function updateServiceAction(
  input: UpdateServiceInput
): Promise<ActionResult> {
  const check = await verifyMerchantPermission(input.tenantId);
  if (!check.authorized || !check.supabase) {
    return { success: false, error: check.error || "Unauthorized" };
  }
  const supabase = check.supabase;

  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    return { success: false, error: "Service title is required." };
  }
  if (input.durationMinutes <= 0) {
    return { success: false, error: "Duration must be greater than 0 minutes." };
  }
  if (input.priceCents < 0) {
    return { success: false, error: "Price cannot be negative." };
  }

  const staffIds = input.staffIds || [];
  if (staffIds.length > 0) {
    const { data: validStaff } = await supabase
      .from("staff_members")
      .select("id")
      .eq("tenant_id", input.tenantId)
      .in("id", staffIds);

    const validSet = new Set(validStaff?.map((s) => s.id) || []);
    for (const sid of staffIds) {
      if (!validSet.has(sid)) {
        return { success: false, error: "Invalid staff member assignment." };
      }
    }
  }

  const { error: updateError } = await supabase
    .from("services")
    .update({
      name: trimmedName,
      description: input.description?.trim() || null,
      duration_minutes: input.durationMinutes,
      buffer_minutes: input.bufferMinutes ?? 0,
      price_cents: input.priceCents,
      category_id: input.categoryId || null,
      ...(typeof input.active === "boolean" ? { active: input.active } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("tenant_id", input.tenantId);

  if (updateError) {
    return { success: false, error: updateError.message || "Failed to update service." };
  }

  // Sync staff members
  await supabase
    .from("staff_service_skills")
    .delete()
    .eq("service_id", input.id)
    .eq("tenant_id", input.tenantId);

  if (staffIds.length > 0) {
    const staffSkills = staffIds.map((sid) => ({
      tenant_id: input.tenantId,
      service_id: input.id,
      staff_id: sid,
    }));
    await supabase.from("staff_service_skills").insert(staffSkills);
  }

  await revalidateServicePaths(check.slug);
  return { success: true, message: "Service updated successfully." };
}

export async function toggleServiceStatusAction(
  serviceId: string,
  tenantId: string,
  active: boolean
): Promise<ActionResult> {
  const check = await verifyMerchantPermission(tenantId);
  if (!check.authorized || !check.supabase) {
    return { success: false, error: check.error || "Unauthorized" };
  }

  const { error } = await check.supabase
    .from("services")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", serviceId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { success: false, error: error.message || "Failed to update service status." };
  }

  await revalidateServicePaths(check.slug);
  return {
    success: true,
    message: active ? "Service activated and visible to clients." : "Service deactivated.",
  };
}

export async function archiveServiceAction(
  serviceId: string,
  tenantId: string
): Promise<ActionResult> {
  const check = await verifyMerchantPermission(tenantId);
  if (!check.authorized || !check.supabase) {
    return { success: false, error: check.error || "Unauthorized" };
  }

  const { error } = await check.supabase
    .from("services")
    .update({
      is_archived: true,
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { success: false, error: error.message || "Failed to archive service." };
  }

  await revalidateServicePaths(check.slug);
  return { success: true, message: "Service archived successfully." };
}

export async function unarchiveServiceAction(
  serviceId: string,
  tenantId: string
): Promise<ActionResult> {
  const check = await verifyMerchantPermission(tenantId);
  if (!check.authorized || !check.supabase) {
    return { success: false, error: check.error || "Unauthorized" };
  }

  const { error } = await check.supabase
    .from("services")
    .update({
      is_archived: false,
      active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { success: false, error: error.message || "Failed to restore service." };
  }

  await revalidateServicePaths(check.slug);
  return { success: true, message: "Service restored successfully." };
}

export async function deleteServiceAction(
  serviceId: string,
  tenantId: string
): Promise<ActionResult> {
  const check = await verifyMerchantPermission(tenantId);
  if (!check.authorized || !check.supabase) {
    return { success: false, error: check.error || "Unauthorized" };
  }
  const supabase = check.supabase;

  // Check if service is referenced by any appointment
  const { count: apptCount, error: apptCheckError } = await supabase
    .from("appointment_services")
    .select("*", { count: "exact", head: true })
    .eq("service_id", serviceId);

  if (apptCheckError) {
    return { success: false, error: "Failed to check appointment references." };
  }

  if (apptCount && apptCount > 0) {
    return {
      success: false,
      error:
        "This service is linked to existing appointments and cannot be permanently deleted. You can archive it instead to remove it from your booking menu without affecting past appointments.",
      isLinkedToAppointments: true,
    };
  }

  // Check if service is referenced in any packages
  const { count: pkgCount } = await supabase
    .from("package_items")
    .select("*", { count: "exact", head: true })
    .eq("service_id", serviceId);

  if (pkgCount && pkgCount > 0) {
    return {
      success: false,
      error:
        "This service is bundled in one or more active packages. Please remove it from those packages or archive the service instead.",
    };
  }

  // Delete staff skills & add-on links first
  await supabase
    .from("staff_service_skills")
    .delete()
    .eq("service_id", serviceId)
    .eq("tenant_id", tenantId);

  await supabase
    .from("service_addon_links")
    .delete()
    .eq("service_id", serviceId)
    .eq("tenant_id", tenantId);

  const { error: deleteError } = await supabase
    .from("services")
    .delete()
    .eq("id", serviceId)
    .eq("tenant_id", tenantId);

  if (deleteError) {
    return { success: false, error: deleteError.message || "Failed to delete service." };
  }

  await revalidateServicePaths(check.slug);
  return { success: true, message: "Service permanently deleted." };
}

// ─────────────────────────────────────────────────────────────────────────────
// Packages CRUD Actions
// ─────────────────────────────────────────────────────────────────────────────

export async function createPackageAction(
  input: CreatePackageInput
): Promise<ActionResult<{ id: string }>> {
  const check = await verifyMerchantPermission(input.tenantId);
  if (!check.authorized || !check.supabase) {
    return { success: false, error: check.error || "Unauthorized" };
  }
  const supabase = check.supabase;

  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    return { success: false, error: "Package name is required." };
  }
  if (input.priceCents < 0) {
    return { success: false, error: "Package price cannot be negative." };
  }
  if (!input.serviceIds || input.serviceIds.length === 0) {
    return { success: false, error: "At least one service must be bundled in the package." };
  }

  // Verify service IDs belong to tenant
  const { data: validServices } = await supabase
    .from("services")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .in("id", input.serviceIds);

  const validSet = new Set(validServices?.map((s) => s.id) || []);
  for (const sid of input.serviceIds) {
    if (!validSet.has(sid)) {
      return { success: false, error: "Invalid bundled service selection." };
    }
  }

  const slug = slugify(trimmedName);

  const { data: pkg, error: pkgError } = await supabase
    .from("packages")
    .insert({
      tenant_id: input.tenantId,
      name: trimmedName,
      slug,
      description: input.description?.trim() || null,
      price_cents: input.priceCents,
      duration_minutes: input.durationMinutes || 0,
      active: input.active ?? true,
      is_archived: false,
    })
    .select("id")
    .single();

  if (pkgError || !pkg) {
    return { success: false, error: pkgError?.message || "Failed to create package." };
  }

  // Insert package items
  const items = input.serviceIds.map((serviceId) => ({
    tenant_id: input.tenantId,
    package_id: pkg.id,
    service_id: serviceId,
    quantity: 1,
  }));
  await supabase.from("package_items").insert(items);

  await revalidateServicePaths(check.slug);
  return { success: true, message: "Package created successfully.", data: { id: pkg.id } };
}

export async function updatePackageAction(
  input: UpdatePackageInput
): Promise<ActionResult> {
  const check = await verifyMerchantPermission(input.tenantId);
  if (!check.authorized || !check.supabase) {
    return { success: false, error: check.error || "Unauthorized" };
  }
  const supabase = check.supabase;

  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    return { success: false, error: "Package name is required." };
  }
  if (input.priceCents < 0) {
    return { success: false, error: "Package price cannot be negative." };
  }
  if (!input.serviceIds || input.serviceIds.length === 0) {
    return { success: false, error: "At least one service must be bundled in the package." };
  }

  const { data: validServices } = await supabase
    .from("services")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .in("id", input.serviceIds);

  const validSet = new Set(validServices?.map((s) => s.id) || []);
  for (const sid of input.serviceIds) {
    if (!validSet.has(sid)) {
      return { success: false, error: "Invalid bundled service selection." };
    }
  }

  const { error: updateError } = await supabase
    .from("packages")
    .update({
      name: trimmedName,
      description: input.description?.trim() || null,
      price_cents: input.priceCents,
      duration_minutes: input.durationMinutes || 0,
      ...(typeof input.active === "boolean" ? { active: input.active } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("tenant_id", input.tenantId);

  if (updateError) {
    return { success: false, error: updateError.message || "Failed to update package." };
  }

  // Re-sync package items
  await supabase
    .from("package_items")
    .delete()
    .eq("package_id", input.id)
    .eq("tenant_id", input.tenantId);

  const items = input.serviceIds.map((serviceId) => ({
    tenant_id: input.tenantId,
    package_id: input.id,
    service_id: serviceId,
    quantity: 1,
  }));
  await supabase.from("package_items").insert(items);

  await revalidateServicePaths(check.slug);
  return { success: true, message: "Package updated successfully." };
}

export async function togglePackageStatusAction(
  packageId: string,
  tenantId: string,
  active: boolean
): Promise<ActionResult> {
  const check = await verifyMerchantPermission(tenantId);
  if (!check.authorized || !check.supabase) {
    return { success: false, error: check.error || "Unauthorized" };
  }

  const { error } = await check.supabase
    .from("packages")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", packageId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { success: false, error: error.message || "Failed to update package status." };
  }

  await revalidateServicePaths(check.slug);
  return {
    success: true,
    message: active ? "Package activated." : "Package deactivated.",
  };
}

export async function archivePackageAction(
  packageId: string,
  tenantId: string
): Promise<ActionResult> {
  const check = await verifyMerchantPermission(tenantId);
  if (!check.authorized || !check.supabase) {
    return { success: false, error: check.error || "Unauthorized" };
  }

  const { error } = await check.supabase
    .from("packages")
    .update({
      is_archived: true,
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", packageId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { success: false, error: error.message || "Failed to archive package." };
  }

  await revalidateServicePaths(check.slug);
  return { success: true, message: "Package archived successfully." };
}

export async function unarchivePackageAction(
  packageId: string,
  tenantId: string
): Promise<ActionResult> {
  const check = await verifyMerchantPermission(tenantId);
  if (!check.authorized || !check.supabase) {
    return { success: false, error: check.error || "Unauthorized" };
  }

  const { error } = await check.supabase
    .from("packages")
    .update({
      is_archived: false,
      active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", packageId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { success: false, error: error.message || "Failed to restore package." };
  }

  await revalidateServicePaths(check.slug);
  return { success: true, message: "Package restored successfully." };
}

export async function deletePackageAction(
  packageId: string,
  tenantId: string
): Promise<ActionResult> {
  const check = await verifyMerchantPermission(tenantId);
  if (!check.authorized || !check.supabase) {
    return { success: false, error: check.error || "Unauthorized" };
  }

  // package_items cascade deletes with package
  const { error } = await check.supabase
    .from("packages")
    .delete()
    .eq("id", packageId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { success: false, error: error.message || "Failed to delete package." };
  }

  await revalidateServicePaths(check.slug);
  return { success: true, message: "Package permanently deleted." };
}

// ─────────────────────────────────────────────────────────────────────────────
// Add-ons CRUD Actions
// ─────────────────────────────────────────────────────────────────────────────

export async function createAddonAction(
  input: CreateAddonInput
): Promise<ActionResult<{ id: string }>> {
  const check = await verifyMerchantPermission(input.tenantId);
  if (!check.authorized || !check.supabase) {
    return { success: false, error: check.error || "Unauthorized" };
  }
  const supabase = check.supabase;

  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    return { success: false, error: "Add-on name is required." };
  }
  if (input.priceCents < 0) {
    return { success: false, error: "Add-on price cannot be negative." };
  }
  if (input.durationMinutes < 0) {
    return { success: false, error: "Duration cannot be negative." };
  }

  const { data: addon, error: addonError } = await supabase
    .from("service_addons")
    .insert({
      tenant_id: input.tenantId,
      name: trimmedName,
      description: input.description?.trim() || null,
      price_cents: input.priceCents,
      duration_minutes: input.durationMinutes,
      active: input.active ?? true,
      is_archived: false,
    })
    .select("id")
    .single();

  if (addonError || !addon) {
    return { success: false, error: addonError?.message || "Failed to create add-on." };
  }

  // Link services if provided
  const serviceIds = input.applicableServiceIds || [];
  if (serviceIds.length > 0) {
    const links = serviceIds.map((sid) => ({
      tenant_id: input.tenantId,
      addon_id: addon.id,
      service_id: sid,
    }));
    await supabase.from("service_addon_links").insert(links);
  }

  await revalidateServicePaths(check.slug);
  return { success: true, message: "Add-on created successfully.", data: { id: addon.id } };
}

export async function updateAddonAction(
  input: UpdateAddonInput
): Promise<ActionResult> {
  const check = await verifyMerchantPermission(input.tenantId);
  if (!check.authorized || !check.supabase) {
    return { success: false, error: check.error || "Unauthorized" };
  }
  const supabase = check.supabase;

  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    return { success: false, error: "Add-on name is required." };
  }
  if (input.priceCents < 0) {
    return { success: false, error: "Add-on price cannot be negative." };
  }
  if (input.durationMinutes < 0) {
    return { success: false, error: "Duration cannot be negative." };
  }

  const { error: updateError } = await supabase
    .from("service_addons")
    .update({
      name: trimmedName,
      description: input.description?.trim() || null,
      price_cents: input.priceCents,
      duration_minutes: input.durationMinutes,
      ...(typeof input.active === "boolean" ? { active: input.active } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("tenant_id", input.tenantId);

  if (updateError) {
    return { success: false, error: updateError.message || "Failed to update add-on." };
  }

  // Re-sync service links
  await supabase
    .from("service_addon_links")
    .delete()
    .eq("addon_id", input.id)
    .eq("tenant_id", input.tenantId);

  const serviceIds = input.applicableServiceIds || [];
  if (serviceIds.length > 0) {
    const links = serviceIds.map((sid) => ({
      tenant_id: input.tenantId,
      addon_id: input.id,
      service_id: sid,
    }));
    await supabase.from("service_addon_links").insert(links);
  }

  await revalidateServicePaths(check.slug);
  return { success: true, message: "Add-on updated successfully." };
}

export async function toggleAddonStatusAction(
  addonId: string,
  tenantId: string,
  active: boolean
): Promise<ActionResult> {
  const check = await verifyMerchantPermission(tenantId);
  if (!check.authorized || !check.supabase) {
    return { success: false, error: check.error || "Unauthorized" };
  }

  const { error } = await check.supabase
    .from("service_addons")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", addonId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { success: false, error: error.message || "Failed to update add-on status." };
  }

  await revalidateServicePaths(check.slug);
  return {
    success: true,
    message: active ? "Add-on activated." : "Add-on deactivated.",
  };
}

export async function archiveAddonAction(
  addonId: string,
  tenantId: string
): Promise<ActionResult> {
  const check = await verifyMerchantPermission(tenantId);
  if (!check.authorized || !check.supabase) {
    return { success: false, error: check.error || "Unauthorized" };
  }

  const { error } = await check.supabase
    .from("service_addons")
    .update({
      is_archived: true,
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", addonId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { success: false, error: error.message || "Failed to archive add-on." };
  }

  await revalidateServicePaths(check.slug);
  return { success: true, message: "Add-on archived successfully." };
}

export async function unarchiveAddonAction(
  addonId: string,
  tenantId: string
): Promise<ActionResult> {
  const check = await verifyMerchantPermission(tenantId);
  if (!check.authorized || !check.supabase) {
    return { success: false, error: check.error || "Unauthorized" };
  }

  const { error } = await check.supabase
    .from("service_addons")
    .update({
      is_archived: false,
      active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", addonId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { success: false, error: error.message || "Failed to restore add-on." };
  }

  await revalidateServicePaths(check.slug);
  return { success: true, message: "Add-on restored successfully." };
}

export async function deleteAddonAction(
  addonId: string,
  tenantId: string
): Promise<ActionResult> {
  const check = await verifyMerchantPermission(tenantId);
  if (!check.authorized || !check.supabase) {
    return { success: false, error: check.error || "Unauthorized" };
  }

  // service_addon_links cascades on delete
  const { error } = await check.supabase
    .from("service_addons")
    .delete()
    .eq("id", addonId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { success: false, error: error.message || "Failed to delete add-on." };
  }

  await revalidateServicePaths(check.slug);
  return { success: true, message: "Add-on permanently deleted." };
}
