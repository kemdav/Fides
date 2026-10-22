import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { logout } from "@/app/actions/auth";

/**
 * Basic Server Component demonstrating:
 * 1. Server-side session verification using supabase.auth.getUser()
 * 2. Invoking the `logout` Server Action directly via a native HTML form
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  // IMPORTANT: Always use getUser() instead of getSession() in server environments.
  // getUser() validates the JWT against the Supabase Auth server, avoiding forged cookie vulnerabilities.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-lg shadow-sm p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">
            Protected Dashboard
          </h1>
          <p className="text-sm text-neutral-500">
            Active Supabase session verified
          </p>
        </div>

        <div className="rounded-md bg-neutral-100 p-4 text-sm space-y-2">
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
              Last Sign In:
            </span>{" "}
            <span className="text-neutral-700 text-xs">
              {user.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleString()
                : "N/A"}
            </span>
          </div>
        </div>

        {/* Server Action invocation: Server Components invoke mutations via <form action={action}> */}
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition"
          >
            Sign Out
          </button>
        </form>
      </div>
    </main>
  );
}
