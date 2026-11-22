"use client";

import { useActionState } from "react";
import { submitContact, type ContactState } from "./actions";
import { AuthBanner, AuthField, AuthSubmit } from "@/components/auth/auth-ui";
import { inputClasses } from "@/components/ui";

const initialState: ContactState = { status: "idle", values: { name: "", email: "", topic: "General", message: "" } };
const topics = ["General", "Pricing", "Demo request", "Support"];

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, initialState);
  const { values, fieldErrors } = state;

  if (state.status === "sent") {
    return (
      <div role="status" className="flex flex-col gap-2 rounded-2xl border border-hairline bg-white p-6 sm:p-9">
        <h2 className="font-display text-3xl text-body">Message sent</h2>
        <p className="text-sm text-subtle">Thanks for reaching out. We will get back to you by email soon.</p>
      </div>
    );
  }

  return (
    <form action={action} noValidate aria-busy={pending} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-hairline bg-white p-6 shadow-[0_3px_14px_rgb(44_58_75/0.04)] sm:p-9">
      {state.status === "error" && state.message ? <AuthBanner title={state.message} /> : null}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField id="name" name="name" label="Name" autoComplete="name" defaultValue={values.name} disabled={pending} error={fieldErrors?.name} placeholder="Maria Santos" />
        <AuthField id="email" name="email" type="email" label="Email" autoComplete="email" defaultValue={values.email} disabled={pending} error={fieldErrors?.email} placeholder="maria@bellavita.ph" />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="topic" className="text-sm font-semibold text-ink opacity-80">Topic</label>
        <select id="topic" name="topic" defaultValue={values.topic} disabled={pending} className={`${inputClasses()} cursor-pointer bg-white`}>
          {topics.map((topic) => (
            <option key={topic}>{topic}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="message" className="text-sm font-semibold text-ink">
          <span className="opacity-80">Message</span>
          <span aria-hidden className="text-[#991b1b] opacity-80">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          defaultValue={values.message}
          disabled={pending}
          aria-invalid={!!fieldErrors?.message}
          placeholder="How can we help?"
          className={`${inputClasses(!!fieldErrors?.message)} h-auto resize-y py-3`}
        />
        {fieldErrors?.message ? (
          <p role="alert" className="text-[13px] text-[#991b1b]">
            {fieldErrors.message}
          </p>
        ) : null}
      </div>
      <AuthSubmit loading={pending} loadingLabel="Sending…">
        Send message
      </AuthSubmit>
    </form>
  );
}
