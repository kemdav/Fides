/** Shared (client + server) rejection reasons. */
export const REJECTION_REASONS = [
  "Invalid document",
  "Expired document",
  "Expired account",
  "Improper name",
  "Incomplete information",
  "Unreadable or blurry document",
  "Details do not match the documents",
  "Duplicate account",
] as const;

export const CUSTOM_REASON_MAX = 300;

export function composeRejectionReason(reasons: readonly string[], custom: string): string {
  const parts = reasons.filter((reason) => (REJECTION_REASONS as readonly string[]).includes(reason));
  const note = custom.trim().slice(0, CUSTOM_REASON_MAX);
  if (note) parts.push(note);
  return parts.join("; ");
}
