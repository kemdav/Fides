import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { limitByClient, MINUTES } from "@/lib/rate-limit";
import { z } from "zod";
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
  if (await limitByClient("storefront-home", { limit: 120, windowMs: MINUTES })) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }
  try {
    const slug = z.string().min(1).max(63).regex(/^[a-z0-9-]+$/i).safeParse((await params).slug);

    if (!slug.success) {
      return NextResponse.json(
        { error: "A valid tenant slug is required." },
        { status: 400 }
      );
    }

    const data = await getStorefrontHomeData(slug.data);

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
  } catch {
    return NextResponse.json({ error: "Could not load the storefront." }, { status: 500 });
  }
}
