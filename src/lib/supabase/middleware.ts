import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { TENANT_HEADER } from "@/lib/tenant/constants";
import { resolveTenantFromHostname } from "@/lib/tenant/get-tenant";
import { getAdminClient } from "@/lib/supabase/admin";
import { AUTH_ERROR_MESSAGES } from "@/lib/auth/error-handler";

const PROTECTED_ROUTE_PREFIXES = ["/dashboard", "/admin"];

/**
 * Preserves updated session cookies and safely purges stale auth tokens.
 */
function createRedirectWithCookies(
  url: URL,
  baseResponse: NextResponse,
  request: NextRequest,
  clearAuthCookies = false
): NextResponse {
  const redirectResponse = NextResponse.redirect(url);

  // Staged session cookies
  for (const cookie of baseResponse.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }

  // Purge dead or corrupt tokens on expired sessions
  if (clearAuthCookies) {
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-") || cookie.name.includes("auth-token")) {
        redirectResponse.cookies.set(cookie.name, "", {
          maxAge: 0,
          path: "/",
        });
      }
    }
  }

  return redirectResponse;
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const host = request.headers.get("host") ?? "";
  const resolved = resolveTenantFromHostname(host);

  // Tenant slug resolution:
  // 1. Subdomain (e.g. alpha.fides.app or alpha.localhost)
  // 2. Custom header (x-fides-tenant)
  // 3. Query parameter (?tenant=slug)
  const tenantSlug =
    resolved.slug ??
    request.headers.get(TENANT_HEADER) ??
    request.nextUrl.searchParams.get("tenant") ??
    null;

  const requestHeaders = new Headers(request.headers);
  if (tenantSlug) {
    requestHeaders.set(TENANT_HEADER, tenantSlug);
  } else {
    requestHeaders.delete(TENANT_HEADER);
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });

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

  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // Authenticate user securely against Supabase Auth
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // ---------------------------------------------------------------------------
  // 1. Expired Session / Unauthenticated Route Protection
  // ---------------------------------------------------------------------------
  if (!user || userError) {
    if (isProtectedRoute) {
      const loginUrl = new URL("/login", request.url);
      const currentPath = pathname + request.nextUrl.search;
      loginUrl.searchParams.set("redirect", currentPath);

      // Automatically clear stale auth tokens and redirect to login
      return createRedirectWithCookies(loginUrl, response, request, true);
    }
    return response;
  }

  // ---------------------------------------------------------------------------
  // 2. Prevent infinite loops on /login (unless displaying a forwarded error)
  // ---------------------------------------------------------------------------
  if (pathname === "/login") {
    const hasError = request.nextUrl.searchParams.has("error");
    if (!hasError) {
      const dashboardUrl = new URL("/dashboard", request.url);
      return createRedirectWithCookies(dashboardUrl, response, request, false);
    }
    return response;
  }

  // ---------------------------------------------------------------------------
  // 3. User Role & Memberships Verification (via authenticated client)
  // ---------------------------------------------------------------------------
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, tenant_id")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role ?? "staff";

  // Unauthorized Role Route Guard: /admin gated strictly to platform admin
  if (pathname.startsWith("/admin")) {
    if (userRole !== "admin") {
      const homeUrl = new URL("/dashboard", request.url);
      homeUrl.searchParams.set("toast", "access_denied");
      homeUrl.searchParams.set(
        "toast_message",
        "Access Denied: Platform Administrator privileges required."
      );
      return createRedirectWithCookies(homeUrl, response, request, false);
    }
  }

  // Retrieve user memberships via authenticated client
  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("profile_id", user.id);

  const userTenantIds = Array.from(
    new Set([
      profile?.tenant_id,
      ...(memberships?.map((m) => m.tenant_id) || []),
    ].filter(Boolean))
  ) as string[];

  // ---------------------------------------------------------------------------
  // 4. Multi-Tenant Interception: Explicit Tenant Access (Subdomain or ?tenant=slug)
  // ---------------------------------------------------------------------------
  if (tenantSlug) {
    if (userRole !== "admin") {
      // First try resolving tenant via user's client
      let { data: tenant } = await supabase
        .from("tenants")
        .select("id, slug, status")
        .eq("slug", tenantSlug)
        .maybeSingle();

      // Fallback: If RLS hid a suspended tenant, attempt query via admin client if available
      if (!tenant) {
        const admin = getAdminClient();
        if (admin) {
          const { data: adminTenant } = await admin
            .from("tenants")
            .select("id, slug, status")
            .eq("slug", tenantSlug)
            .maybeSingle();
          if (adminTenant) {
            tenant = adminTenant;
          }
        }
      }

      // 4a. Suspended Business Notice (targeted tenant is suspended)
      if (tenant && tenant.status === "suspended") {
        const suspendedUrl = new URL("/login", request.url);
        suspendedUrl.searchParams.delete("tenant");
        if (resolved.slug) {
          suspendedUrl.host = publicEnv.platformDomain || "localhost:3000";
        }
        suspendedUrl.searchParams.set(
          "error",
          AUTH_ERROR_MESSAGES.SUSPENDED_BUSINESS
        );
        return createRedirectWithCookies(suspendedUrl, response, request, true);
      }

      // 4b. Tenant Mismatch Check:
      // Verifies case-insensitively whether user is linked to this tenant
      const isMember =
        tenant &&
        (userTenantIds.some(
          (id) => id.toLowerCase() === tenant.id.toLowerCase()
        ) ||
          profile?.tenant_id?.toLowerCase() === tenant.id.toLowerCase());

      if (!isMember) {
        const mismatchUrl = new URL("/dashboard", request.url);
        mismatchUrl.searchParams.delete("tenant");
        if (resolved.slug) {
          mismatchUrl.host = publicEnv.platformDomain || "localhost:3000";
        }
        mismatchUrl.searchParams.set(
          "error",
          AUTH_ERROR_MESSAGES.TENANT_MISMATCH
        );
        return createRedirectWithCookies(mismatchUrl, response, request, false);
      }
    }
  } else if (userRole !== "admin" && userTenantIds.length > 0) {
    // -------------------------------------------------------------------------
    // 4c. Suspended Business Notice on general /dashboard without explicit slug
    // -------------------------------------------------------------------------
    const { data: userTenants } = await supabase
      .from("tenants")
      .select("id, status")
      .in("id", userTenantIds);

    const allSuspended =
      userTenants &&
      userTenants.length > 0 &&
      userTenants.every((t) => t.status === "suspended");

    if (allSuspended) {
      const suspendedUrl = new URL("/login", request.url);
      suspendedUrl.searchParams.set(
        "error",
        AUTH_ERROR_MESSAGES.SUSPENDED_BUSINESS
      );
      return createRedirectWithCookies(suspendedUrl, response, request, true);
    }
  }

  return response;
}
