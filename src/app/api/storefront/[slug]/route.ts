import { NextRequest, NextResponse } from "next/server";
import {
  getStorefrontHomeData,
} from "@/lib/storefront/queries";

/**
 * GET /api/storefront/[slug]
 *
 * Returns all data needed for the customer-facing home page:
 * - Tenant branding, copy, and settings
 * - Featured services (first 3 active services)
 * - Active staff members
 *
 * Public endpoint — no authentication required.
 */
export async function GET(
  _request: NextRequest,
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

    const data = await getStorefrontHomeData(slug);

    if (!data) {
      return NextResponse.json(
        { error: "Storefront not found or inactive." },
        { status: 404 }
      );
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("[API] GET /api/storefront/[slug]:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
