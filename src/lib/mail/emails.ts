import "server-only";
import { publicEnv } from "@/lib/env";
import { formatPeso } from "@/lib/registration/options";
import { sendMail } from "./mailer";

/**
 * The mascot is loaded from the public site (never attached): inline attachments make emails
 * heavier and more likely to be filtered as spam. It is skipped on localhost / non-https sites,
 * where email clients could not load it anyway.
 */
function mascotUrl(): string | null {
  const base = publicEnv.siteUrl.replace(/\/$/, "");
  return /^https:\/\//i.test(base) && !/localhost|127\.0\.0\.1/.test(base)
    ? `${base}/images/mascot/fox-mascot.png`
    : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailColor(value: string | null, fallback: string): string {
  const color = value?.trim();
  if (!color || !/^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(color)) return fallback;
  return color.length === 4
    ? "#" +
        color
          .slice(1)
          .split("")
          .map((channel) => channel.repeat(2))
          .join("")
    : color;
}

function emailLuminance(color: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(color.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function emailForeground(background: string, preferred: string): string {
  const bg = emailLuminance(background);
  const fg = emailLuminance(preferred);
  const ratio = (Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05);
  return ratio >= 4.5 ? preferred : bg > 0.179 ? "#000000" : "#ffffff";
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
          channel(color, start) * (1 - amount) + channel(target, start) * amount,
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

export function staffInvitationMessage(input: {
  name: string;
  merchant: string;
  invitationUrl: URL;
  signInUrl: URL;
  colors: {
    brand: string | null;
    secondary: string | null;
    accent: string | null;
  };
}) {
  const brand = emailColor(input.colors.brand, "#ffffeb");
  const secondary = emailColor(input.colors.secondary, "#09101d");
  const accent = emailColor(input.colors.accent, "#c35000");

  // One accent family drives the whole email so every colored element feels related.
  const strong = emailStrongAccent(accent); // button, links, labels (always readable with white)
  const soft = emailMix(accent, "#ffffff", 0.9); // header band
  const panel = emailMix(accent, "#ffffff", 0.95); // steps panel + footer
  const line = emailMix(accent, "#ffffff", 0.82); // borders, step badges

  const pageBackground = emailLuminance(brand) > 0.85 ? brand : "#f6f7f9";
  const headingColor = emailForeground("#ffffff", secondary);

  const initial = escapeHtml(
    (Array.from(input.merchant.trim())[0] ?? "F").toUpperCase(),
  );
  const name = escapeHtml(input.name);
  const merchant = escapeHtml(input.merchant);
  const invitationUrl = escapeHtml(input.invitationUrl.toString());
  const signInUrl = escapeHtml(input.signInUrl.toString());

  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const serif = "Georgia,'Times New Roman',serif";

  const step = (n: number, content: string, last = false) =>
    `<tr>
      <td valign="top" style="width:36px;padding:0 0 ${last ? 0 : 14}px;">
        <div style="width:24px;height:24px;line-height:24px;border-radius:12px;background-color:${line};color:${strong};font-family:${font};font-size:12px;font-weight:700;text-align:center;">${n}</div>
      </td>
      <td valign="top" style="padding:2px 0 ${last ? 0 : 14}px;font-family:${font};font-size:14px;line-height:21px;color:#374151;">${content}</td>
    </tr>`;

  return {
    subject: `${input.merchant} invited you to join their team on Fides`,

    text: [
      `Hi ${input.name},`,
      "",
      `${input.merchant} has invited you to join their team on Fides.`,
      "",
      "Accept your invitation:",
      input.invitationUrl.toString(),
      "",
      "This invitation expires in 7 days.",
      "",
      "What happens next:",
      "1. Accept your invitation",
      "2. Set up or sign in to your staff account",
      `3. Return any time through the staff portal: ${input.signInUrl.toString()}`,
      "",
      "If you weren't expecting this invitation, you can safely ignore this email.",
      "",
      "Powered by Fides",
    ].join("\n"),

    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Staff invitation</title>
</head>
<body style="margin:0;padding:0;background-color:${pageBackground};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    ${merchant} invited you to join their team on Fides. Accept within 7 days.&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${pageBackground};">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid ${line};border-radius:12px;">

          <!-- Header: merchant identity -->
          <tr>
            <td style="background-color:${soft};border-bottom:1px solid ${line};border-radius:11px 11px 0 0;padding:20px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="middle" style="padding-right:14px;">
                    <div style="width:44px;height:44px;line-height:44px;border-radius:10px;background-color:${strong};color:#ffffff;font-family:${serif};font-size:22px;font-weight:bold;text-align:center;">${initial}</div>
                  </td>
                  <td valign="middle" style="font-family:${font};">
                    <div style="font-size:16px;line-height:22px;font-weight:700;color:#111827;">${merchant}</div>
                    <div style="font-size:12px;line-height:18px;letter-spacing:0.6px;text-transform:uppercase;color:${strong};">Staff invitation</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message + button -->
          <tr>
            <td style="padding:32px 32px 8px;font-family:${font};">
              <h1 style="margin:0 0 14px;font-family:${serif};font-size:26px;line-height:34px;font-weight:normal;color:${headingColor};">Join ${merchant} on Fides</h1>
              <p style="margin:0 0 6px;font-size:15px;line-height:24px;color:#374151;">Hi ${name},</p>
              <p style="margin:0 0 26px;font-size:15px;line-height:24px;color:#374151;">${merchant} has invited you to join their team. Accept the invitation to set up your staff account and get started.</p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td bgcolor="${strong}" style="border-radius:8px;background-color:${strong};">
                    <a href="${invitationUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${font};font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">Accept invitation</a>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0;font-size:13px;line-height:20px;color:#6b7280;">This invitation expires in 7 days.</p>
            </td>
          </tr>

          <!-- What happens next -->
          <tr>
            <td style="padding:24px 32px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${panel};border:1px solid ${line};border-radius:10px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <p style="margin:0 0 14px;font-family:${font};font-size:12px;line-height:18px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#6b7280;">What happens next</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${step(1, "Accept your invitation using the button above.")}
                      ${step(2, "Set up or sign in to your staff account.")}
                      ${step(3, `Come back any time through the <a href="${signInUrl}" style="color:${strong};font-weight:600;text-decoration:underline;">staff portal</a>.`, true)}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fallback link + safety note -->
          <tr>
            <td style="padding:24px 32px 32px;font-family:${font};">
              <p style="margin:0 0 4px;font-size:12px;line-height:18px;color:#6b7280;">Button not working? Paste this link into your browser:</p>
              <p style="margin:0 0 18px;font-size:12px;line-height:18px;word-break:break-all;"><a href="${invitationUrl}" style="color:${strong};text-decoration:underline;">${invitationUrl}</a></p>
              <p style="margin:0;font-size:12px;line-height:18px;color:#6b7280;">If you weren’t expecting this invitation, you can safely ignore this email.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:${panel};border-top:1px solid ${line};border-radius:0 0 11px 11px;padding:18px 24px;font-family:${font};font-size:13px;line-height:20px;color:#6b7280;">
              Powered by <strong style="color:#111827;">Fides</strong>
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

type Layout = {
  preheader: string;
  heading: string;
  paragraphs: string[];
  details?: { label: string; value: string }[];
  button?: { label: string; url: string };
  /** Large, spaced-out code (e.g. a 4-character reset code). */
  code?: string;
  closing: string;
  /** Overrides the default "account application" footer line. */
  footer?: string;
  /** Set false for a lightweight email without the mascot image. Defaults to true. */
  showMascot?: boolean;
};

function renderLayout(layout: Layout): string {
  const paragraphs = layout.paragraphs
    .map(
      (line) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#2c3a4b;">${escapeHtml(line)}</p>`,
    )
    .join("");

  const details = layout.details?.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 24px;border:1px solid #ebeef2;border-radius:10px;background:#fffff7;">${layout.details
        .map(
          (item) =>
            `<tr><td style="padding:12px 18px;font-size:13px;color:#6d7580;width:42%;">${escapeHtml(item.label)}</td><td style="padding:12px 18px;font-size:14px;font-weight:600;color:#09101d;">${escapeHtml(item.value)}</td></tr>`,
        )
        .join("")}</table>`
    : "";

  const code = layout.code
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 24px;"><tr><td align="center" style="padding:18px;border:2px dashed #c35000;border-radius:12px;background:#fffff7;font-family:'Courier New',Courier,monospace;font-size:38px;font-weight:700;letter-spacing:14px;color:#c35000;">${escapeHtml(layout.code)}</td></tr></table>`
    : "";

  const button = layout.button
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 28px;"><tr><td style="border-radius:8px;background:#c35000;"><a href="${layout.button.url}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(layout.button.label)}</a></td></tr></table><p style="margin:0 0 24px;font-size:13px;line-height:20px;color:#6d7580;">If the button does not work, copy and paste this link into your browser:<br /><a href="${layout.button.url}" style="color:#c35000;word-break:break-all;">${layout.button.url}</a></p>`
    : "";

  const mascotSrc = layout.showMascot !== false ? mascotUrl() : null;
  const mascot = mascotSrc
    ? `<tr><td align="center" style="padding:28px 32px 0;"><img src="${mascotSrc}" alt="Fides fox mascot" width="200" style="display:block;width:200px;max-width:100%;height:auto;border:0;" /></td></tr>`
    : "";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escapeHtml(layout.heading)}</title></head><body style="margin:0;padding:0;background:#ffffeb;font-family:Arial,Helvetica,sans-serif;"><span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(layout.preheader)}</span><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffeb;padding:32px 12px;"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 3px 14px rgba(44,58,75,0.08);"><tr><td style="background:#c35000;padding:22px 32px;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:32px;color:#ffffff;">Fides</span><span style="float:right;font-size:12px;letter-spacing:1.2px;color:#ffe9d6;padding-top:14px;">MANAGE AND GROW YOUR SERVICE BUSINESS</span></td></tr>${mascot}<tr><td style="padding:16px 32px 8px;"><h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:36px;font-weight:400;color:#09101d;text-align:center;">${escapeHtml(layout.heading)}</h1>${paragraphs}${code}${details}${button}<p style="margin:0 0 8px;font-size:16px;line-height:26px;color:#2c3a4b;">${escapeHtml(layout.closing)}</p><p style="margin:0 0 28px;font-size:16px;line-height:26px;font-weight:700;color:#09101d;">The Fides Team</p></td></tr><tr><td style="background:#fffff7;border-top:1px solid #ebeef2;padding:20px 32px;font-size:12px;line-height:19px;color:#6d7580;text-align:center;">${escapeHtml(layout.footer ?? "You received this email because an account application was submitted with this address on Fides.")}<br />&copy; ${new Date().getFullYear()} Fides. All rights reserved.</td></tr></table></td></tr></table></body></html>`;
}

function renderText(layout: Layout): string {
  const lines = [
    layout.heading,
    "",
    ...layout.paragraphs.flatMap((line) => [line, ""]),
  ];
  if (layout.details?.length) {
    for (const item of layout.details)
      lines.push(`${item.label}: ${item.value}`);
    lines.push("");
  }
  if (layout.code) lines.push(`Code: ${layout.code}`, "");
  if (layout.button)
    lines.push(`${layout.button.label}: ${layout.button.url}`, "");
  lines.push(layout.closing, "The Fides Team");
  return lines.join("\n");
}

/** Sent when the account request has been submitted with all required documents and information. */
export async function sendSubmissionEmail(input: {
  to: string;
  ownerName: string;
  businessName: string;
  referenceCode: string;
}) {
  const layout: Layout = {
    preheader: "Your account request has been successfully submitted.",
    heading: "Account request submitted",
    paragraphs: [
      `Dear ${input.ownerName},`,
      "Your account request has been successfully submitted.",
      "Please wait while it is reviewed. You will be notified once a decision has been made.",
    ],
    details: [
      { label: "Business", value: input.businessName },
      { label: "Reference", value: input.referenceCode },
    ],
    closing: "Thank you for choosing Fides.",
  };
  return sendMail({
    to: input.to,
    subject: "Your Fides account request has been submitted",
    html: renderLayout(layout),
    text: renderText(layout),
  });
}

/** Sent when the administrator clicks Approve. */
export async function sendApprovalEmail(input: {
  to: string;
  ownerName: string;
  businessName: string;
  planName: string;
  planPrice: number;
  referenceCode: string;
}) {
  const layout: Layout = {
    preheader: "Your account has been approved. You may now log in.",
    heading: "Account approved",
    paragraphs: [
      `Dear ${input.ownerName},`,
      "Your account has been approved.",
      "You may now log in using the link below:",
    ],
    button: { label: "Log in to Fides", url: loginUrl() },
    closing: "Thank you for choosing Fides.",
  };

  return sendMail({
    to: input.to,
    subject: "Your Fides account has been approved",
    html: renderLayout(layout),
    text: renderText(layout),
  });
}

export function registerUrl(): string {
  return `${publicEnv.siteUrl.replace(/\/$/, "")}/register`;
}

/** Sent when the administrator rejects an application. All submitted data has been erased. */
export async function sendRejectionEmail(input: {
  to: string;
  ownerName: string;
  businessName: string;
  reason: string;
}) {
  const layout: Layout = {
    preheader: "Your Fides account request could not be approved.",
    heading: "Account request not approved",
    paragraphs: [
      `Dear ${input.ownerName},`,
      `Thank you for applying to Fides. Unfortunately, we could not approve the account request for ${input.businessName}.`,
      `Reason: ${input.reason}`,
      "The information and documents you submitted have been removed from our system, so you can register again using the same email address. Please correct the issue above and create a new account using the link below:",
    ],
    button: { label: "Create a new account", url: registerUrl() },
    closing: "We look forward to welcoming you to Fides.",
  };
  return sendMail({
    to: input.to,
    subject: "Your Fides account request was not approved",
    html: renderLayout(layout),
    text: renderText(layout),
  });
}

/** Sent by the Forgot Password flow with a 4-character code. */
export async function sendPasswordResetCodeEmail(input: {
  to: string;
  code: string;
  minutesValid: number;
}) {
  const layout: Layout = {
    preheader: `Your Fides password reset code is ${input.code}.`,
    heading: "Password reset code",
    paragraphs: [
      "We received a request to reset the password of your Fides account.",
      `Enter this code to continue. It expires in ${input.minutesValid} minutes.`,
    ],
    code: input.code,
    closing:
      "If you did not request this, you can safely ignore this email. Your password will not change.",
    showMascot: false,
    footer:
      "You received this email because a password reset was requested for this address on Fides.",
  };
  return sendMail({
    to: input.to,
    subject: `${input.code} is your Fides password reset code`,
    html: renderLayout(layout),
    text: renderText(layout),
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
  const layout: Layout = {
    preheader: `Your ${input.planName} subscription renews on ${input.billingDate}.`,
    heading: "Your subscription renews soon",
    paragraphs: [
      `Dear ${input.ownerName},`,
      `This is a courtesy reminder that the Fides subscription for ${input.businessName} is due for renewal on ${input.billingDate}.`,
    ],
    details: [
      { label: "Plan", value: input.planName },
      { label: "Amount", value: `${formatPeso(input.planPrice)} / month` },
      { label: "Renewal date", value: input.billingDate },
    ],
    button: { label: "Log in to Fides", url: loginUrl() },
    closing:
      "If you have any questions about your subscription, simply reply to this email.",
  };

  return sendMail({
    to: input.to,
    subject: `Fides billing reminder for ${input.businessName}`,
    html: renderLayout(layout),
    text: renderText(layout),
  });
}
