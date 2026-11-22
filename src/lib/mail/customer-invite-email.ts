import "server-only";
import { publicEnv } from "@/lib/env";
import { isMailConfigured, sendMail } from "./mailer";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildCustomerInviteUrl(token: string): string {
  const base = publicEnv.siteUrl.replace(/\/$/, "");
  return `${base}/invite/customer/${encodeURIComponent(token)}`;
}

export async function sendCustomerInviteEmail(params: {
  to: string;
  customerName: string;
  businessName: string;
  inviteUrl: string;
}): Promise<{ delivered: boolean; warning?: string }> {
  if (!isMailConfigured()) {
    return {
      delivered: false,
      warning:
        "Email delivery is not configured in this environment. Share the generated invite link directly with the customer.",
    };
  }

  const subject = `Finish setting up your ${params.businessName} account`;
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#ffffeb;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffeb;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 3px 14px rgba(44,58,75,0.08);">
          <tr>
            <td style="background:#c35000;padding:22px 32px;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#ffffff;">${escapeHtml(params.businessName)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:34px;font-weight:400;color:#09101d;">Set up your customer account</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#2c3a4b;">Hi ${escapeHtml(params.customerName)},</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#2c3a4b;">${escapeHtml(params.businessName)} invited you to activate your online customer account so you can view your visit history and book appointments faster next time.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px 0 24px;">
                <tr>
                  <td style="border-radius:8px;background:#c35000;">
                    <a href="${params.inviteUrl}" target="_blank" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">Set Your Password</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;font-size:13px;line-height:20px;color:#6d7580;">This link stays active for 7 days. If the button does not work, copy and paste this URL:<br /><a href="${params.inviteUrl}" style="color:#c35000;word-break:break-all;">${params.inviteUrl}</a></p>
              <p style="margin:0;font-size:14px;color:#2c3a4b;">Your existing visit history and booking records will connect automatically once you finish setup.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `Hi ${params.customerName},`,
    "",
    `${params.businessName} invited you to activate your online customer account so you can view your visit history and book appointments faster next time.`,
    "",
    `Set your password here (valid for 7 days): ${params.inviteUrl}`,
    "",
    "Your existing visit history and booking records will connect automatically once you finish setup.",
  ].join("\n");

  try {
    await sendMail({
      to: { name: params.customerName, address: params.to },
      subject,
      html,
      text,
    });
    return { delivered: true };
  } catch (error) {
    return {
      delivered: false,
      warning:
        error instanceof Error
          ? error.message
          : "Email could not be delivered right now. Share the invite link directly.",
    };
  }
}