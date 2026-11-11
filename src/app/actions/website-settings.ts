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
  ALLOWED_LOGO_MIME_TYPES,
  ALLOWED_COVER_MIME_TYPES,
  MAX_FILE_SIZES,
} from "@/lib/validations/website-settings";
import type { WebsiteSettingsData } from "@/components/merchant/website-settings/types";

export type ActionResult<T = unknown> =
  | { success: true; message: string; data?: T; isDemo?: boolean }
  | { success: false; error: string };

/**
 * Helper: Authenticates user, verifies membership, and strictly enforces Owner role (QA #15).
 */
async function authenticateOwner(tenantIdParam?: string): Promise<
  | { success: true; userId: string; tenantId: string; role: "owner"; isDemo: false }
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

  const defaultTenantId = profile?.tenant_id;
  const targetTenantId = tenantIdParam || defaultTenantId;

  if (!targetTenantId) {
    return {
      success: false,
      error: "No active tenant associated with this account.",
      statusCode: 403,
    };
  }

  // 2. Query tenant_memberships to check role for target tenant
  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", targetTenantId)
    .eq("profile_id", user.id)
    .maybeSingle();

  const isTenantOwner =
    membership?.role === "owner" ||
    (profile?.tenant_id === targetTenantId && profile?.role === "owner");

  // Strict Role-Based Access Control: strictly 'owner' (QA #15).
  // Non-owners (admin, receptionist, staff) must be rejected with 403.
  if (!isTenantOwner) {
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
    role: "owner",
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
    .select("name, slug, logo_url, brand_color, secondary_color, accent_color, address, phone, timezone")
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
    logoUrl: tenant?.logo_url || "",
    typography: settings?.typography || "Ovo + Mulish",
    mainColor: tenant?.brand_color || "#FFFFEB",
    secondaryColor: tenant?.secondary_color || "#ADD8E6",
    accentColor: tenant?.accent_color || "#CC5000",
    headline: settings?.headline || settings?.tagline || "A little time for yourself.",
    supportingMessage: settings?.supporting_message || "",
    coverPhotoName: settings?.cover_photo_name || "bella-vita-studio.jpg",
    coverPhotoUrl: settings?.cover_photo_url || "",
    showFeaturedServices: settings?.show_featured_services ?? true,
    showContactDetails: settings?.show_contact_details ?? true,
    businessCategory: settings?.business_category || "Beauty & wellness",
    about: settings?.about || "",
    businessEmail: settings?.business_email || "",
    phoneNumber: tenant?.phone || settings?.phone_number || "",
    instagram: settings?.instagram || "",
    streetAddress: tenant?.address || settings?.street_address || "",
    cityProvince: settings?.city_province || "",
    postalCode: settings?.postal_code || "",
    hoursMonFri: settings?.hours_mon_fri || "9:00 AM – 6:00 PM",
    hoursSat: settings?.hours_sat || "10:00 AM – 5:00 PM",
    hoursSun: settings?.hours_sun || "Closed",
    timeZone: tenant?.timezone || settings?.time_zone || "Asia/Manila (UTC+08:00)",
    showOpeningHours: settings?.show_opening_hours ?? true,
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
      ...(valid.logoUrl !== undefined ? { logo_url: valid.logoUrl || null } : {}),
    })
    .eq("id", auth.tenantId);

  if (tenantError) {
    return { success: false, error: `Failed to update tenant branding: ${tenantError.message}` };
  }

  // 2. Commit live website content, hours, custom domain & SEO to public.tenant_settings (QA #10)
  const { error: settingsError } = await supabase.from("tenant_settings").upsert(
    {
      tenant_id: auth.tenantId,
      display_name: valid.businessName,
      tagline: valid.headline,
      headline: valid.headline,
      supporting_message: valid.supportingMessage,
      cover_photo_name: valid.coverPhotoName,
      cover_photo_url: valid.coverPhotoUrl || null,
      show_featured_services: valid.showFeaturedServices,
      show_contact_details: valid.showContactDetails,
      business_category: valid.businessCategory,
      business_email: valid.businessEmail,
      phone_number: valid.phoneNumber,
      about: valid.about,
      instagram: valid.instagram,
      street_address: valid.streetAddress,
      city_province: valid.cityProvince,
      postal_code: valid.postalCode,
      hours_mon_fri: valid.hoursMonFri,
      hours_sat: valid.hoursSat,
      hours_sun: valid.hoursSun,
      time_zone: valid.timeZone,
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

  const supabase = await createClient();

  // Load expected verification token from tenant settings
  const { data: currentSettings } = await supabase
    .from("tenant_settings")
    .select("custom_domain_token")
    .eq("tenant_id", auth.tenantId)
    .maybeSingle();

  const expectedToken = currentSettings?.custom_domain_token || `fides-site-verification=${auth.tenantId}`;

  let isTxtVerified = false;
  let isRoutingVerified = false;
  const recordsChecked: string[] = [];

  const resolveWithTimeout = async <R>(promise: Promise<R>, timeoutMs = 5000): Promise<R | null> => {
    try {
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("DNS timeout")), timeoutMs)
      );
      return await Promise.race([promise, timeoutPromise]);
    } catch {
      return null;
    }
  };

  try {
    // 1. Resolve TXT records (QA #12)
    const txtRecords = await resolveWithTimeout(dns.resolveTxt(targetDomain));
    recordsChecked.push("TXT");
    if (txtRecords && Array.isArray(txtRecords)) {
      const flatTxt = txtRecords.flat().join(" ");
      if (
        flatTxt.includes("fides-site-verification=") ||
        flatTxt.includes("fides-verify=") ||
        (expectedToken && flatTxt.includes(expectedToken))
      ) {
        isTxtVerified = true;
      }
    }

    // 2. Resolve CNAME or A records
    if (targetDomain.startsWith("www.")) {
      const cnames = await resolveWithTimeout(dns.resolveCname(targetDomain));
      recordsChecked.push("CNAME");
      if (cnames && Array.isArray(cnames) && cnames.some((c) => c.includes("fides.app"))) {
        isRoutingVerified = true;
      }
    } else {
      const aRecords = await resolveWithTimeout(dns.resolve4(targetDomain));
      recordsChecked.push("A");
      if (aRecords && Array.isArray(aRecords) && aRecords.length > 0) {
        isRoutingVerified = true;
      }
    }
  } catch {
    // DNS lookup failure or propagation delay
  }

  const newStatus = isTxtVerified && isRoutingVerified ? "active" : "pending_dns";

  await supabase
    .from("tenant_settings")
    .update({
      custom_domain: targetDomain,
      custom_domain_status: newStatus,
      custom_domain_token: expectedToken,
      custom_domain_last_checked_at: new Date().toISOString(),
    })
    .eq("tenant_id", auth.tenantId);

  revalidatePath("/dashboard/settings/website");

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

  // Validate MIME type (QA #7: logo allows SVG, cover does not)
  const allowedSet =
    assetType === "logo"
      ? ALLOWED_LOGO_MIME_TYPES
      : assetType === "cover"
      ? ALLOWED_COVER_MIME_TYPES
      : ALLOWED_MIME_TYPES;

  if (!allowedSet.has(file.type)) {
    const formats = assetType === "cover" ? "PNG, JPEG, or WEBP" : "PNG, JPEG, WEBP, or SVG";
    return {
      success: false,
      error: `Unsupported file format (${file.type}). Please upload a ${formats}.`,
    };
  }

  // Validate file size (QA #7)
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
  // Tenant-isolated storage path: {tenant_id}/{assetType}/{filename} (QA #8)
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

  // Note: Logo URL is stored in draft_settings by caller and only committed
  // to live public.tenants on publish (QA #9). Do NOT update live tenants.logo_url here!

  return {
    success: true,
    message: "Image uploaded successfully.",
    data: {
      url: publicUrlData.publicUrl,
      filename: file.name,
    },
  };
}
