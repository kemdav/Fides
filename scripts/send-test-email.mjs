// Sends one test email through the configured transport.
//   npm run email:test                 -> Resend's safe inbox, or an explicit SMTP recipient
//   npm run email:test -- you@mail.com -> sends to that address
import nextEnv from "@next/env";
import nodemailer from "nodemailer";
import { Resend } from "resend";

// Keep environment loading consistent with the Next.js app.
nextEnv.loadEnvConfig(process.cwd(), true);

const isPlaceholder = (value) => !value || /<[^<>]+>/.test(value) || /^re_x+$/i.test(value.trim());
const apiKey = isPlaceholder(process.env.RESEND_API_KEY) ? undefined : process.env.RESEND_API_KEY;
const fromEmail = isPlaceholder(process.env.MAIL_FROM_EMAIL) ? undefined : process.env.MAIL_FROM_EMAIL.trim();
const smtpReady = !isPlaceholder(process.env.SMTP_HOST) && !isPlaceholder(process.env.SMTP_USER) && !isPlaceholder(process.env.SMTP_PASS) && !!fromEmail;
const edgeReady = !isPlaceholder(process.env.FIDES_EMAIL_FUNCTION_SECRET) && !isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_URL);
const available = { resend: !!apiKey, edge: edgeReady, smtp: smtpReady };
const configuredTransport = process.env.MAIL_TRANSPORT;
const transport =
  (configuredTransport && available[configuredTransport] ? configuredTransport : null) ??
  (available.resend ? "resend" : available.edge ? "edge" : available.smtp ? "smtp" : null);

if (!transport) {
  console.error("No email transport is configured. Set SMTP_HOST / SMTP_USER / SMTP_PASS / MAIL_FROM_EMAIL or configure Resend.");
  process.exit(1);
}

const fromName = process.env.MAIL_FROM_NAME || "Fides";
const sharedSender = "onboarding@resend.dev";
const sender = fromEmail || sharedSender;
const testRecipient = isPlaceholder(process.env.MAIL_TEST_RECIPIENT) ? undefined : process.env.MAIL_TEST_RECIPIENT.trim();
const requestedRecipient = process.argv[2]?.trim();
const to =
  transport === "resend" && sender.toLowerCase() === sharedSender && testRecipient
    ? testRecipient
    : requestedRecipient || (transport === "resend" ? "delivered@resend.dev" : testRecipient);

if (!to) {
  console.error("SMTP and Edge email tests require a recipient. Run: npm run email:test -- you@mail.com");
  process.exit(1);
}

const message = {
  to,
  from: `${fromName} <${sender}>`,
  subject: "Fides test email",
  text: "It works! Fides can send email through the configured transport.",
  html: "<p>It works! Fides can send email through the configured transport.</p>",
};

try {
  if (transport === "resend") {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: message.from,
      to: [to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    if (error) throw new Error(error.message);
    console.log(`Sent via Resend to ${to}. Resend id: ${data?.id}`);
  } else if (transport === "smtp") {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      requireTLS: process.env.SMTP_SECURE !== "true",
      family: 4,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS.replace(/\s+/g, "") },
    });
    const info = await transporter.sendMail(message);
    const accepted = (info.accepted ?? []).map(String);
    if (!accepted.length) throw new Error("The mail server did not accept the recipient address.");
    console.log(`Sent via SMTP to ${accepted.join(", ")}. Message id: ${info.messageId}`);
  } else {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/functions/v1/send-fides-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-fides-secret": process.env.FIDES_EMAIL_FUNCTION_SECRET,
      },
      body: JSON.stringify({ to: [to], subject: message.subject, text: message.text, html: message.html }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Email function responded with ${response.status}.`);
    console.log(`Sent via Supabase Edge Function to ${to}. Message id: ${result.id ?? "not provided"}`);
  }
} catch (error) {
  console.error("Send failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
