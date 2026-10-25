/**
 * Standard user-facing error messages for authentication and multi-tenant routing.
 */
export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid email or password.",
  DUPLICATE_REGISTRATION: "An account with this email already exists. Log in instead.",
  UNVERIFIED_EMAIL: "Please check your inbox to verify your email address before signing in.",
  RATE_LIMITED: "Too many login attempts. Please wait a few minutes before trying again.",
  EXPIRED_RESET_LINK: "Your password reset link has expired or is invalid. Please request a fresh link.",
  TENANT_MISMATCH: "You do not have access to this business dashboard.",
  SUSPENDED_BUSINESS: "This business account is temporarily suspended. Please contact platform support.",
  UNAUTHORIZED_ROLE: "Access Denied: You do not have permission to view this page.",
  DEFAULT_ERROR: "An authentication error occurred. Please try again.",
} as const;

export interface SupabaseAuthErrorLike {
  code?: string;
  message?: string;
  status?: number;
  name?: string;
}

/**
 * Maps Supabase Auth error objects, HTTP status codes, or error strings
 * to user-friendly, security-hardened messages.
 */
export function mapAuthError(error: unknown): string {
  if (!error) {
    return AUTH_ERROR_MESSAGES.DEFAULT_ERROR;
  }

  const err = (typeof error === "string" ? { message: error } : error) as SupabaseAuthErrorLike;
  const code = (err.code || "").toLowerCase();
  const message = (err.message || "").toLowerCase();
  const status = err.status;

  // Rate Limiting: HTTP 429 or Supabase rate-limit error codes
  if (
    status === 429 ||
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  ) {
    return AUTH_ERROR_MESSAGES.RATE_LIMITED;
  }

  // Invalid Credentials: map invalid_grant / invalid_credentials to generic message
  if (
    code === "invalid_credentials" ||
    code === "invalid_grant" ||
    message.includes("invalid login credentials") ||
    message.includes("invalid_grant") ||
    message.includes("invalid email or password")
  ) {
    return AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS;
  }

  // Unconfirmed / Unverified Email
  if (
    code === "email_not_confirmed" ||
    message.includes("email not confirmed") ||
    message.includes("email address is not verified")
  ) {
    return AUTH_ERROR_MESSAGES.UNVERIFIED_EMAIL;
  }

  // Duplicate Registration: existing email signup
  if (
    code === "user_already_exists" ||
    message.includes("user already registered") ||
    message.includes("already registered") ||
    message.includes("an account with this email already exists")
  ) {
    return AUTH_ERROR_MESSAGES.DUPLICATE_REGISTRATION;
  }

  // Expired or Malformed Password Reset Link / OTP
  if (
    code === "otp_expired" ||
    code === "bad_jwt" ||
    code === "token_expired" ||
    message.includes("token has expired") ||
    message.includes("link is invalid or has expired") ||
    message.includes("otp expired")
  ) {
    return AUTH_ERROR_MESSAGES.EXPIRED_RESET_LINK;
  }

  // Multi-tenant specific codes
  if (code === "tenant_mismatch" || message.includes("no access to this business dashboard")) {
    return AUTH_ERROR_MESSAGES.TENANT_MISMATCH;
  }

  if (code === "tenant_suspended" || message.includes("temporarily suspended")) {
    return AUTH_ERROR_MESSAGES.SUSPENDED_BUSINESS;
  }

  return err.message || AUTH_ERROR_MESSAGES.DEFAULT_ERROR;
}
