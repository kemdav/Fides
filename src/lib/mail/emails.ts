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
  return /^https:\/\//i.test(base) && !/localhost|127\.0\.0\.1/.test(base) ? `${base}/images/mascot/fox-mascot.png` : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    .map((line) => `<p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#2c3a4b;">${escapeHtml(line)}</p>`)
    .join("");

  const details = layout.details?.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 24px;border:1px solid #ebeef2;border-radius:10px;background:#fffff7;">${layout.details
        .map(
          (item) =>
            `<tr><td style="padding:12px 18px;font-size:13px;color:#6d7580;width:42%;">${escapeHtml(item.label)}</td><td style="padding:12px 18px;font-size:14px;font-weight:600;color:#09101d;">${escapeHtml(item.value)}</td></tr>`
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
  const lines = [layout.heading, "", ...layout.paragraphs.flatMap((line) => [line, ""])];
  if (layout.details?.length) {
    for (const item of layout.details) lines.push(`${item.label}: ${item.value}`);
    lines.push("");
  }
  if (layout.code) lines.push(`Code: ${layout.code}`, "");
  if (layout.button) lines.push(`${layout.button.label}: ${layout.button.url}`, "");
  lines.push(layout.closing, "The Fides Team");
  return lines.join("\n");
}

/** Sent when the account request has been submitted with all required documents and information. */
export async function sendSubmissionEmail(input: { to: string; ownerName: string; businessName: string; referenceCode: string }) {
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
    paragraphs: [`Dear ${input.ownerName},`, "Your account has been approved.", "You may now log in using the link below:"],
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
export async function sendRejectionEmail(input: { to: string; ownerName: string; businessName: string; reason: string }) {
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
export async function sendPasswordResetCodeEmail(input: { to: string; code: string; minutesValid: number }) {
  const layout: Layout = {
    preheader: `Your Fides password reset code is ${input.code}.`,
    heading: "Password reset code",
    paragraphs: [
      "We received a request to reset the password of your Fides account.",
      `Enter this code to continue. It expires in ${input.minutesValid} minutes.`,
    ],
    code: input.code,
    closing: "If you did not request this, you can safely ignore this email. Your password will not change.",
    showMascot: false,
    footer: "You received this email because a password reset was requested for this address on Fides.",
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
    closing: "If you have any questions about your subscription, simply reply to this email.",
  };

  return sendMail({
    to: input.to,
    subject: `Fides billing reminder for ${input.businessName}`,
    html: renderLayout(layout),
    text: renderText(layout),
  });
}
