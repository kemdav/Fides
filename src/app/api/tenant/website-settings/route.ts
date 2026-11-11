import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { TENANT_HEADER } from "@/lib/tenant/constants";

export async function GET(request: NextRequest) {
  try {
    const slug =
      request.nextUrl.searchParams.get("slug") ||
      request.nextUrl.searchParams.get("tenant") ||
      request.headers.get(TENANT_HEADER);

    if (!slug) {
      return NextResponse.json(
        { error: "Tenant slug or identifier is required" },
        { status: 400 }
      );
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Service unavailable" },
        { status: 503 }
      );
    }

    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .select("id, name, slug, logo_url, brand_color, secondary_color, accent_color, status")
      .eq("slug", slug.toLowerCase().trim())
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    if (tenant.status !== "active") {
      return NextResponse.json(
        { error: "Tenant is inactive" },
        { status: 403 }
      );
    }

    const { data: settings } = await admin
      .from("tenant_settings")
      .select(
        "typography, headline, supporting_message, cover_photo_name, cover_photo_url, show_featured_services, show_contact_details, business_category, about, business_email, phone_number, instagram, street_address, city_province, postal_code, hours_mon_fri, hours_sat, hours_sun, time_zone, show_opening_hours, custom_domain, custom_domain_status, page_title, meta_description, allow_indexing, social_title, social_description, published_at"
      )
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logo_url,
        brandColor: tenant.brand_color,
        secondaryColor: tenant.secondary_color,
        accentColor: tenant.accent_color,
      },
      settings: settings || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
