// Checks everything the email features depend on and tells you what is still missing.
//   npm run email:check                  -> read-only checks (no email is sent)
//   npm run email:check -- you@mail.com  -> also sends one real test email to that address
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

config({ path: ".env.local" });
config();

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
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const testRecipient = placeholder(process.env.MAIL_TEST_RECIPIENT) ? undefined : process.env.MAIL_TEST_RECIPIENT.trim();
const sender = fromEmail ?? TEST_SENDER;
const usingTestSender = sender.toLowerCase() === TEST_SENDER;

console.log("\n1. Environment (.env.local)");
if (placeholder(apiKey)) bad("RESEND_API_KEY is missing or still a placeholder.");
else ok("RESEND_API_KEY is set.");
if (placeholder(supabaseUrl)) bad("NEXT_PUBLIC_SUPABASE_URL is missing.");
else ok("NEXT_PUBLIC_SUPABASE_URL is set.");
if (placeholder(secretKey)) bad("SUPABASE_SECRET_KEY is missing (needed to store reset codes).");
else ok("SUPABASE_SECRET_KEY is set.");
if (usingTestSender) {
  warn(`Sender is Resend's test address (${TEST_SENDER}). It can ONLY deliver to your own Resend account email.`);
  if (testRecipient) ok(`MAIL_TEST_RECIPIENT=${testRecipient}: all emails are redirected there while testing.`);
  else warn("Set MAIL_TEST_RECIPIENT=<your Resend account email> to test, or verify a domain and set MAIL_FROM_EMAIL.");
} else {
  ok(`Sender: ${fromName} <${sender}>`);
}
if (/localhost|127\.0\.0\.1/.test(siteUrl)) warn(`NEXT_PUBLIC_SITE_URL is ${siteUrl}. The login link in the "Account approved" email will point there. Set your real https:// URL in production.`);
else ok(`NEXT_PUBLIC_SITE_URL=${siteUrl}`);

console.log("\n1b. SMTP (Gmail)");
const smtpUser = placeholder(process.env.SMTP_USER) ? undefined : process.env.SMTP_USER;
const smtpPass = placeholder(process.env.SMTP_PASS) ? undefined : process.env.SMTP_PASS.replace(/\s+/g, "");
if (process.env.MAIL_TRANSPORT === "smtp" && !placeholder(process.env.SMTP_HOST) && smtpUser && smtpPass) {
  const { default: nodemailer } = await import("nodemailer");
  try {
    await nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === "true", auth: { user: smtpUser, pass: smtpPass } }).verify();
    ok(`SMTP login works for ${smtpUser}.`);
    if (fromEmail && fromEmail.toLowerCase() !== smtpUser.toLowerCase()) warn(`MAIL_FROM_EMAIL (${fromEmail}) differs from SMTP_USER (${smtpUser}). Gmail will rewrite the sender; make them the same.`);
  } catch (e) { bad(`SMTP login failed: ${e.message}`); }
} else if (process.env.MAIL_TRANSPORT === "smtp") bad("MAIL_TRANSPORT=smtp but SMTP_HOST / SMTP_USER / SMTP_PASS are not all filled in.");
else ok("MAIL_TRANSPORT is not smtp; skipping.");

console.log("\n2. Resend");
const resend = placeholder(apiKey) || process.env.MAIL_TRANSPORT === "smtp" ? null : new Resend(apiKey);
if (!resend) console.log("  - skipped (using SMTP, or no Resend key).");
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
  for (const [table, fix] of [
    ["account_applications", "run supabase/fides_account_setup.sql in the SQL Editor"],
    ["application_documents", "run supabase/migrations/00012_application_documents.sql"],
    ["password_reset_codes", "run supabase/migrations/00013_password_reset_codes.sql (forgot-password needs it)"],
  ]) {
    const { error } = await db.from(table).select("*", { head: true, count: "exact" }).limit(1);
    if (!error) ok(`Table ${table} exists.`);
    else if (/fetch failed/i.test(error.message)) bad(`Could not reach Supabase (${error.message}). Check your internet connection and NEXT_PUBLIC_SUPABASE_URL.`);
    else bad(`Table ${table} is not reachable (${error.message}). Fix: ${fix}.`);
  }
}

const target = process.argv[2];
if (target && resend) {
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
}

console.log(failures ? `\n${failures} problem(s) found. Fix the ✗ lines above, then run this again.\n` : "\nAll checks passed.\n");
process.exit(failures ? 1 : 0);
