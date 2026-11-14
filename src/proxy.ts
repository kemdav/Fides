import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js Proxy (the Next.js 16 rename of middleware).
 *
 * Handles the platform's cross-cutting request concerns in one place:
 * Supabase session refresh and multi-tenant host resolution.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every request except static assets and PWA files.
     *
     * `api/applications` is excluded on purpose: it receives the registration
     * documents (up to 7 files x 50 MB). The proxy buffers request bodies and
     * caps them at 10 MB by default, which would truncate those uploads. The
     * route does not need a session or tenant header.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|robots.txt|sitemap.xml|llms.txt|opengraph-image|icons/|api/applications|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
