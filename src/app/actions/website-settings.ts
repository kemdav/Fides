"use server";

import dns from "node:dns/promises";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  websiteSettingsSchema,
  websiteSettingsDraftSchema,
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

type TenantMemberAuth =
  | {
      success: true;
      userId: string;
      tenantId: string;
      tenantSlug: string;
      isOwner: boolean;
      isDemo: false;
    }
  | { success: false; error: string; statusCode: number; isDemo?: boolean };

function deriveInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "BV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function normalizeIanaTimezone(raw: string | null | undefined): string {
  const candidate = (raw ?? "").trim().split(/\s+/)[0] || "Asia/Manila";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch {
    return "Asia/Manila";
  }
}

function revalidateWebsitePaths(slug?: string | null, previousSlug?: string | null) {
  revalidatePath("/dashboard/settings/website");
  revalidatePath("/website-settings");
  revalidatePath("/");

  const slugs = new Set([slug, previousSlug].filter((s): s is string => Boolean(s)));
  for (const s of slugs) {
    revalidatePath(`/${s}/dashboard/settings/website`);
    revalidatePath(`/${s}`, "layout");
    revalidatePath(`/${s}`);
    revalidatePath(`/${s}/about`);
    revalidatePath(`/${s}/services`);
    revalidatePath(`/${s}/contact`);
  }
}

/**
 * Authenticates the current user and verifies membership in the target tenant.
 * Returns `isOwner` so reads can allow Staff read-only access while writes require Owner.
 */
async function authenticateTenantMember(
  tenantIdParam?: string
): Promise<TenantMemberAuth> {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const targetTenantId = tenantIdParam || profile?.tenant_id;

  if (!targetTenantId) {
    return {
      success: false,
      error: "No active tenant associated with this account.",
      statusCode: 403,
    };
  }

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", targetTenantId)
    .eq("profile_id", user.id)
    .maybeSingle();

  const isMember =
    Boolean(membership) || profile?.tenant_id === targetTenantId;

  if (!isMember) {
    return {
      success: false,
      error: "Access Denied: You do not belong to this workspace.",
      statusCode: 403,
    };
  }

  const isOwner =
    membership?.role === "owner" ||
    (profile?.tenant_id === targetTenantId && profile?.role === "owner");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("slug")
    .eq("id", targetTenantId)
    .maybeSingle();

  return {
    success: true,
    userId: user.id,
    tenantId: targetTenantId,
    tenantSlug: tenant?.slug ?? "",
    isOwner,
    isDemo: false,
  };
}

/**
 * Strictly enforces Owner role for all mutating website settings actions.
 */
async function authenticateOwner(
  tenantIdParam?: string
): Promise<TenantMemberAuth> {
  const auth = await authenticateTenantMember(tenantIdParam);
  if (!auth.success) return auth;

  if (!auth.isOwner) {
    return {
      success: false,
      error:
        "Access Denied: Only business owners have permission to modify website settings.",
      statusCode: 403,
    };
  }

  return auth;
}

/**
 * Fetches both live published settings and working draft for a tenant.
 * Permitted for Owners and read-only Staff members.
 */
export async function getWebsiteSettingsAction(
  tenantIdParam?: string
): Promise<
  ActionResult<{
    live: Partial<WebsiteSettingsData>;
    draft: Partial<WebsiteSettingsData> | null;
    canEdit: boolean;
    customDomainToken: string;
  }>
> {
  const auth = await authenticateTenantMember(tenantIdParam);
  if (!auth.success) {
    if (auth.isDemo) {
      return {
        success: true,
        message: "Demo mode active.",
        isDemo: true,
        data: { live: {}, draft: null, canEdit: true, customDomainToken: "" },
      };
    }
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "name, slug, logo_url, brand_color, secondary_color, accent_color, address, phone, timezone"
    )
    .eq("id", auth.tenantId)
    .single();

  const { data: settings } = await supabase
    .from("tenant_settings")
    .select("*")
    .eq("tenant_id", auth.tenantId)
    .maybeSingle();

  const displayName =
    settings?.display_name || tenant?.name || "Bella Vita Salon & Spa";

  const liveData: Partial<WebsiteSettingsData> = {
    businessName: displayName,
    logoInitials: deriveInitials(displayName),
    subdomain: tenant?.slug || "bellavita",
    logoUrl: tenant?.logo_url || "",
    typography: settings?.typography || "Ovo + Mulish",
    mainColor: tenant?.brand_color || "#FFFFEB",
    secondaryColor: tenant?.secondary_color || "#ADD8E6",
    accentColor: tenant?.accent_color || "#CC5000",
    headline:
      settings?.headline || settings?.tagline || "A little time for yourself.",
    supportingMessage: settings?.supporting_message || "",
    coverPhotoName: settings?.cover_photo_name || "bella-vita-studio.jpg",
    coverPhotoUrl: settings?.cover_photo_url || "",
    showFeaturedServices: settings?.show_featured_services ?? true,
    showContactDetails: settings?.show_contact_details ?? true,
    businessCategory: settings?.business_category || "Beauty & wellness",
    about: settings?.about || "",
    businessEmail: settings?.business_email || "",
    phoneNumber: settings?.phone_number || tenant?.phone || "",
    instagram: settings?.instagram || "",
    streetAddress: settings?.street_address || tenant?.address || "",
    cityProvince: settings?.city_province || "",
    postalCode: settings?.postal_code || "",
    hoursMonFri: settings?.hours_mon_fri || "9:00 AM – 6:00 PM",
    hoursSat: settings?.hours_sat || "10:00 AM – 5:00 PM",
    hoursSun: settings?.hours_sun || "Closed",
    timeZone:
      settings?.time_zone || tenant?.timezone || "Asia/Manila (UTC+08:00)",
    showOpeningHours: settings?.show_opening_hours ?? true,
    customDomain: settings?.custom_domain || "",
    isDomainVerified: settings?.custom_domain_status === "active",
    pageTitle: settings?.page_title || "",
    metaDescription: settings?.meta_description || "",
    allowIndexing: settings?.allow_indexing ?? true,
    socialTitle: settings?.social_title || "",
    socialDescription: settings?.social_description || "",
    socialImageUrl: settings?.social_image_url || "",
    socialImageName: settings?.social_image_name || "",
  };

  const draftData =
    (settings?.draft_settings as Partial<WebsiteSettingsData>) || null;

  return {
    success: true,
    message: "Settings loaded successfully.",
    data: {
      live: liveData,
      draft: draftData,
      canEdit: auth.isOwner,
      customDomainToken:
        settings?.custom_domain_token ||
        `fides-verify=${auth.tenantId.slice(0, 12)}`,
    },
  };
}

/**
 * Saves working draft changes without altering the live website.
 */
export async function saveWebsiteDraftAction(
  data: WebsiteSettingsData,
  tenantIdParam?: string
): Promise<ActionResult> {
  const parsed = websiteSettingsDraftSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid settings.",
    };
  }

  const auth = await authenticateOwner(tenantIdParam);
  if (!auth.success) {
    if (auth.isDemo) {
      return {
        success: true,
        message: "Draft saved (Demo mode: session retained).",
        isDemo: true,
      };
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

  revalidateWebsitePaths(auth.tenantSlug);
  return { success: true, message: "Draft saved successfully." };
}

/**
 * Commits draft settings to the live customer-facing website.
 */
export async function publishWebsiteSettingsAction(
  data?: WebsiteSettingsData,
  tenantIdParam?: string
): Promise<ActionResult<{ subdomain: string }>> {
  const auth = await authenticateOwner(tenantIdParam);
  if (!auth.success) {
    if (auth.isDemo) {
      return {
        success: true,
        message: "Website published (Demo mode).",
        data: { subdomain: data?.subdomain || "bellavita" },
        isDemo: true,
      };
    }
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  let toPublish = data;
  if (!toPublish) {
    const { data: settingsRow } = await supabase
      .from("tenant_settings")
      .select("draft_settings")
      .eq("tenant_id", auth.tenantId)
      .single();

    if (!settingsRow?.draft_settings) {
      return {
        success: false,
        error: "No unpublished changes found to publish.",
      };
    }
    toPublish = settingsRow.draft_settings as unknown as WebsiteSettingsData;
  }

  const parsed = websiteSettingsSchema.safeParse(toPublish);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid settings data.",
    };
  }
  const valid = parsed.data;

  // Validate slug uniqueness if subdomain differs from current live slug
  if (valid.subdomain !== auth.tenantSlug) {
    const { data: existing } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", valid.subdomain)
      .neq("id", auth.tenantId)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error:
          "This website address is already taken. Please choose another one.",
      };
    }
  }

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
      timezone: normalizeIanaTimezone(valid.timeZone),
      ...(valid.logoUrl !== undefined
        ? { logo_url: valid.logoUrl || null }
        : {}),
    })
    .eq("id", auth.tenantId);

  if (tenantError) {
    return {
      success: false,
      error: `Failed to update tenant branding: ${tenantError.message}`,
    };
  }

  // 2. Commit live website content, colors, hours, domain & SEO to public.tenant_settings
  const { error: settingsError } = await supabase
    .from("tenant_settings")
    .upsert(
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
        social_image_url: valid.socialImageUrl || null,
        social_image_name: valid.socialImageName || null,
        is_published: true,
        published_at: new Date().toISOString(),
        draft_settings: null,
      },
      { onConflict: "tenant_id" }
    );

  if (settingsError) {
    return {
      success: false,
      error: `Failed to publish settings: ${settingsError.message}`,
    };
  }

  revalidateWebsitePaths(valid.subdomain, auth.tenantSlug);

  return {
    success: true,
    message: "Your website settings have been published successfully.",
    data: { subdomain: valid.subdomain },
  };
}

/**
 * Discards working draft and reverts to published state.
 */
export async function discardWebsiteDraftAction(
  tenantIdParam?: string
): Promise<ActionResult> {
  const auth = await authenticateOwner(tenantIdParam);
  if (!auth.success) {
    if (auth.isDemo) {
      return {
        success: true,
        message: "Draft discarded (Demo mode).",
        isDemo: true,
      };
    }
    return { success: false, error: auth.error };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("tenant_settings")
    .update({ draft_settings: null })
    .eq("tenant_id", auth.tenantId);

  if (error) {
    return {
      success: false,
      error: `Failed to discard draft: ${error.message}`,
    };
  }

  revalidateWebsitePaths(auth.tenantSlug);
  return { success: true, message: "Unpublished changes discarded." };
}

/**
 * Validates, checks uniqueness, and updates tenant subdomain.
 * Also syncs `draft_settings.subdomain` if a working draft exists.
 */
export async function updateTenantSubdomainAction(
  newSubdomain: string,
  tenantIdParam?: string
): Promise<ActionResult<{ subdomain: string }>> {
  const parsed = subdomainSchema.safeParse(newSubdomain);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid address.",
    };
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

  const { data: existing } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", cleanSubdomain)
    .neq("id", auth.tenantId)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      error:
        "This website address is already taken. Please choose another one.",
    };
  }

  const { error } = await supabase
    .from("tenants")
    .update({ slug: cleanSubdomain })
    .eq("id", auth.tenantId);

  if (error) {
    return {
      success: false,
      error: `Failed to update address: ${error.message}`,
    };
  }

  // Keep saved draft subdomain aligned so a later Publish doesn't revert the slug
  const { data: settingsRow } = await supabase
    .from("tenant_settings")
    .select("draft_settings")
    .eq("tenant_id", auth.tenantId)
    .maybeSingle();

  if (
    settingsRow?.draft_settings &&
    typeof settingsRow.draft_settings === "object" &&
    !Array.isArray(settingsRow.draft_settings)
  ) {
    await supabase
      .from("tenant_settings")
      .update({
        draft_settings: {
          ...(settingsRow.draft_settings as Record<string, unknown>),
          subdomain: cleanSubdomain,
        },
      })
      .eq("tenant_id", auth.tenantId);
  }

  revalidateWebsitePaths(cleanSubdomain, auth.tenantSlug);
  return {
    success: true,
    message: "Website address updated successfully.",
    data: { subdomain: cleanSubdomain },
  };
}

/**
 * Checks DNS records (TXT ownership and CNAME/A routing) for a custom domain.
 */
export async function checkCustomDomainDnsAction(
  domain: string,
  tenantIdParam?: string
): Promise<
  ActionResult<{
    status: "active" | "pending_dns" | "error";
    recordsChecked: string[];
  }>
> {
  const parsed = customDomainSchema.safeParse(domain);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid domain name.",
    };
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

  const { data: currentSettings } = await supabase
    .from("tenant_settings")
    .select("custom_domain_token")
    .eq("tenant_id", auth.tenantId)
    .maybeSingle();

  const expectedToken =
    currentSettings?.custom_domain_token ||
    `fides-verify=${auth.tenantId.slice(0, 12)}`;

  let isTxtVerified = false;
  let isRoutingVerified = false;
  const recordsChecked: string[] = [];

  const resolveWithTimeout = async <R>(
    promise: Promise<R>,
    timeoutMs = 5000
  ): Promise<R | null> => {
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

    if (targetDomain.startsWith("www.")) {
      const cnames = await resolveWithTimeout(dns.resolveCname(targetDomain));
      recordsChecked.push("CNAME");
      if (
        cnames &&
        Array.isArray(cnames) &&
        cnames.some((c) => c.includes("fides.app"))
      ) {
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

  const newStatus =
    isTxtVerified && isRoutingVerified ? "active" : "pending_dns";

  await supabase
    .from("tenant_settings")
    .upsert(
      {
        tenant_id: auth.tenantId,
        custom_domain: targetDomain,
        custom_domain_status: newStatus,
        custom_domain_token: expectedToken,
        custom_domain_last_checked_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" }
    );

  revalidateWebsitePaths(auth.tenantSlug);

  return {
    success: true,
    message:
      newStatus === "active"
        ? "Domain verified and connected!"
        : "DNS records pending propagation.",
    data: { status: newStatus, recordsChecked },
  };
}

/**
 * Handles tenant-isolated media asset uploads (logo, cover, social share) to Supabase Storage.
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
    return {
      success: false,
      error: "Invalid asset category (must be logo, cover, or social).",
    };
  }
  const assetType = parsedAssetType.data;

  const allowedSet =
    assetType === "logo"
      ? ALLOWED_LOGO_MIME_TYPES
      : assetType === "cover"
      ? ALLOWED_COVER_MIME_TYPES
      : ALLOWED_MIME_TYPES;

  if (!allowedSet.has(file.type)) {
    const formats =
      assetType === "cover"
        ? "PNG, JPEG, or WEBP"
        : "PNG, JPEG, WEBP, or SVG";
    return {
      success: false,
      error: `Unsupported file format (${file.type}). Please upload a ${formats}.`,
    };
  }

  const maxBytes = MAX_FILE_SIZES[assetType];
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return {
      success: false,
      error: `File is too large. Maximum allowed size for ${assetType} is ${maxMb} MB.`,
    };
  }

  const supabase = await createClient();
  const sanitizedName = `${Date.now()}-${file.name.replace(
    /[^a-zA-Z0-9.-]/g,
    "_"
  )}`;
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

  return {
    success: true,
    message: "Image uploaded successfully.",
    data: {
      url: publicUrlData.publicUrl,
      filename: file.name,
    },
  };
}