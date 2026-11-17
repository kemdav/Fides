// Checks everything the email features depend on and tells you what is still missing.
//   npm run email:check                  -> read-only checks (no email is sent)
//   npm run email:check -- you@mail.com  -> also sends one real test email through the configured transport
// Use Next.js' own environment loader so .env.local and .env are read consistently with the app.
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

nextEnv.loadEnvConfig(process.cwd(), true);

const TEST_SENDER = "onboarding@resend.dev";
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => { console.log(`  ✗ ${m}`); failures++; };
const warn = (m) => console.log(`  ! ${m}`);
let failures = 0;
const placeholder = (v) => !v || /<[^<>]+>/.test(v) || /^re_x+$/i.test(v.trim());

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = placeholder(process.env.MAIL_FROM_EMAIL) ? undefined : process.env.MAIL_FROM_EMAIL.trim();
const fromName = process.env.MAIL_FROM_NAME || "Fides";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const cloudIsActive = process.env.FIDES_DB === "CLOUD" || (!process.env.FIDES_DB && !/localhost|127\.0\.0\.1/i.test(process.env.NEXT_PUBLIC_SUPABASE_URL || ""));
const supabaseUrl = process.env.CLOUD_SUPABASE_URL || (cloudIsActive ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined);
const cloudPublicKey = process.env.CLOUD_SUPABASE_PUBLISHABLE_KEY || process.env.CLOUD_SUPABASE_PUBLIC_KEY ||
  process.env.CLOUD_SUPABASE_ANON_KEY || (cloudIsActive ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined);
const secretKey = process.env.CLOUD_SUPABASE_SECRET_KEY || process.env.CLOUD_SUPABASE_SERVICE_ROLE_KEY ||
  (cloudIsActive ? process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY : undefined);
const testRecipient = placeholder(process.env.MAIL_TEST_RECIPIENT) ? undefined : process.env.MAIL_TEST_RECIPIENT.trim();
const sender = fromEmail ?? TEST_SENDER;
const usingTestSender = sender.toLowerCase() === TEST_SENDER;
const smtpUser = placeholder(process.env.SMTP_USER) ? undefined : process.env.SMTP_USER;
const smtpPass = placeholder(process.env.SMTP_PASS) ? undefined : process.env.SMTP_PASS.replace(/\s+/g, "");
const smtpReady = !placeholder(process.env.SMTP_HOST) && smtpUser && smtpPass && !!fromEmail;
const edgeReady = !placeholder(process.env.FIDES_EMAIL_FUNCTION_SECRET) && !placeholder(process.env.NEXT_PUBLIC_SUPABASE_URL);
const available = { resend: !placeholder(apiKey), edge: !!edgeReady, smtp: !!smtpReady };
const configuredTransport = process.env.MAIL_TRANSPORT;
const selectedTransport =
  (configuredTransport && available[configuredTransport] ? configuredTransport : null) ??
  (available.resend ? "resend" : available.edge ? "edge" : available.smtp ? "smtp" : null);

console.log("\n1. Environment (.env.local)");
if (selectedTransport === "resend") ok("RESEND_API_KEY is set and Resend is selected.");
else if (placeholder(apiKey)) warn(`RESEND_API_KEY is not set; it is not required for ${selectedTransport || "an unconfigured transport"}.`);
else ok("RESEND_API_KEY is set.");
if (placeholder(supabaseUrl)) bad("CLOUD_SUPABASE_URL is missing (account registration and reset codes use Supabase Cloud).");
else ok("Cloud Supabase URL is set.");
if (placeholder(cloudPublicKey)) bad("CLOUD_SUPABASE_PUBLIC_KEY is missing (Cloud account sign-in needs this key).");
else ok("Cloud Supabase public key is set.");
if (placeholder(secretKey)) bad("CLOUD_SUPABASE_SECRET_KEY is missing (needed to store account applications and reset codes).");
else ok("Cloud Supabase secret key is set.");
if (usingTestSender) {
  warn(`Sender is Resend's test address (${TEST_SENDER}). It can ONLY deliver to your own Resend account email.`);
  if (testRecipient) ok(`MAIL_TEST_RECIPIENT=${testRecipient}: all emails are redirected there while testing.`);
  else warn("Set MAIL_TEST_RECIPIENT=<your Resend account email> to test, or verify a domain and set MAIL_FROM_EMAIL.");
} else {
  ok(`Sender: ${fromName} <${sender}>`);
}
if (/localhost|127\.0\.0\.1/.test(siteUrl)) warn(`NEXT_PUBLIC_SITE_URL is ${siteUrl}. The login link in the "Account approved" email will point there. Set your real https:// URL in production.`);
else ok(`NEXT_PUBLIC_SITE_URL=${siteUrl}`);

console.log(`\n1b. Email transport (${selectedTransport || "none"})`);
if (selectedTransport === "smtp" && !placeholder(process.env.SMTP_HOST) && smtpUser && smtpPass) {
  const { default: nodemailer } = await import("nodemailer");
  try {
    await nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === "true", auth: { user: smtpUser, pass: smtpPass } }).verify();
    ok(`SMTP login works for ${smtpUser}.`);
    if (fromEmail && fromEmail.toLowerCase() !== smtpUser.toLowerCase()) warn(`MAIL_FROM_EMAIL (${fromEmail}) differs from SMTP_USER (${smtpUser}). Gmail will rewrite the sender; make them the same.`);
  } catch (e) { bad(`SMTP login failed: ${e.message}`); }
} else if (!selectedTransport) bad("No usable email transport is configured. Check SMTP settings or configure Resend.");
else if (selectedTransport !== "smtp") ok(`${selectedTransport} is selected; SMTP check skipped.`);

console.log("\n2. Resend");
const resend = selectedTransport === "resend" ? new Resend(apiKey) : null;
if (!resend) console.log("  - skipped (Resend is not the selected transport).");
if (resend) {
  const { data, error } = await resend.domains.list();
  if (error) {
    // A "sending access only" key cannot list domains; that is fine.
    if (/restricted|only send/i.test(error.message)) warn("This key is send-only, so domains cannot be listed. That is fine.");
    else bad(`Could not reach Resend: ${error.message}. Check your internet connection and the API key.`);
  } else {
    const domains = data?.data ?? [];
    if (!usingTestSender) {
      const domain = sender.split("@")[1]?.toLowerCase();
      const match = domains.find((d) => d.name.toLowerCase() === domain);
      if (!match) bad(`The domain "${domain}" is not added in Resend. Add it at https://resend.com/domains.`);
      else if (match.status !== "verified") bad(`Domain "${domain}" is "${match.status}" in Resend. Add the DNS records it shows, then click Verify.`);
      else ok(`Domain "${domain}" is verified.`);
    } else {
      const verified = domains.filter((d) => d.status === "verified").map((d) => d.name);
      if (verified.length) warn(`You have a verified domain (${verified.join(", ")}). Set MAIL_FROM_EMAIL=no-reply@<that domain> to email real users.`);
      else warn("No verified domain yet. Real applicants will NOT receive email until you verify one.");
    }
  }
}

console.log("\n3. Supabase tables");
if (!placeholder(supabaseUrl) && !placeholder(secretKey)) {
  const db = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const [table, fix, column] of [
    ["account_applications", "run supabase/migrations/AUTH/00012_account_applications.sql in the SQL Editor", "*"],
    ["application_documents", "run supabase/migrations/AUTH/00013_application_documents.sql", "user_id"],
    ["password_reset_codes", "run supabase/migrations/AUTH/00015_password_reset_codes.sql (forgot-password needs it)", "*"],
  ]) {
    const { error } = await db.from(table).select(column, { head: true, count: "exact" }).limit(1);
    if (!error) ok(`Table ${table} exists.`);
    else if (/fetch failed/i.test(error.message)) bad(`Could not reach Supabase (${error.message}). Check your internet connection and CLOUD_SUPABASE_URL.`);
    else bad(`Table ${table} is not reachable (${error.message}). Fix: ${fix}.`);
  }
  const { data: bucket, error: bucketError } = await db.storage.getBucket("application-documents");
  if (!bucketError && bucket) ok("Storage bucket application-documents exists.");
  else bad(`Storage bucket application-documents is not reachable (${bucketError?.message ?? "not found"}). Run the account-application storage setup in Supabase Cloud.`);
}

const target = process.argv[2];
if (target && selectedTransport === "smtp") {
  console.log(`\n4. Test email to ${target}`);
  const { default: nodemailer } = await import("nodemailer");
  try {
    const info = await nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: smtpUser, pass: smtpPass },
    }).sendMail({
      from: `${fromName} <${sender}>`,
      to: target,
      subject: "Fides email check",
      text: "It works! Fides can send email through SMTP.",
      html: "<p>It works! Fides can send email through SMTP.</p>",
    });
    ok(`Sent to ${(info.accepted ?? []).map(String).join(", ") || target}. Message id: ${info.messageId}`);
  } catch (e) {
    bad(`Send failed: ${e.message}`);
  }
} else if (target && resend) {
  console.log(`\n4. Test email to ${target}`);
  const to = usingTestSender && testRecipient ? testRecipient : target;
  const { data, error } = await resend.emails.send({
    from: `${fromName} <${sender}>`,
    to: [to],
    subject: "Fides email check",
    html: "<p>It works! Fides can send email through Resend.</p>",
  });
  if (error) bad(`Send failed: ${error.message}`);
  else ok(`Sent to ${to}. Resend id: ${data?.id}`);
} else if (target && selectedTransport === "edge") {
  console.log(`\n4. Test email to ${target}`);
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/functions/v1/send-fides-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-fides-secret": process.env.FIDES_EMAIL_FUNCTION_SECRET },
      body: JSON.stringify({ to: [target], subject: "Fides email check", text: "It works!", html: "<p>It works!</p>" }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) bad(`Send failed: ${result.error || `Email function responded with ${response.status}.`}`);
    else ok(`Sent to ${target}.`);
  } catch (e) {
    bad(`Send failed: ${e.message}`);
  }
}

console.log(failures ? `\n${failures} problem(s) found. Fix the ✗ lines above, then run this again.\n` : "\nAll checks passed.\n");
process.exit(failures ? 1 : 0);
