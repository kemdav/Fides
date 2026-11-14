// Supabase Edge Function: send-fides-email
//
// Sends one email through Resend. The Next.js app calls it when MAIL_TRANSPORT=edge.
//
// Secrets (set with `npx supabase secrets set ...`, never commit real values):
//   RESEND_API_KEY               Resend API key (key name in Resend: FIDES-Development)
//   FIDES_EMAIL_FUNCTION_SECRET  shared secret, must match the app's .env.local
//   MAIL_FROM_NAME               default "Fides"
//   MAIL_FROM_EMAIL              default "onboarding@resend.dev" (test only; use your verified domain in production)
//
// Deploy:  npx supabase functions deploy send-fides-email --no-verify-jwt
// (--no-verify-jwt because callers authenticate with the x-fides-secret header instead.)

import { Resend } from "npm:resend@6";

type Attachment = { filename: string; contentBase64: string; contentId?: string };
type Payload = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  attachments?: Attachment[];
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const secret = Deno.env.get("FIDES_EMAIL_FUNCTION_SECRET");
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!secret || !apiKey) return json({ error: "Email function is not configured." }, 500);
  if (!safeEqual(request.headers.get("x-fides-secret") ?? "", secret)) return json({ error: "Unauthorized." }, 401);

  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const to = (Array.isArray(payload.to) ? payload.to : [payload.to]).filter((value) => typeof value === "string" && value.includes("@"));
  if (to.length === 0 || to.length > 10) return json({ error: "Provide between 1 and 10 recipients." }, 400);
  if (!payload.subject || (!payload.html && !payload.text)) return json({ error: "A subject and a body are required." }, 400);

  const fromName = Deno.env.get("MAIL_FROM_NAME") ?? "Fides";
  const fromEmail = Deno.env.get("MAIL_FROM_EMAIL") ?? "onboarding@resend.dev";

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    replyTo: payload.replyTo,
    attachments: payload.attachments?.map((item) => ({
      filename: item.filename,
      content: item.contentBase64,
      contentId: item.contentId,
    })),
  } as never);

  if (error) return json({ error: error.message }, 502);
  return json({ id: data?.id ?? null });
});
