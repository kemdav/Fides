import { LoginForm } from "./login-form";

/**
 * Sign In & Registration Page.
 *
 * In Next.js 15+ / 16, `searchParams` is an async Promise.
 * Captures query parameters for:
 * - `error`: Error messages from redirects (e.g. rate-limit, suspended business, invalid credentials, tenant mismatch)
 * - `message`: Informational notices (e.g. email verification prompt)
 * - `tab`: Initial active tab ('login' | 'signup' | 'forgot')
 * - `redirect`: Original target destination after authenticating
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    tab?: "login" | "signup" | "forgot";
    redirect?: string;
  }>;
}) {
  const { error, message, tab, redirect } = await searchParams;

  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <LoginForm
        initialTab={tab || "login"}
        errorMessage={error}
        infoMessage={message}
        redirectUrl={redirect}
      />
    </main>
  );
}
