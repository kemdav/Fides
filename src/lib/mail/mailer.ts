import nodemailer, { type Transporter } from "nodemailer";
import { getServerEnv } from "@/lib/env";
import type { MailMessage, MailResult } from "./types";

/** Transport-agnostic contract for sending transactional email. */
export interface Mailer {
  send(message: MailMessage): Promise<MailResult>;
}

function toAddressList(value: MailMessage["to"]): string[] {
  const entries = Array.isArray(value) ? value : [value];
  return entries.map((entry) => (typeof entry === "string" ? entry : entry.address));
}

/** SMTP-backed mailer (SendGrid / Resend / Brevo / any relay). */
class SmtpMailer implements Mailer {
  constructor(
    private readonly transporter: Transporter,
    private readonly from: string
  ) {}

  async send(message: MailMessage): Promise<MailResult> {
    const info = await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
    });

    return {
      id: info.messageId ?? null,
      accepted: (info.accepted ?? []).map((entry) => String(entry)),
      rejected: (info.rejected ?? []).map((entry) => String(entry)),
    };
  }
}

/** Development mailer that logs to the server console instead of sending. */
class ConsoleMailer implements Mailer {
  async send(message: MailMessage): Promise<MailResult> {
    const accepted = toAddressList(message.to);
    console.info("[mail] console transport", {
      to: accepted,
      subject: message.subject,
    });
    return { id: null, accepted, rejected: [] };
  }
}

let cachedMailer: Mailer | null = null;

/**
 * Returns the configured transactional mailer. Falls back to a console
 * transport when SMTP credentials are absent (local development / build).
 *
 * Feature modules should call `getMailer().send(...)` rather than talking to
 * nodemailer directly, so the transport can be swapped without code changes.
 */
export function getMailer(): Mailer {
  if (cachedMailer) return cachedMailer;

  const env = getServerEnv();

  if (!env.SMTP_HOST || !env.MAIL_FROM_EMAIL) {
    cachedMailer = new ConsoleMailer();
    return cachedMailer;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });

  const from = `${env.MAIL_FROM_NAME} <${env.MAIL_FROM_EMAIL}>`;
  cachedMailer = new SmtpMailer(transporter, from);
  return cachedMailer;
}
