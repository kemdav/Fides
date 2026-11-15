// Sends one test email through Resend using the values in .env.local.
//   npm run email:test                 -> sends to delivered@resend.dev (Resend's safe test inbox)
//   npm run email:test -- you@mail.com -> sends to that address
import { config } from "dotenv";
import { Resend } from "resend";

config({ path: ".env.local" });
config(); // also read .env if present

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey || /^re_x+$/i.test(apiKey)) {
  console.error("RESEND_API_KEY is missing or still the placeholder. Set it in .env.local.");
  process.exit(1);
}

const name = process.env.MAIL_FROM_NAME || "Fides";
const sender = process.env.MAIL_FROM_EMAIL || "onboarding@resend.dev";
const to = process.argv[2] || "delivered@resend.dev";

const resend = new Resend(apiKey);
const { data, error } = await resend.emails.send({
  from: `${name} <${sender}>`,
  to: [to],
  subject: "Fides test email",
  html: "<p>It works! Fides can send email through Resend.</p>",
});

if (error) {
  console.error("Send failed:", error.message);
  process.exit(1);
}
console.log(`Sent to ${to}. Resend id: ${data?.id}`);
