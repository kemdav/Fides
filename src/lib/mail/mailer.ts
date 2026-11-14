import "server-only";
import fs from "node:fs";
import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";
import { getServerEnv, publicEnv } from "@/lib/env";
import type { MailMessage, MailResult } from "./types";

/** Resend's shared sender. Works for testing only: it can deliver just to the Resend account owner. */
export const RESEND_TEST_SENDER = "onboarding@resend.dev";

export type MailTransport = "resend" | "edge" | "smtp";

export class MailNotConfiguredError extends Error {
  constructor() {
    super("Email delivery is not configured. Set RESEND_API_KEY (and MAIL_FROM_EMAIL) in .env.local. See .env.example.");
    this.name = "MailNotConfiguredError";
  }
}

function edgeFunctionUrl(): string | null {
  return publicEnv.supabaseUrl ? `${publicEnv.supabaseUrl.replace(/\/$/, "")}/functions/v1/send-fides-email` : null;
}

/** Decides how mail is sent. Returns null when nothing is configured. */
export function resolveTransport(): MailTransport | null {
  const env = getServerEnv();
  const available: Record<MailTransport, boolean> = {
    resend: Boolean(env.RESEND_API_KEY),
    edge: Boolean(env.FIDES_EMAIL_FUNCTION_SECRET && edgeFunctionUrl()),
    smtp: Boolean(env.SMTP_HOST && env.MAIL_FROM_EMAIL),
  };
  if (env.MAIL_TRANSPORT && available[env.MAIL_TRANSPORT]) return env.MAIL_TRANSPORT;
  if (available.resend) return "resend";
  if (available.edge) return "edge";
  if (available.smtp) return "smtp";
  return null;
}

export function isMailConfigured(): boolean {
  return resolveTransport() !== null;
}

function fromAddress(transport: MailTransport): string {
  const env = getServerEnv();
  const email = env.MAIL_FROM_EMAIL ?? (transport === "smtp" ? undefined : RESEND_TEST_SENDER);
  if (!email) throw new MailNotConfiguredError();
  return `${env.MAIL_FROM_NAME} <${email}>`;
}

/** Reads attachments, silently dropping any that cannot be read (e.g. a file missing from a serverless bundle). */
function readableAttachments(items: MailMessage["attachments"]) {
  const result: { filename: string; content: Buffer; cid: string }[] = [];
  for (const item of items ?? []) {
    try {
      result.push({ filename: item.filename, content: fs.readFileSync(item.path), cid: item.cid });
    } catch (error) {
      console.warn(`[mail] Skipping attachment ${item.filename}:`, error instanceof Error ? error.message : error);
    }
  }
  return result;
}

/**
 * Resend's shared test sender can only deliver to the Resend account owner. When MAIL_TEST_RECIPIENT
 * is set, redirect mail there (original recipient shown in the subject) so every flow stays testable.
 */
function applySandboxRedirect(message: MailMessage, transport: MailTransport): { to: string[]; subject: string } {
  const env = getServerEnv();
  const to = recipients(message.to);
  const usingTestSender = transport === "resend" && (env.MAIL_FROM_EMAIL ?? RESEND_TEST_SENDER) === RESEND_TEST_SENDER;
  if (usingTestSender && env.MAIL_TEST_RECIPIENT) {
    console.warn(`[mail] Sandbox sender in use: redirecting "${message.subject}" for ${to.join(", ")} to ${env.MAIL_TEST_RECIPIENT}.`);
    return { to: [env.MAIL_TEST_RECIPIENT], subject: `[to: ${to.join(", ")}] ${message.subject}` };
  }
  return { to, subject: message.subject };
}

function recipients(to: MailMessage["to"]): string[] {
  const list = Array.isArray(to) ? to : [to];
  return list.map((entry) => (typeof entry === "string" ? entry : entry.name ? `${entry.name} <${entry.address}>` : entry.address));
}

/* ------------------------------------------------------------------ Resend */

let cachedResend: Resend | null = null;

async function sendWithResend(message: MailMessage): Promise<MailResult> {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY) throw new MailNotConfiguredError();
  cachedResend ??= new Resend(env.RESEND_API_KEY);

  const { to, subject } = applySandboxRedirect(message, "resend");
  const attachments = readableAttachments(message.attachments);
  const { data, error } = await cachedResend.emails.send({
    from: fromAddress("resend"),
    to,
    subject,
    html: message.html,
    text: message.text,
    replyTo: message.replyTo,
    attachments: attachments.length ? attachments.map((item) => ({ filename: item.filename, content: item.content, contentId: item.cid })) : undefined,
  } as Parameters<Resend["emails"]["send"]>[0]);

  if (error) throw new Error(describeResendError(error));
  return { id: data?.id ?? null, accepted: to, rejected: [] };
}

function describeResendError(error: { name?: string; message: string }): string {
  if (/only send testing emails to your own email/i.test(error.message) || /verify a domain/i.test(error.message)) {
    return "Resend only allows the shared test sender (onboarding@resend.dev) to email the Resend account owner. Verify your domain at resend.com/domains and set MAIL_FROM_EMAIL to an address on it, or set MAIL_TEST_RECIPIENT to your own Resend email while testing.";
  }
  if (/domain is not verified/i.test(error.message)) {
    return `The sender domain in MAIL_FROM_EMAIL is not verified in Resend yet. ${error.message}`;
  }
  if (/api key is invalid|invalid api key|restricted_api_key|API key/i.test(error.message)) {
    return "Resend rejected RESEND_API_KEY. Create a key with 'Sending access' at resend.com/api-keys and update .env.local.";
  }
  return error.message;
}

/* ------------------------------------------------------- Supabase Edge Fn */

async function sendWithEdgeFunction(message: MailMessage): Promise<MailResult> {
  const env = getServerEnv();
  const url = edgeFunctionUrl();
  if (!url || !env.FIDES_EMAIL_FUNCTION_SECRET) throw new MailNotConfiguredError();

  const to = recipients(message.to);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-fides-secret": env.FIDES_EMAIL_FUNCTION_SECRET },
    body: JSON.stringify({
      to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
      attachments: message.attachments?.map((item) => ({
        filename: item.filename,
        contentBase64: fs.readFileSync(item.path).toString("base64"),
        contentId: item.cid,
      })),
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!response.ok) throw new Error(body.error ?? `Email function responded with ${response.status}.`);
  return { id: body.id ?? null, accepted: to, rejected: [] };
}

/* -------------------------------------------------------------------- SMTP */

let cachedTransporter: Transporter | null = null;

async function sendWithSmtp(message: MailMessage): Promise<MailResult> {
  const env = getServerEnv();
  if (!env.SMTP_HOST || !env.MAIL_FROM_EMAIL) throw new MailNotConfiguredError();
  cachedTransporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    // Google shows app passwords as "abcd efgh ijkl mnop"; the spaces are not part of the password.
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS?.replace(/\s+/g, "") } : undefined,
  });

  const info = await cachedTransporter.sendMail({
    from: fromAddress("smtp"),
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
    replyTo: message.replyTo,
    attachments: message.attachments,
  });
  const accepted = (info.accepted ?? []).map((entry) => String(entry));
  const rejected = (info.rejected ?? []).map((entry) => String(entry));
  if (accepted.length === 0) throw new Error("The mail server did not accept the recipient address.");
  return { id: info.messageId ?? null, accepted, rejected };
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const transport = resolveTransport();
  const label = `"${message.subject}" -> ${recipients(message.to).join(", ")}`;
  if (!transport) {
    console.error(`[mail] NOT SENT ${label}: no email transport is configured (check SMTP_HOST / MAIL_FROM_EMAIL in .env.local, then restart the dev server).`);
    throw new MailNotConfiguredError();
  }
  try {
    const result =
      transport === "resend" ? await sendWithResend(message) : transport === "edge" ? await sendWithEdgeFunction(message) : await sendWithSmtp(message);
    console.log(`[mail] sent via ${transport}: ${label} (accepted: ${result.accepted.join(", ") || "none"})`);
    return result;
  } catch (error) {
    console.error(`[mail] FAILED via ${transport}: ${label}:`, error instanceof Error ? error.message : error);
    throw error;
  }
}
