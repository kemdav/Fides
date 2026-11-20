import { NextRequest, NextResponse } from "next/server";
import {
  getStorefrontServicesData,
} from "@/lib/storefront/queries";

/**
 * GET /api/storefront/[slug]/services
 *
 * Returns all data needed for the customer-facing services page:
 * - Tenant branding and settings
 * - All active services with category info
 * - Active service categories for filtering
 *
 * Supports optional query params:
 *   ?category=<slug>  — filter by category slug
 *
 * Public endpoint — no authentication required.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "A valid tenant slug is required." },
        { status: 400 }
      );
    }

    const data = await getStorefrontServicesData(slug);

    if (!data) {
      return NextResponse.json(
        { error: "Storefront not found or inactive." },
        { status: 404 }
      );
    }

    // Optional category filter
    const categorySlug = request.nextUrl.searchParams.get("category");
    let { services } = data;

    if (categorySlug && categorySlug !== "all") {
      services = services.filter(
        (s) => s.categorySlug === categorySlug
      );
    }

    return NextResponse.json(
      {
        tenant: data.tenant,
        services,
        categories: data.categories,
        total: services.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("[API] GET /api/storefront/[slug]/services:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
