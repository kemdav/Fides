import { updatePassword } from "@/app/actions/auth";

/**
 * Reset Password Page.
 *
 * Rendered after a user clicks a verified password recovery link.
 * Allows entering and confirming a new password.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl shadow-sm p-6 sm:p-8 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Set New Password
          </h1>
          <p className="text-sm text-neutral-500">
            Please enter a strong password with at least 8 characters.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-700 flex items-start gap-2.5"
          >
            <span className="text-base leading-none">⚠️</span>
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        <form action={updatePassword} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={8}
              className="w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 transition"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={8}
              className="w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 transition"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 transition cursor-pointer"
          >
            Update Password
          </button>
        </form>
      </div>
    </main>
  );
}
