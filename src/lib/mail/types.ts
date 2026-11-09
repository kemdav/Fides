export interface MailAddress {
  name?: string;
  address: string;
}

export interface MailAttachment {
  filename: string;
  path: string;
  cid: string;
}

export interface MailMessage {
  to: MailAddress | MailAddress[] | string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}

export interface MailResult {
  id: string | null;
  accepted: string[];
  rejected: string[];
}
