"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { buttonClasses } from "@/components/ui";

export function StorefrontContactPage({
  servicesHref = "#services",
}: {
  servicesHref?: string;
}) {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="flex-1">
      <section className="bg-powder">
        <div className="mx-auto grid max-w-[1440px] items-center gap-8 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-2 lg:gap-16 lg:px-[90px] lg:py-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-burnt">
              Contact us
            </p>
            <h1 className="mt-3 max-w-[430px] font-display text-3xl leading-[1.1] text-ink sm:text-[40px]">
              A little conversation.
              <span className="block">A little more care.</span>
            </h1>
            <p className="mt-5 max-w-[560px] text-sm/6 text-muted sm:text-base/7">
              Have a question about our services or your visit? Tell us what&apos;s
              on your mind. We&apos;re here to help you find the care that feels
              right for you.
            </p>
          </div>
          <div className="relative aspect-[1.55/1] overflow-hidden rounded-lg">
            <Image
              src="/images/storefront/hero Image.png"
              alt="Bella Vita appointment booking on a phone"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20 lg:px-[90px] lg:py-16">
          <div>
            <h2 className="font-display text-3xl text-ink sm:text-[32px]">
              Send us a message
            </h2>
            <p className="mt-3 text-sm/6 text-muted">
              A question, a preference, or a little guidance — start here.
            </p>
            <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
              <label className="text-sm text-ink">
                Name*
                <input required name="name" placeholder="Your Name" className="mt-2 h-10 w-full rounded border border-line px-3 text-sm outline-none focus:border-burnt" />
              </label>
              <label className="text-sm text-ink">
                Email*
                <input required type="email" name="email" placeholder="Your email address" className="mt-2 h-10 w-full rounded border border-line px-3 text-sm outline-none focus:border-burnt" />
              </label>
              <label className="text-sm text-ink">
                Phone
                <input name="phone" placeholder="Your phone number" className="mt-2 h-10 w-full rounded border border-line px-3 text-sm outline-none focus:border-burnt" />
              </label>
              <label className="text-sm text-ink">
                Service/Topic*
                <select required name="topic" defaultValue="" className="mt-2 h-10 w-full rounded border border-line bg-white px-3 text-sm text-muted outline-none focus:border-burnt">
                  <option value="" disabled>Select a Topic</option>
                  <option>Services</option>
                  <option>Booking</option>
                  <option>General question</option>
                </select>
              </label>
              <label className="text-sm text-ink sm:col-span-2">
                Message*
                <textarea required name="message" placeholder="How can we help you?" className="mt-2 min-h-24 w-full resize-y rounded border border-line px-3 py-2 text-sm outline-none focus:border-burnt" />
              </label>
              <p className="text-xs text-muted sm:col-span-2">
                Please share enough detail so we can help you best.
              </p>
              <div className="sm:col-span-2">
                <button type="submit" className={buttonClasses({ variant: "brand", size: "md" })}>
                  Send Message
                </button>
                {submitted && (
                  <p className="mt-3 text-sm text-success">Thanks — we&apos;ll be in touch soon.</p>
                )}
              </div>
            </form>
          </div>

          <div className="text-sm/6 text-muted">
            <p className="text-xs font-bold uppercase tracking-wider text-burnt">A little guidance</p>
            <h2 className="mt-3 font-display text-2xl text-ink">Not sure where to start?</h2>
            <p className="mt-4">A few details can help us understand what you need.</p>
            {[
              ["Finding the right service", "Share what you’re looking for or how you’d like to feel. We can help you explore your options."],
              ["Questions about your visit", "Let us know which service you have in mind, along with any preferences or questions."],
              ["An existing appointment", "Include the name used for your booking, the service, and your appointment details so we have the context."],
            ].map(([title, description]) => (
              <div key={title} className="mt-6 border-t border-line pt-4">
                <span className="block h-px w-10 bg-burnt" />
                <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
                <p className="mt-2">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-powder">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-8 sm:px-8 sm:py-10 lg:flex-row lg:items-center lg:justify-between lg:px-[90px] lg:py-12">
          <div>
            <h2 className="font-display text-2xl text-ink">Ready for a little time for yourself?</h2>
            <p className="mt-3 text-sm/6 text-muted">No need to send an enquiry to book. Explore services, pick a time, and choose a moment of care.</p>
          </div>
          <a href={servicesHref} className={buttonClasses({ variant: "brand", size: "lg" })}>Book An Appointment</a>
        </div>
      </section>
    </main>
  );
}
