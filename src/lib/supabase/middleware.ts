import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { TENANT_HEADER } from "@/lib/tenant/constants";
import { resolveTenantFromHostname } from "@/lib/tenant/get-tenant";

const PROTECTED_ROUTE_PREFIXES = ["/dashboard"];

function redirectWithCookies(url: URL, base: NextResponse, request: NextRequest, clearAuthCookies = false) {
  const response = NextResponse.redirect(url);
  for (const cookie of base.cookies.getAll()) response.cookies.set(cookie);
  if (clearAuthCookies) {
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-")) response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
    }
  }
  return response;
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const host = request.headers.get("host") ?? "";
  const resolved = resolveTenantFromHostname(host);
  const tenantSlug = resolved.slug ?? request.headers.get(TENANT_HEADER) ?? null;

  const requestHeaders = new Headers(request.headers);
  if (tenantSlug) requestHeaders.set(TENANT_HEADER, tenantSlug);
  else requestHeaders.delete(TENANT_HEADER);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  if (!publicEnv.supabaseUrl || !publicEnv.supabaseKey) return response;

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected && !request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"))) return response;

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request: { headers: requestHeaders } });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if ((!user || error) && isProtected) {
    const loginUrl = new URL("/login", request.url);
    return redirectWithCookies(loginUrl, response, request, true);
  }

  return response;
}
