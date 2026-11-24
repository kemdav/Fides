import "server-only";
import { normalizeBrandColor as emailColor, colorLuminance as emailLuminance, readableForeground as emailForeground } from "@/lib/brand-colors";
import { publicEnv } from "@/lib/env";
import { formatPeso } from "@/lib/registration/options";
import { sendMail } from "./mailer";

const systemEmailFonts = {
  body: "Mulish, 'Segoe UI', Arial, sans-serif",
  heading: "Ovo, Georgia, 'Times New Roman', serif",
};
const merchantEmailFonts = {
  body: "Inter, 'Segoe UI', Arial, sans-serif",
  heading: "'Playfair Display', Georgia, 'Times New Roman', serif",
};

function emailFontStylesheet(useMerchantFonts = false) {
  const families = (useMerchantFonts ? "family=Inter:wght@400;600;700&amp;" : "")
    + "family=Mulish:wght@400;600;700&amp;family=Ovo"
    + (useMerchantFonts ? "&amp;family=Playfair+Display" : "");
  return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${families}&amp;display=swap">`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailContrast(a: string, b: string): number {
  const la = emailLuminance(a);
  const lb = emailLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Mixes `color` toward `target` (e.g. "#ffffff" for a tint, "#000000" for a shade). amount: 0 to 1. */
function emailMix(color: string, target: string, amount: number): string {
  const channel = (hex: string, start: number) =>
    Number.parseInt(hex.slice(start, start + 2), 16);
  return (
    "#" +
    [1, 3, 5]
      .map((start) =>
        Math.round(
          channel(color, start) * (1 - amount) +
            channel(target, start) * amount,
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/** Darkens the accent just enough that white text and links on white pass 4.5:1 contrast. */
function emailStrongAccent(accent: string): string {
  let color = accent;
  for (let i = 0; i < 12 && emailContrast(color, "#ffffff") < 4.5; i++) {
    color = emailMix(color, "#000000", 0.08);
  }
  return color;
}

type StaffMessageRecipient = {
  name: string;
  merchant: string;
  typography?: string | null;
  colors: {
    brand: string | null;
    secondary: string | null;
    accent: string | null;
  };
};

export function staffInvitationMessage(input: StaffMessageRecipient & { invitationUrl: URL; signInUrl: URL }) {
  return renderStaffMessage({ ...input, url: input.invitationUrl, kind: "invitation" });
}

export function staffEmailVerificationMessage(input: StaffMessageRecipient & { verificationUrl: URL; minutesValid: number }) {
  return renderStaffMessage({ ...input, url: input.verificationUrl, kind: "verification" });
}

function renderStaffMessage(input: StaffMessageRecipient & { url: URL } & (
  | { kind: "invitation"; signInUrl: URL }
  | { kind: "verification"; minutesValid: number }
)) {
  const isInvitation = input.kind === "invitation";
  const label = isInvitation ? "Staff invitation" : "Email verification";
  const heading = isInvitation ? `Join ${input.merchant} on Fides` : "Verify your new email address";
  const preheader = isInvitation
    ? `${input.merchant} invited you to join their team on Fides. Accept within 7 days.`
    : `Confirm your new sign-in email for ${input.merchant}.`;
  const body = isInvitation
    ? `${input.merchant} has invited you to join their team. Accept the invitation to set up your staff account and get started.`
    : `A request was made to use this email address to sign in to ${input.merchant} on Fides. Verify the new address to finish the change.`;
  const button = isInvitation ? "Accept invitation" : "Verify Email";
  const expiry = isInvitation ? "This invitation expires in 7 days." : `This verification link expires in ${input.minutesValid} minutes.`;
  const closing = isInvitation
    ? "If you weren't expecting this invitation, you can safely ignore this email."
    : "If you weren't expecting this change, you can safely ignore this email. Your current sign-in email will stay active.";
  const steps = isInvitation
    ? [
        { text: "Accept your invitation using the button above." },
        { text: "Set up or sign in to your staff account." },
        { text: "Come back any time through the staff portal.", link: { label: "staff portal", url: input.signInUrl.toString() } },
      ]
    : [
        { text: "Open the verification page using the button above." },
        { text: "Enter your current Fides password." },
        { text: "Once verified, you'll be signed in and taken to your workspace dashboard." },
      ];

  return renderActionEmail({
    brandName: input.merchant,
    name: input.name,
    colors: input.colors,
    typography: input.typography,
    subject: isInvitation ? `${input.merchant} invited you to join their team on Fides` : "Verify your new Fides email address",
    label,
    heading,
    preheader,
    body: [body],
    action: { label: button, url: input.url.toString() },
    note: expiry,
    steps,
    closing,
  });
}

type ActionEmail = {
  brandName?: string;
  header?: "fides-wordmark";
  wordmarkAccent?: boolean;
  name?: string;
  colors?: StaffMessageRecipient["colors"];
  typography?: string | null;
  subject: string;
  label: string;
  heading: string;
  preheader: string;
  body: string[];
  action: { label: string; url: string } | { code: string; boxed?: boolean };
  note?: string;
  steps: { text: string; link?: { label: string; url: string } }[];
  closing: string;
  footer?: string;
};

function renderActionEmail(input: ActionEmail) {
  const { label, heading, preheader, body, action, note, steps, closing } = input;
  const brandName = input.brandName ?? "Fides";
  const brand = emailColor(input.colors?.brand ?? null, "#ffffeb");
  const secondary = emailColor(input.colors?.secondary ?? null, "#09101d");
  const accent = emailColor(input.colors?.accent ?? null, "#c35000");

  // One accent family drives the whole email so every colored element feels related.
  const strong = emailStrongAccent(accent); // button, links, labels (always readable with white)
  const soft = emailMix(accent, "#ffffff", 0.9); // header band
  const panel = emailMix(accent, "#ffffff", 0.95); // steps panel + footer
  const line = emailMix(accent, "#ffffff", 0.82); // dividers, step badges
  const outline = emailMix(accent, "#ffffff", 0.55); // card + panel outline (clearly visible)

  const pageBackground = emailLuminance(brand) > 0.85 ? brand : "#f6f7f9";
  const headingColor = emailForeground("#ffffff", secondary);

  const initial = escapeHtml(
    (Array.from(brandName.trim())[0] ?? "F").toUpperCase(),
  );
  const greeting = input.name ? `Hi ${input.name},` : null;
  const merchant = escapeHtml(brandName);
  const actionUrl = "url" in action ? escapeHtml(action.url) : null;

  const useMerchantFonts = input.typography === "Playfair + Inter";
  const { body: font, heading: serif } = useMerchantFonts ? merchantEmailFonts : systemEmailFonts;

  const step = (n: number, content: string, last = false) =>
    `<tr>
      <td valign="top" style="width:36px;padding:0 0 ${last ? 0 : 14}px;">
        <div style="width:24px;height:24px;line-height:24px;border-radius:12px;background-color:${line};color:${strong};font-family:${font};font-size:12px;font-weight:700;text-align:center;">${n}</div>
      </td>
      <td valign="top" style="padding:2px 0 ${last ? 0 : 14}px;font-family:${font};font-size:14px;line-height:21px;color:#374151;">${content}</td>
    </tr>`;

  const codeMarkup = "code" in action && (action.boxed
    ? `<table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
         <tr>${Array.from(action.code, (digit) =>
           `<td align="center" valign="middle" width="36" height="36" style="width:36px;height:36px;border:1px solid ${outline};border-radius:6px;background-color:${panel};color:${strong};font-family:Courier,monospace;font-size:26px;line-height:36px;font-weight:700;text-align:center;">${escapeHtml(digit)}</td>`
         ).join('<td width="4" style="width:4px;font-size:0;line-height:0;">&nbsp;</td>')}</tr>
       </table>`
    : `<p style="display:inline-block;margin:0;padding:14px 24px;border:1px solid ${outline};border-radius:8px;background-color:${panel};font-family:Courier,monospace;font-size:26px;letter-spacing:6px;font-weight:700;color:${strong};">${escapeHtml(action.code)}</p>`);

  return {
    subject: input.subject,
    text: [
      ...(greeting ? [greeting, ""] : []),
      ...body.flatMap((paragraph) => [paragraph, ""]),
      ...("url" in action ? [action.label, action.url] : [`Code: ${action.code}`]),
      "",
      ...(note ? [note, ""] : []),
      "What happens next:",
      ...steps.flatMap(({ text, link }, index) => [`${index + 1}. ${text}`, ...(link ? [link.url] : [])]),
      "",
      closing,
      "",
      input.footer ?? "Powered by Fides",
    ].join("\n"),

    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(label)}</title>
  ${emailFontStylesheet(useMerchantFonts)}
  <style>
    body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-collapse:separate; }
    img { border:0; }
    @media only screen and (max-width:600px) {
      .outer { padding:16px 12px !important; }
      .px { padding-left:20px !important; padding-right:20px !important; }
      .h1 { font-size:23px !important; line-height:30px !important; }
      .btn-table { width:100% !important; }
      .btn { display:block !important; padding:16px 20px !important; text-align:center !important; }
      .panel-pad { padding:18px 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${pageBackground};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    ${escapeHtml(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${pageBackground};">
    <tr>
      <td class="outer" align="center" style="padding:32px 16px;">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid ${outline};border-radius:14px;box-shadow:0 6px 20px rgba(17,24,39,0.10),0 1px 3px rgba(17,24,39,0.08);">

          <!-- Sender identity -->
          <tr>
            <td class="px" style="background-color:${soft};border-bottom:1px solid ${outline};border-radius:13px 13px 0 0;padding:20px 32px;">
              ${input.header === "fides-wordmark" ? `
              <div style="font-family:${systemEmailFonts.heading};font-size:38px;line-height:44px;color:${input.wordmarkAccent ? accent : headingColor};">Fides</div>
              <div style="padding-top:4px;font-family:${font};font-size:12px;line-height:18px;letter-spacing:0.6px;text-transform:uppercase;color:${strong};">${escapeHtml(label)}</div>
              ` : `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="middle" style="padding-right:14px;">
                    <div style="width:44px;height:44px;line-height:44px;border-radius:10px;background-color:${strong};color:#ffffff;font-family:${serif};font-size:22px;font-weight:bold;text-align:center;">${initial}</div>
                  </td>
                  <td valign="middle" style="font-family:${font};">
                    <div style="font-family:${serif};font-size:20px;line-height:24px;color:#111827;">${merchant}</div>
                    <div style="font-size:12px;line-height:18px;letter-spacing:0.6px;text-transform:uppercase;color:${strong};">${escapeHtml(label)}</div>
                  </td>
                </tr>
              </table>`}
            </td>
          </tr>

          <!-- Message + button -->
          <tr>
            <td class="px" style="padding:32px 32px 8px;font-family:${font};">
              <h1 class="h1" style="margin:0 0 14px;font-family:${serif};font-size:26px;line-height:34px;font-weight:normal;color:${headingColor};">${escapeHtml(heading)}</h1>
              ${greeting ? `<p style="margin:0 0 6px;font-size:15px;line-height:24px;color:#374151;">${escapeHtml(greeting)}</p>` : ""}
              ${body.map((paragraph, index) => `<p style="margin:0 0 ${index === body.length - 1 ? 26 : 12}px;font-size:15px;line-height:24px;color:#374151;">${escapeHtml(paragraph)}</p>`).join("")}
              ${"url" in action ? `
              <table class="btn-table" role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td bgcolor="${strong}" style="border-radius:8px;background-color:${strong};">
                    <a class="btn" href="${actionUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${font};font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(action.label)}</a>
                  </td>
                </tr>
              </table>` : codeMarkup}
              ${note ? `<p style="margin:14px 0 0;font-size:13px;line-height:20px;color:#6b7280;${"code" in action && action.boxed ? "text-align:center;" : ""}">${escapeHtml(note)}</p>` : ""}
            </td>
          </tr>

          <!-- What happens next -->
          <tr>
            <td class="px" style="padding:24px 32px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${panel};border:1px solid ${outline};border-radius:10px;">
                <tr>
                  <td class="panel-pad" style="padding:20px 22px;">
                    <p style="margin:0 0 14px;font-family:${font};font-size:12px;line-height:18px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#6b7280;">What happens next</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${steps.map(({ text, link }, index) => {
                        const content = escapeHtml(text);
                        const html = link
                          ? content.replace(escapeHtml(link.label), () => `<a href="${escapeHtml(link.url)}" style="color:${strong};font-weight:600;text-decoration:underline;">${escapeHtml(link.label)}</a>`)
                          : content;
                        return step(index + 1, html, index === steps.length - 1);
                      }).join("")}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fallback link + safety note -->
          <tr>
            <td class="px" style="padding:24px 32px 32px;font-family:${font};">
              ${actionUrl ? `<p style="margin:0 0 4px;font-size:12px;line-height:18px;color:#6b7280;">Button not working? Paste this link into your browser:</p>
              <p style="margin:0 0 18px;font-size:12px;line-height:18px;word-break:break-all;overflow-wrap:anywhere;"><a href="${actionUrl}" style="color:${strong};text-decoration:underline;">${actionUrl}</a></p>` : ""}
              <p style="margin:0;font-size:12px;line-height:18px;color:#6b7280;">${escapeHtml(closing)}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:${panel};border-top:1px solid ${outline};border-radius:0 0 13px 13px;padding:18px 24px;font-family:${systemEmailFonts.body};font-size:13px;line-height:normal;color:#c35000;">
              ${input.footer ? escapeHtml(input.footer) : `Powered by <span style="font-family:${systemEmailFonts.heading};font-weight:400;">Fides</span>`}
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}

export function loginUrl(): string {
  return `${publicEnv.siteUrl.replace(/\/$/, "")}/login`;
}

/** Sent after the application and verification documents have been saved. */
export async function sendSubmissionEmail(input: {
  to: string;
  ownerName: string;
  businessName: string;
  referenceCode: string;
}) {
  return sendMail({
    to: input.to,
    ...renderActionEmail({
      name: input.ownerName,
      header: "fides-wordmark",
      label: "Account application",
      subject: "Your Fides account request has been submitted",
      heading: "Account request submitted",
      preheader: "We received your Fides account request.",
      body: [`We received the account request and verification documents for ${input.businessName}.`],
      action: {
        label: "Track application",
        url: `${publicEnv.siteUrl.replace(/\/$/, "")}/request-account/status/${encodeURIComponent(input.referenceCode)}`,
      },
      note: `Application reference: ${input.referenceCode}`,
      steps: [
        { text: "Save your application reference so you can check your status." },
        { text: "Our team will review your application and email you when a decision is made." },
      ],
      closing: "Thank you for choosing Fides.",
    }),
  });
}

/** Sent when the administrator approves the application. */
export async function sendApprovalEmail(input: {
  to: string;
  ownerName: string;
  businessName: string;
  planName: string;
  planPrice: number;
  referenceCode: string;
}) {
  return sendMail({
    to: input.to,
    ...renderActionEmail({
      name: input.ownerName,
      header: "fides-wordmark",
      label: "Account application",
      subject: "Your Fides account has been approved",
      heading: "Account approved",
      preheader: "Your account has been approved. You can now sign in.",
      body: [`Your Fides account for ${input.businessName} has been approved.`],
      action: { label: "Log in to Fides", url: loginUrl() },
      note: `Application reference: ${input.referenceCode}`,
      steps: [
        { text: "Sign in with the email address and password you used to apply." },
        { text: "Open your merchant dashboard to set up your workspace." },
      ],
      closing: "Thank you for choosing Fides.",
    }),
  });
}

export function registerUrl(): string {
  return `${publicEnv.siteUrl.replace(/\/$/, "")}/register`;
}

/** Sent when the administrator rejects the application. */
export async function sendRejectionEmail(input: {
  to: string;
  ownerName: string;
  businessName: string;
  reason: string;
}) {
  return sendMail({
    to: input.to,
    ...renderActionEmail({
      name: input.ownerName,
      header: "fides-wordmark",
      label: "Account application",
      subject: "Your Fides account request was not approved",
      heading: "Account request not approved",
      preheader: "We've reviewed your Fides account request.",
      body: [
        `We could not approve the account request for ${input.businessName}.`,
        `Reason: ${input.reason}`,
      ],
      action: { label: "Create a new account", url: registerUrl() },
      steps: [
        { text: "Review the reason above and make the necessary corrections." },
        { text: "Submit a new application. You can use the same email address." },
      ],
      closing: "Thank you for applying to Fides.",
    }),
  });
}

export async function sendRegistrationCodeEmail(input: { to: string; code: string; minutesValid: number }) {
  return sendMail({
    to: input.to,
    ...renderActionEmail({
      header: "fides-wordmark",
      wordmarkAccent: true,
      label: "Email verification",
      subject: "Verify your email for Fides",
      heading: "Verify your email address",
      preheader: "Enter this code to continue your Fides application.",
      body: ["Use the verification code below to confirm your business email address."],
      action: { code: input.code, boxed: true },
      note: `This code expires in ${input.minutesValid} minutes.`,
      steps: [
        { text: "Return to your Fides application and enter the six-digit code." },
        { text: "Select Confirm to continue to identity verification." },
      ],
      closing: "If you did not request this code, you can safely ignore this email.",
      footer: `© ${new Date().getUTCFullYear()} Fides. All rights reserved.`,
    }),
  });
}

/** Sent by the Forgot Password flow with a 4-character code. */
export async function sendPasswordResetCodeEmail(input: {
  to: string;
  code: string;
  minutesValid: number;
}) {
  return sendMail({
    to: input.to,
    ...renderActionEmail({
      label: "Account recovery",
      subject: `${input.code} is your Fides password reset code`,
      heading: "Password reset code",
      preheader: `Your Fides password reset code is ${input.code}.`,
      body: ["We received a request to reset the password for your Fides account."],
      action: { code: input.code },
      note: `This code expires in ${input.minutesValid} minutes.`,
      steps: [
        { text: "Enter the code in the Fides password reset window." },
        { text: "Choose a new password and use it the next time you sign in." },
      ],
      closing: "If you did not request this, you can safely ignore this email.",
    }),
  });
}

export async function sendBillingReminderEmail(input: {
  to: string;
  ownerName: string;
  businessName: string;
  planName: string;
  planPrice: number;
  billingDate: string;
}) {
  return sendMail({
    to: input.to,
    ...renderActionEmail({
      name: input.ownerName,
      label: "Subscription billing",
      subject: `Fides billing reminder for ${input.businessName}`,
      heading: "Your subscription renews soon",
      preheader: `Your ${input.planName} subscription renews on ${input.billingDate}.`,
      body: [`The ${input.planName} subscription for ${input.businessName} renews on ${input.billingDate} at ${formatPeso(input.planPrice)} per month.`],
      action: { label: "Log in to Fides", url: loginUrl() },
      steps: [{ text: "Sign in to view your Fides account." }],
      closing: "If you have any questions about your subscription, reply to this email.",
    }),
  });
}
