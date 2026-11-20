"use server";

import { getServerEnv } from "@/lib/env";
import { isMailConfigured, sendMail } from "@/lib/mail/mailer";

export type ContactState = {
  status: "idle" | "error" | "sent";
  message?: string;
  values: { name: string; email: string; topic: string; message: string };
  fieldErrors?: Partial<Record<"name" | "email" | "message", string>>;
};

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function submitContact(_previous: ContactState, formData: FormData): Promise<ContactState> {
  const values = {
    name: String(formData.get("name") ?? "").trim().slice(0, 120),
    email: String(formData.get("email") ?? "").trim().slice(0, 200),
    topic: String(formData.get("topic") ?? "General").trim().slice(0, 60),
    message: String(formData.get("message") ?? "").trim().slice(0, 2000),
  };

  const fieldErrors: NonNullable<ContactState["fieldErrors"]> = {};
  if (!values.name) fieldErrors.name = "Enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) fieldErrors.email = "Enter a valid email address.";
  if (values.message.length < 10) fieldErrors.message = "Tell us a little more (at least 10 characters).";
  if (Object.keys(fieldErrors).length) return { status: "error", values, fieldErrors };

  const inbox = getServerEnv().MAIL_FROM_EMAIL;
  if (!inbox || !isMailConfigured()) {
    return { status: "error", values, message: "We can't send messages right now. Please try again later." };
  }

  try {
    await sendMail({
      to: inbox,
      replyTo: values.email,
      subject: `[Fides contact] ${values.topic} from ${values.name}`,
      text: `From: ${values.name} <${values.email}>\nTopic: ${values.topic}\n\n${values.message}`,
      html: `<p><strong>${escapeHtml(values.name)}</strong> &lt;${escapeHtml(values.email)}&gt;<br/>Topic: ${escapeHtml(values.topic)}</p><p style="white-space:pre-wrap">${escapeHtml(values.message)}</p>`,
    });
  } catch {
    return { status: "error", values, message: "Something went wrong sending your message. Please try again." };
  }
  return { status: "sent", values: { name: "", email: "", topic: "General", message: "" } };
}
