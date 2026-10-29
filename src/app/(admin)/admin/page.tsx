import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";

/**
 * Platform Administrator Portal (`/admin`).
 *
 * Gated by middleware / proxy for users with role === 'admin'.
 */
export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-xl p-8 space-y-6">
        <header className="space-y-1">
          <div className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 mb-2">
            Platform Admin
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Fides Platform Admin Console
          </h1>
          <p className="text-sm text-neutral-400">
            Internal operations and multi-tenant management
          </p>
        </header>

        <div className="rounded-lg bg-neutral-800/60 p-4 text-sm space-y-2 border border-neutral-800">
          <div>
            <span className="font-medium text-neutral-400">Admin Email:</span>{" "}
            <span>{user.email}</span>
          </div>
          <div>
            <span className="font-medium text-neutral-400">Admin ID:</span>{" "}
            <code className="text-xs bg-neutral-950 px-1.5 py-0.5 rounded font-mono text-neutral-300">
              {user.id}
            </code>
          </div>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-sm font-semibold py-2.5 transition cursor-pointer"
          >
            Sign Out
          </button>
        </form>
      </div>
    </main>
  );
}
