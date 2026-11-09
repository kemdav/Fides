import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getServerEnv } from "@/lib/env";
import type { MailMessage, MailResult } from "./types";

export class MailNotConfiguredError extends Error {
  constructor() {
    super("Email delivery is not configured. Set the SMTP_* and MAIL_FROM_EMAIL values in .env.local.");
    this.name = "MailNotConfiguredError";
  }
}

let cachedTransporter: Transporter | null = null;

export function isMailConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.SMTP_HOST && env.MAIL_FROM_EMAIL);
}

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;
  const env = getServerEnv();
  if (!env.SMTP_HOST || !env.MAIL_FROM_EMAIL) throw new MailNotConfiguredError();

  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return cachedTransporter;
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const transporter = getTransporter();
  const env = getServerEnv();

  const info = await transporter.sendMail({
    from: `${env.MAIL_FROM_NAME} <${env.MAIL_FROM_EMAIL}>`,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
    replyTo: message.replyTo,
    attachments: message.attachments,
  });

  const accepted = (info.accepted ?? []).map((entry) => String(entry));
  const rejected = (info.rejected ?? []).map((entry) => String(entry));

  if (accepted.length === 0) {
    throw new Error("The mail server did not accept the recipient address.");
  }

  return { id: info.messageId ?? null, accepted, rejected };
}
