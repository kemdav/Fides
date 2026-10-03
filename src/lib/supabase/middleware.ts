import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { TENANT_HEADER } from "@/lib/tenant/constants";
import { resolveTenantFromHostname } from "@/lib/tenant/get-tenant";

/**
 * Runs on every matched request and performs two cross-cutting tasks:
 *
 * 1. Resolves the active tenant from the request host and forwards it via the
 *    {@link TENANT_HEADER} header for downstream server code to scope queries.
 * 2. Refreshes the Supabase auth session and writes rotated cookies onto the
 *    response (required for cookie-based SSR session lifecycle).
 *
 * Invoked from `src/proxy.ts`.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const tenant = resolveTenantFromHostname(request.headers.get("host") ?? "");

  const requestHeaders = new Headers(request.headers);
  if (tenant.slug) {
    requestHeaders.set(TENANT_HEADER, tenant.slug);
  } else {
    requestHeaders.delete(TENANT_HEADER);
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  // Without Supabase configuration the app can still boot (tenant routing
  // applies); session handling is skipped until credentials are provided.
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseKey) {
    return response;
  }

  const supabase = createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({ request: { headers: requestHeaders } });

          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }

          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    }
  );

  // IMPORTANT: call this before generating any response so a rotated token is
  // written back to the cookies. Do not trust `getSession()` for authorization.
  await supabase.auth.getUser();

  return response;
}
