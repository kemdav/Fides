import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";

/**
 * Protected Dashboard Server Component.
 *
 * Verifies active session with `supabase.auth.getUser()`.
 * Displays error banners (e.g. Tenant Mismatch) and session details.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; tenant?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const { error: pageError, tenant: currentTenantSlug } =
    (await searchParams) || {};

  // Fetch profile and memberships to display user context
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .single();

  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role")
    .eq("profile_id", user.id);

  // Fetch all tenant records visible to the user
  const tenantIds = Array.from(
    new Set(
      [
        profile?.tenant_id,
        ...(memberships?.map((m) => m.tenant_id) || []),
      ].filter(Boolean),
    ),
  ) as string[];

  let tenantDetails: {
    id: string;
    name: string;
    slug: string;
    status: string;
  }[] = [];
  if (tenantIds.length > 0) {
    const { data: tData } = await supabase
      .from("tenants")
      .select("id, name, slug, status")
      .in("id", tenantIds);
    if (tData) {
      tenantDetails = tData;
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-neutral-200 rounded-xl shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Protected Dashboard
          </h1>
          <p className="text-sm text-neutral-500">
            Active Supabase session verified
          </p>
        </div>

        {pageError && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-start gap-2.5 animate-in fade-in"
          >
            <span className="text-lg leading-none">🚫</span>
            <div className="flex-1 font-semibold">{pageError}</div>
          </div>
        )}

        {currentTenantSlug && !pageError && (
          <div
            role="status"
            className="rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 text-sm text-emerald-800 flex items-center justify-between"
          >
            <span className="font-medium">
              Active Tenant Context: <strong>{currentTenantSlug}</strong>
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-semibold">
              Authorized
            </span>
          </div>
        )}

        <div className="rounded-lg bg-neutral-100 p-4 text-sm space-y-2.5">
          <div>
            <span className="font-semibold text-neutral-700">Email:</span>{" "}
            <span className="text-neutral-900">{user.email}</span>
          </div>
          <div>
            <span className="font-semibold text-neutral-700">User ID:</span>{" "}
            <code className="text-xs bg-neutral-200 px-1.5 py-0.5 rounded font-mono text-neutral-800 break-all">
              {user.id}
            </code>
          </div>
          <div>
            <span className="font-semibold text-neutral-700">
              Platform Role:
            </span>{" "}
            <span className="capitalize font-medium text-neutral-900">
              {profile?.role || "staff"}
            </span>
          </div>
          <div>
            <span className="font-semibold text-neutral-700">
              Your Tenants:
            </span>{" "}
            {tenantDetails.length > 0 ? (
              <div className="mt-1 space-y-1">
                {tenantDetails.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-neutral-200 text-xs"
                  >
                    <span className="font-medium text-neutral-900">
                      {t.name} (slug:{" "}
                      <code className="text-neutral-700">{t.slug}</code>)
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        t.status === "active"
                          ? "bg-green-100 text-green-800"
                          : t.status === "suspended"
                            ? "bg-red-100 text-red-800"
                            : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-neutral-500 font-mono">
                {memberships && memberships.length > 0
                  ? memberships
                      .map((m) => `${m.tenant_id} (${m.role})`)
                      .join(", ")
                  : "None configured"}
              </span>
            )}
          </div>
        </div>

        {/* Quick Test Triggers */}
        <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Interactive Test Triggers
          </h3>
          <div className="flex flex-col gap-2">
            <Link
              href="/dashboard?tenant=alpha"
              className="inline-flex items-center justify-between text-xs font-medium px-3 py-2 rounded-md bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 transition"
            >
              <span>Test Tenant Alpha Access (Should be authorized)</span>
              <span className="text-neutral-400">→</span>
            </Link>

            <Link
              href="/dashboard?tenant=beta"
              className="inline-flex items-center justify-between text-xs font-medium px-3 py-2 rounded-md bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 transition"
            >
              <span>Test Tenant Mismatch (Try accessing Beta)</span>
              <span className="text-neutral-400">→</span>
            </Link>

            <Link
              href="/admin"
              className="inline-flex items-center justify-between text-xs font-medium px-3 py-2 rounded-md bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 transition"
            >
              <span>Test Unauthorized Role Guard (Try accessing /admin)</span>
              <span className="text-neutral-400">→</span>
            </Link>
          </div>
        </div>

        {/* Server Action: Sign Out */}
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition cursor-pointer"
          >
            Sign Out
          </button>
        </form>
      </div>
    </main>
  );
}
