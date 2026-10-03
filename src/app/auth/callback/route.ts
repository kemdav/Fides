import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase Auth callback. Exchanges the OAuth / magic-link authorization code
 * for a session and redirects the user onward.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect_to") ?? "/";
  const next = redirectTo.startsWith("/") ? redirectTo : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  const failureUrl = new URL("/", origin);
  failureUrl.searchParams.set("auth_error", "callback_failed");
  return NextResponse.redirect(failureUrl);
}
