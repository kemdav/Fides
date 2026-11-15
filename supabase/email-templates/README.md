# Fides · Supabase Auth email templates
Supabase Dashboard → **Authentication → Emails → Templates**. For each template below: set the **Subject**, then paste the HTML into **Message body (source)** and Save. `{{ .ConfirmationURL }}` and `{{ .Token }}` are filled in by Supabase automatically; do not change them.
> Important: these emails are sent by Supabase Auth. Supabase's built-in mailer is heavily rate-limited and only for testing. To send them through Resend, set **Authentication → Emails → SMTP Settings → Enable custom SMTP** to: Host `smtp.resend.com`, Port `465`, Username `resend`, Password = your Resend API key, Sender email = an address on your verified Resend domain, Sender name `Fides`.
> Note: Fides's *account submitted*, *account approved* and *forgot-password code* emails are sent by the app itself through Resend, not by these templates.

---

## Confirm Signup

**Subject:** `Confirm your email address`

```html
<div style="background:#ffffeb;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;">
    <tr><td style="background:#c35000;padding:20px 28px;font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#ffffff;">Fides</td></tr>
    <tr><td style="padding:28px;">
      <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;color:#09101d;">Confirm your email address</h2>
      <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#2c3a4b;">Follow the link below to confirm this email address and finish signing up.</p><p style="margin:24px 0;"><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;background:#c35000;color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;border-radius:8px;">Confirm email address</a></p><p style="margin:0 0 16px;font-size:13px;line-height:20px;color:#6d7580;">If the button does not work, copy and paste this link into your browser:<br><a href="{{ .ConfirmationURL }}" style="color:#c35000;word-break:break-all;">{{ .ConfirmationURL }}</a></p>
      <p style="margin:24px 0 0;font-size:15px;font-weight:700;color:#09101d;">The Fides Team</p>
    </td></tr>
  </table>
</div>
```

---

## Invite User

**Subject:** `You've been invited`

```html
<div style="background:#ffffeb;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;">
    <tr><td style="background:#c35000;padding:20px 28px;font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#ffffff;">Fides</td></tr>
    <tr><td style="padding:28px;">
      <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;color:#09101d;">You've been invited</h2>
      <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#2c3a4b;">You've been invited to create an account. Follow the link below to accept.</p><p style="margin:24px 0;"><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;background:#c35000;color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;border-radius:8px;">Accept invitation</a></p><p style="margin:0 0 16px;font-size:13px;line-height:20px;color:#6d7580;">If the button does not work, copy and paste this link into your browser:<br><a href="{{ .ConfirmationURL }}" style="color:#c35000;word-break:break-all;">{{ .ConfirmationURL }}</a></p>
      <p style="margin:24px 0 0;font-size:15px;font-weight:700;color:#09101d;">The Fides Team</p>
    </td></tr>
  </table>
</div>
```

---

## Reset Password

**Subject:** `Reset your password`

```html
<div style="background:#ffffeb;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;">
    <tr><td style="background:#c35000;padding:20px 28px;font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#ffffff;">Fides</td></tr>
    <tr><td style="padding:28px;">
      <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;color:#09101d;">Reset your password</h2>
      <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#2c3a4b;">We received a request to reset your password. Follow the link below to choose a new one.</p><p style="margin:24px 0;"><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;background:#c35000;color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;border-radius:8px;">Reset password</a></p><p style="margin:0 0 16px;font-size:13px;line-height:20px;color:#6d7580;">If the button does not work, copy and paste this link into your browser:<br><a href="{{ .ConfirmationURL }}" style="color:#c35000;word-break:break-all;">{{ .ConfirmationURL }}</a></p><p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#6d7580;">If you didn't request this, you can safely ignore this email.</p>
      <p style="margin:24px 0 0;font-size:15px;font-weight:700;color:#09101d;">The Fides Team</p>
    </td></tr>
  </table>
</div>
```

---

## Magic Link / OTP

**Subject:** `Your Fides sign-in link`

```html
<div style="background:#ffffeb;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;">
    <tr><td style="background:#c35000;padding:20px 28px;font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#ffffff;">Fides</td></tr>
    <tr><td style="padding:28px;">
      <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;color:#09101d;">Your sign-in link</h2>
      <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#2c3a4b;">Follow the link below to sign in. This link expires shortly and can only be used once.</p><p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#2c3a4b;">Or enter this code: <strong style="font-family:'Courier New',monospace;font-size:22px;letter-spacing:4px;color:#c35000;">{{ .Token }}</strong></p><p style="margin:24px 0;"><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;background:#c35000;color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;border-radius:8px;">Sign in</a></p><p style="margin:0 0 16px;font-size:13px;line-height:20px;color:#6d7580;">If the button does not work, copy and paste this link into your browser:<br><a href="{{ .ConfirmationURL }}" style="color:#c35000;word-break:break-all;">{{ .ConfirmationURL }}</a></p>
      <p style="margin:24px 0 0;font-size:15px;font-weight:700;color:#09101d;">The Fides Team</p>
    </td></tr>
  </table>
</div>
```
