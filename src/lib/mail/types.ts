/** A recipient address with an optional display name. */
export interface MailAddress {
  name?: string;
  address: string;
}

/** A transactional email payload. */
export interface MailMessage {
  to: MailAddress | MailAddress[] | string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

/** Normalized result returned by every {@link Mailer} implementation. */
export interface MailResult {
  /** Provider message id, when available. */
  id: string | null;
  /** Addresses the transport accepted. */
  accepted: string[];
  /** Addresses the transport rejected. */
  rejected: string[];
}
