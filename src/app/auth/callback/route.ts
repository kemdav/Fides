import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapAuthError, AUTH_ERROR_MESSAGES } from "@/lib/auth/error-handler";

/**
 * Supabase Auth Callback Route Handler.
 *
 * Processes:
 * - Email confirmation links
 * - Password recovery OTP callbacks
 * - OAuth code exchanges
 *
 * Catches expired, malformed, or rejected tokens and prompts user to request
 * a fresh link instead of dropping them into a broken UI state.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  // 1. Check for errors passed directly by Supabase Auth in query params
  const errorParam = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  if (errorParam || errorCode) {
    const isExpiredOtp =
      errorCode === "otp_expired" ||
      errorCode === "bad_jwt" ||
      errorDescription?.toLowerCase().includes("expired") ||
      errorDescription?.toLowerCase().includes("invalid");

    const message = isExpiredOtp
      ? AUTH_ERROR_MESSAGES.EXPIRED_RESET_LINK
      : errorDescription || AUTH_ERROR_MESSAGES.DEFAULT_ERROR;

    const failureUrl = new URL("/login", origin);
    failureUrl.searchParams.set("error", message);
    failureUrl.searchParams.set("tab", "forgot");
    return NextResponse.redirect(failureUrl);
  }

  // 2. Exchange authorization code for a session
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // e.g. "recovery", "signup", "invite"
  const redirectTo = searchParams.get("redirect_to") ?? searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const userMessage = mapAuthError(error);
      const isRecovery = type === "recovery";

      const failureUrl = new URL("/login", origin);
      failureUrl.searchParams.set("error", userMessage);
      if (isRecovery) {
        failureUrl.searchParams.set("tab", "forgot");
      }
      return NextResponse.redirect(failureUrl);
    }

    // Successfully exchanged code!
    // If this was a password recovery callback, route to reset-password form
    if (type === "recovery") {
      return NextResponse.redirect(new URL("/reset-password", origin));
    }

    // Otherwise route to the requested destination or dashboard
    const nextPath =
      redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard";
    return NextResponse.redirect(new URL(nextPath, origin));
  }

  // Fallback for requests missing both code and error
  const fallbackUrl = new URL("/login", origin);
  fallbackUrl.searchParams.set("error", "Invalid or missing verification code.");
  return NextResponse.redirect(fallbackUrl);
}
