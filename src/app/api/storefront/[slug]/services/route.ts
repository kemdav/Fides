import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { limitByClient, MINUTES } from "@/lib/rate-limit";
import { z } from "zod";
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
  if (await limitByClient("storefront-services", { limit: 120, windowMs: MINUTES })) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }
  try {
    const slug = z.string().min(1).max(63).regex(/^[a-z0-9-]+$/i).safeParse((await params).slug);
    const category = z.string().max(100).nullable().safeParse(request.nextUrl.searchParams.get("category"));

    if (!slug.success || !category.success) {
      return NextResponse.json(
        { error: "A valid tenant slug is required." },
        { status: 400 }
      );
    }

    const data = await getStorefrontServicesData(slug.data);

    if (!data) {
      return NextResponse.json(
        { error: "Storefront not found or inactive." },
        { status: 404 }
      );
    }

    // Optional category filter
    const categorySlug = category.data;
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
  } catch {
    return NextResponse.json({ error: "Could not load storefront services." }, { status: 500 });
  }
}
