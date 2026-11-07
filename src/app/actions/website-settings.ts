"use server";

import dns from "node:dns/promises";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  websiteSettingsSchema,
  subdomainSchema,
  customDomainSchema,
  assetTypeSchema,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES,
} from "@/lib/validations/website-settings";
import type { WebsiteSettingsData } from "@/components/merchant/website-settings/types";

export type ActionResult<T = unknown> =
  | { success: true; message: string; data?: T; isDemo?: boolean }
  | { success: false; error: string };

/**
 * Helper: Authenticates user, verifies membership, and enforces Owner / Admin role.
 */
async function authenticateOwner(tenantIdParam?: string): Promise<
  | { success: true; userId: string; tenantId: string; role: string; isDemo: false }
  | { success: false; error: string; statusCode: number; isDemo?: boolean }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    return {
      success: false,
      error: "Authentication required.",
      statusCode: 401,
      isDemo: true,
    };
  }

  // 1. Check user platform profile role & tenant
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, tenant_id")
    .eq("id", user.id)
    .single();

  const isPlatformAdmin = profile?.role === "admin";
  const defaultTenantId = profile?.tenant_id;
  const targetTenantId = tenantIdParam || defaultTenantId;

  if (!targetTenantId) {
    return {
      success: false,
      error: "No active tenant associated with this account.",
      statusCode: 403,
    };
  }

  if (isPlatformAdmin) {
    return {
      success: true,
      userId: user.id,
      tenantId: targetTenantId,
      role: "admin",
      isDemo: false,
    };
  }

  // 2. Query tenant_memberships to check role for target tenant
  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", targetTenantId)
    .eq("profile_id", user.id)
    .maybeSingle();

  const userRole = membership?.role ?? profile?.role ?? "staff";

  // Strict Role-Based Access Control: Only 'owner' or platform 'admin'
  if (userRole !== "owner" && userRole !== "admin") {
    return {
      success: false,
      error: "Access Denied: Only business owners have permission to modify website settings.",
      statusCode: 403,
    };
  }

  return {
    success: true,
    userId: user.id,
    tenantId: targetTenantId,
    role: userRole,
    isDemo: false,
  };
}

/**
 * Action: Fetches both live published settings and working draft for a tenant.
 */
export async function getWebsiteSettingsAction(
  tenantIdParam?: string
): Promise<ActionResult<{ live: Partial<WebsiteSettingsData>; draft: Partial<WebsiteSettingsData> | null }>> {
  const auth = await authenticateOwner(tenantIdParam);
  if (!auth.success) {
    if (auth.isDemo) {
      return {
        success: true,
        message: "Demo mode active.",
        isDemo: true,
        data: { live: {}, draft: null },
      };
    }
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, slug, brand_color, secondary_color, accent_color, address, phone, timezone")
    .eq("id", auth.tenantId)
    .single();

  const { data: settings } = await supabase
    .from("tenant_settings")
    .select("*")
    .eq("tenant_id", auth.tenantId)
    .maybeSingle();

  const liveData: Partial<WebsiteSettingsData> = {
    businessName: settings?.display_name || tenant?.name || "Bella Vita Salon & Spa",
    subdomain: tenant?.slug || "bellavita",
    mainColor: tenant?.brand_color || "#FFFFEB",
    secondaryColor: tenant?.secondary_color || "#ADD8E6",
    accentColor: tenant?.accent_color || "#CC5000",
    headline: settings?.headline || settings?.tagline || "A little time for yourself.",
    supportingMessage: settings?.supporting_message || "",
    about: settings?.about || "",
    streetAddress: tenant?.address || "",
    phoneNumber: tenant?.phone || "",
    timeZone: tenant?.timezone || "Asia/Manila (UTC+08:00)",
    customDomain: settings?.custom_domain || "",
    isDomainVerified: settings?.custom_domain_status === "active",
    pageTitle: settings?.page_title || "",
    metaDescription: settings?.meta_description || "",
    allowIndexing: settings?.allow_indexing ?? true,
    socialTitle: settings?.social_title || "",
    socialDescription: settings?.social_description || "",
  };

  const draftData = (settings?.draft_settings as Partial<WebsiteSettingsData>) || null;

  return {
    success: true,
    message: "Settings loaded successfully.",
    data: { live: liveData, draft: draftData },
  };
}

/**
 * Action: Saves working draft changes without altering the live website.
 */
export async function saveWebsiteDraftAction(
  data: WebsiteSettingsData,
  tenantIdParam?: string
): Promise<ActionResult> {
  const parsed = websiteSettingsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid settings." };
  }

  const auth = await authenticateOwner(tenantIdParam);
  if (!auth.success) {
    if (auth.isDemo) {
      return { success: true, message: "Draft saved (Demo mode: session retained).", isDemo: true };
    }
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("tenant_settings").upsert(
    {
      tenant_id: auth.tenantId,
      draft_settings: parsed.data,
    },
    { onConflict: "tenant_id" }
  );

  if (error) {
    return { success: false, error: `Failed to save draft: ${error.message}` };
  }

  revalidatePath("/dashboard/settings/website");
  return { success: true, message: "Draft saved successfully." };
}

/**
 * Action: Commits draft settings to the live customer-facing website.
 */
export async function publishWebsiteSettingsAction(
  data?: WebsiteSettingsData,
  tenantIdParam?: string
): Promise<ActionResult> {
  const auth = await authenticateOwner(tenantIdParam);
  if (!auth.success) {
    if (auth.isDemo) {
      return { success: true, message: "Website published (Demo mode).", isDemo: true };
    }
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  // If payload passed, validate it; otherwise use saved draft
  let toPublish = data;
  if (!toPublish) {
    const { data: settingsRow } = await supabase
      .from("tenant_settings")
      .select("draft_settings")
      .eq("tenant_id", auth.tenantId)
      .single();

    if (!settingsRow?.draft_settings) {
      return { success: false, error: "No unpublished changes found to publish." };
    }
    toPublish = settingsRow.draft_settings as unknown as WebsiteSettingsData;
  }

  const parsed = websiteSettingsSchema.safeParse(toPublish);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid settings data." };
  }
  const valid = parsed.data;

  // 1. Commit live identity and branding to public.tenants
  const { error: tenantError } = await supabase
    .from("tenants")
    .update({
      name: valid.businessName,
      slug: valid.subdomain,
      brand_color: valid.mainColor,
      secondary_color: valid.secondaryColor,
      accent_color: valid.accentColor,
      address: valid.streetAddress,
      phone: valid.phoneNumber,
      timezone: valid.timeZone,
    })
    .eq("id", auth.tenantId);

  if (tenantError) {
    return { success: false, error: `Failed to update tenant branding: ${tenantError.message}` };
  }

  // 2. Commit live website content, hours, custom domain & SEO to public.tenant_settings
  const { error: settingsError } = await supabase.from("tenant_settings").upsert(
    {
      tenant_id: auth.tenantId,
      display_name: valid.businessName,
      tagline: valid.headline,
      headline: valid.headline,
      supporting_message: valid.supportingMessage,
      cover_photo_name: valid.coverPhotoName,
      show_featured_services: valid.showFeaturedServices,
      show_contact_details: valid.showContactDetails,
      business_category: valid.businessCategory,
      about: valid.about,
      instagram: valid.instagram,
      city_province: valid.cityProvince,
      postal_code: valid.postalCode,
      hours_mon_fri: valid.hoursMonFri,
      hours_sat: valid.hoursSat,
      hours_sun: valid.hoursSun,
      show_opening_hours: valid.showOpeningHours,
      typography: valid.typography,
      custom_domain: valid.customDomain || null,
      page_title: valid.pageTitle,
      meta_description: valid.metaDescription,
      allow_indexing: valid.allowIndexing,
      social_title: valid.socialTitle,
      social_description: valid.socialDescription,
      is_published: true,
      published_at: new Date().toISOString(),
      draft_settings: null, // Clear working draft after publishing
    },
    { onConflict: "tenant_id" }
  );

  if (settingsError) {
    return { success: false, error: `Failed to publish settings: ${settingsError.message}` };
  }

  revalidatePath("/dashboard/settings/website");
  revalidatePath("/website-settings");
  revalidatePath("/");

  return { success: true, message: "Your website settings have been published successfully." };
}

/**
 * Action: Discards working draft and reverts to published state.
 */
export async function discardWebsiteDraftAction(tenantIdParam?: string): Promise<ActionResult> {
  const auth = await authenticateOwner(tenantIdParam);
  if (!auth.success) {
    if (auth.isDemo) {
      return { success: true, message: "Draft discarded (Demo mode).", isDemo: true };
    }
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("tenant_settings")
    .update({ draft_settings: null })
    .eq("tenant_id", auth.tenantId);

  if (error) {
    return { success: false, error: `Failed to discard draft: ${error.message}` };
  }

  revalidatePath("/dashboard/settings/website");
  return { success: true, message: "Unpublished changes discarded." };
}

/**
 * Action: Validates, checks uniqueness, and updates tenant subdomain.
 */
export async function updateTenantSubdomainAction(
  newSubdomain: string,
  tenantIdParam?: string
): Promise<ActionResult<{ subdomain: string }>> {
  const parsed = subdomainSchema.safeParse(newSubdomain);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid address." };
  }
  const cleanSubdomain = parsed.data;

  const auth = await authenticateOwner(tenantIdParam);
  if (!auth.success) {
    if (auth.isDemo) {
      return {
        success: true,
        message: "Address updated (Demo mode).",
        data: { subdomain: cleanSubdomain },
        isDemo: true,
      };
    }
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  // Check collision with another tenant
  const { data: existing } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", cleanSubdomain)
    .neq("id", auth.tenantId)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      error: "This website address is already taken. Please choose another one.",
    };
  }

  const { error } = await supabase
    .from("tenants")
    .update({ slug: cleanSubdomain })
    .eq("id", auth.tenantId);

  if (error) {
    return { success: false, error: `Failed to update address: ${error.message}` };
  }

  revalidatePath("/dashboard/settings/website");
  return {
    success: true,
    message: "Website address updated successfully.",
    data: { subdomain: cleanSubdomain },
  };
}

/**
 * Action: Checks DNS records (TXT ownership and CNAME routing) for a custom domain.
 */
export async function checkCustomDomainDnsAction(
  domain: string,
  tenantIdParam?: string
): Promise<ActionResult<{ status: "active" | "pending_dns" | "error"; recordsChecked: string[] }>> {
  const parsed = customDomainSchema.safeParse(domain);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid domain name." };
  }
  const targetDomain = parsed.data.toLowerCase();

  const auth = await authenticateOwner(tenantIdParam);
  if (!auth.success) {
    if (auth.isDemo) {
      return {
        success: true,
        message: "DNS check simulated (Demo mode).",
        data: { status: "pending_dns", recordsChecked: ["TXT", "CNAME"] },
        isDemo: true,
      };
    }
    return { success: false, error: auth.error };
  }

  let isTxtVerified = false;
  let isRoutingVerified = false;
  const recordsChecked: string[] = [];

  try {
    // 1. Resolve TXT records
    const txtRecords = await dns.resolveTxt(targetDomain).catch(() => []);
    recordsChecked.push("TXT");
    const flatTxt = txtRecords.flat().join(" ");
    if (flatTxt.includes("fides-verify=")) {
      isTxtVerified = true;
    }

    // 2. Resolve CNAME or A records
    if (targetDomain.startsWith("www.")) {
      const cnames = await dns.resolveCname(targetDomain).catch(() => []);
      recordsChecked.push("CNAME");
      if (cnames.some((c) => c.includes("fides.app"))) {
        isRoutingVerified = true;
      }
    } else {
      const aRecords = await dns.resolve4(targetDomain).catch(() => []);
      recordsChecked.push("A");
      if (aRecords.length > 0) {
        isRoutingVerified = true;
      }
    }
  } catch {
    // DNS lookup failure or propagation delay
  }

  const newStatus = isTxtVerified && isRoutingVerified ? "active" : "pending_dns";
  const supabase = await createClient();

  await supabase
    .from("tenant_settings")
    .update({
      custom_domain: targetDomain,
      custom_domain_status: newStatus,
      custom_domain_last_checked_at: new Date().toISOString(),
    })
    .eq("tenant_id", auth.tenantId);

  return {
    success: true,
    message: newStatus === "active" ? "Domain verified and connected!" : "DNS records pending propagation.",
    data: { status: newStatus, recordsChecked },
  };
}

/**
 * Action: Handles tenant-isolated media asset uploads (logo, cover, social share) to Supabase Storage.
 */
export async function uploadTenantMediaAction(
  formData: FormData,
  tenantIdParam?: string
): Promise<ActionResult<{ url: string; filename: string }>> {
  const auth = await authenticateOwner(tenantIdParam);
  if (!auth.success) {
    if (auth.isDemo) {
      return {
        success: true,
        message: "Media upload simulated (Demo mode).",
        data: {
          url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80",
          filename: "uploaded-asset.jpg",
        },
        isDemo: true,
      };
    }
    return { success: false, error: auth.error };
  }

  const file = formData.get("file") as File | null;
  const rawAssetType = formData.get("assetType") as string | null;

  if (!file || typeof file === "string") {
    return { success: false, error: "No file was uploaded." };
  }

  const parsedAssetType = assetTypeSchema.safeParse(rawAssetType);
  if (!parsedAssetType.success) {
    return { success: false, error: "Invalid asset category (must be logo, cover, or social)." };
  }
  const assetType = parsedAssetType.data;

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      success: false,
      error: `Unsupported file format (${file.type}). Please upload a PNG, JPEG, WEBP, or SVG.`,
    };
  }

  // Validate file size
  const maxBytes = MAX_FILE_SIZES[assetType];
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return {
      success: false,
      error: `File is too large. Maximum allowed size for ${assetType} is ${maxMb} MB.`,
    };
  }

  const supabase = await createClient();
  const sanitizedName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  // Tenant-isolated storage path: {tenant_id}/{assetType}/{filename}
  const storagePath = `${auth.tenantId}/${assetType}/${sanitizedName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from("tenant-assets")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return {
      success: false,
      error: `Storage upload failed: ${uploadError.message}`,
    };
  }

  const { data: publicUrlData } = supabase.storage
    .from("tenant-assets")
    .getPublicUrl(storagePath);

  // If uploading logo, update tenant logo_url
  if (assetType === "logo") {
    await supabase
      .from("tenants")
      .update({ logo_url: publicUrlData.publicUrl })
      .eq("id", auth.tenantId);
  }

  return {
    success: true,
    message: "Image uploaded successfully.",
    data: {
      url: publicUrlData.publicUrl,
      filename: file.name,
    },
  };
}
