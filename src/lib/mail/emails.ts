import "server-only";
import path from "node:path";
import { publicEnv } from "@/lib/env";
import { formatPeso } from "@/lib/registration/options";
import { sendMail } from "./mailer";
import type { MailAttachment } from "./types";

const MASCOT_CID = "fides-mascot@fides";

function mascotAttachment(): MailAttachment {
  return {
    filename: "fides-mascot.png",
    path: path.join(process.cwd(), "public", "images", "mascot", "fox-mascot.png"),
    cid: MASCOT_CID,
  };
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
  closing: string;
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

  const button = layout.button
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 28px;"><tr><td style="border-radius:8px;background:#c35000;"><a href="${layout.button.url}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(layout.button.label)}</a></td></tr></table><p style="margin:0 0 24px;font-size:13px;line-height:20px;color:#6d7580;">If the button does not work, copy and paste this link into your browser:<br /><a href="${layout.button.url}" style="color:#c35000;word-break:break-all;">${layout.button.url}</a></p>`
    : "";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escapeHtml(layout.heading)}</title></head><body style="margin:0;padding:0;background:#ffffeb;font-family:Arial,Helvetica,sans-serif;"><span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(layout.preheader)}</span><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffeb;padding:32px 12px;"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 3px 14px rgba(44,58,75,0.08);"><tr><td style="background:#c35000;padding:22px 32px;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:32px;color:#ffffff;">Fides</span><span style="float:right;font-size:12px;letter-spacing:1.2px;color:#ffe9d6;padding-top:14px;">MANAGE AND GROW YOUR SERVICE BUSINESS</span></td></tr><tr><td align="center" style="padding:28px 32px 0;"><img src="cid:${MASCOT_CID}" alt="Fides fox mascot" width="200" style="display:block;width:200px;max-width:100%;height:auto;border:0;" /></td></tr><tr><td style="padding:16px 32px 8px;"><h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:36px;font-weight:400;color:#09101d;text-align:center;">${escapeHtml(layout.heading)}</h1>${paragraphs}${details}${button}<p style="margin:0 0 8px;font-size:16px;line-height:26px;color:#2c3a4b;">${escapeHtml(layout.closing)}</p><p style="margin:0 0 28px;font-size:16px;line-height:26px;font-weight:700;color:#09101d;">The Fides Team</p></td></tr><tr><td style="background:#fffff7;border-top:1px solid #ebeef2;padding:20px 32px;font-size:12px;line-height:19px;color:#6d7580;text-align:center;">You received this email because an account application was submitted with this address on Fides.<br />&copy; ${new Date().getFullYear()} Fides. All rights reserved.</td></tr></table></td></tr></table></body></html>`;
}

function renderText(layout: Layout): string {
  const lines = [layout.heading, "", ...layout.paragraphs.flatMap((line) => [line, ""])];
  if (layout.details?.length) {
    for (const item of layout.details) lines.push(`${item.label}: ${item.value}`);
    lines.push("");
  }
  if (layout.button) lines.push(`${layout.button.label}: ${layout.button.url}`, "");
  lines.push(layout.closing, "The Fides Team");
  return lines.join("\n");
}

export async function sendApprovalEmail(input: {
  to: string;
  ownerName: string;
  businessName: string;
  planName: string;
  planPrice: number;
  referenceCode: string;
}) {
  const layout: Layout = {
    preheader: `${input.businessName} has been approved on Fides. Log in to get started.`,
    heading: "Your application has been approved",
    paragraphs: [
      `Dear ${input.ownerName},`,
      `We are pleased to inform you that the application for ${input.businessName} has been reviewed and approved. Welcome to Fides.`,
      "Your business account is now active. You can log in with the email address and password you used when you registered.",
    ],
    details: [
      { label: "Business", value: input.businessName },
      { label: "Reference", value: input.referenceCode },
      { label: "Subscription", value: `${input.planName} · ${formatPeso(input.planPrice)} / month` },
    ],
    button: { label: "Log in to Fides", url: loginUrl() },
    closing: "Thank you for choosing Fides. We look forward to helping you manage and grow your business.",
  };

  return sendMail({
    to: input.to,
    subject: `Your Fides application for ${input.businessName} is approved`,
    html: renderLayout(layout),
    text: renderText(layout),
    attachments: [mascotAttachment()],
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
    attachments: [mascotAttachment()],
  });
}
