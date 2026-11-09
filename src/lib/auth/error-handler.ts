export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid email or password.",
  RATE_LIMITED: "Too many login attempts. Please wait a few minutes before trying again.",
  PENDING: "Your application is still under review. You will be able to log in once an administrator approves it.",
  REJECTED: "Your application was not approved. Please contact Fides support for more information.",
  SUSPENDED: "This account is suspended. Please contact Fides support.",
  NO_ACCOUNT: "No approved business account was found for this login.",
  EXPIRED_RESET_LINK: "This password reset link is invalid or has expired. Please request a new one.",
  DEFAULT_ERROR: "We could not sign you in. Please try again.",
} as const;

export function mapAuthError(error: { code?: string; message?: string; status?: number } | null | undefined): string {
  if (!error) return AUTH_ERROR_MESSAGES.DEFAULT_ERROR;
  const code = (error.code ?? "").toLowerCase();
  const message = (error.message ?? "").toLowerCase();
  if (error.status === 429 || code.includes("rate_limit") || message.includes("rate limit")) {
    return AUTH_ERROR_MESSAGES.RATE_LIMITED;
  }
  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS;
  }
  return AUTH_ERROR_MESSAGES.DEFAULT_ERROR;
}
