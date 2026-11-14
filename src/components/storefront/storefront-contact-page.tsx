"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { buttonClasses } from "@/components/ui";

const topicOptions = ["Services", "Booking", "General question"];

export function StorefrontContactPage({
  servicesHref = "#services",
}: {
  servicesHref?: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [topic, setTopic] = useState("");
  const [topicOpen, setTopicOpen] = useState(false);
  const [topicError, setTopicError] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!topic) {
      setTopicError(true);
      return;
    }
    setTopicError(false);
    setSubmitted(true);
  }

  return (
    <main className="flex-1">
      <section className="bg-powder">
        <div className="mx-auto grid max-w-[1440px] items-center gap-9 px-5 py-9 sm:px-8 sm:py-12 lg:grid-cols-2 lg:gap-16 lg:px-[90px] lg:py-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-burnt">
              Contact us
            </p>
            <h1 className="mt-3 max-w-[430px] font-display text-3xl leading-[1.1] text-ink sm:text-[40px]">
              A little conversation.
              <span className="block">A little more care.</span>
            </h1>
            <p className="mt-5 max-w-[565px] text-sm/6 text-muted sm:text-base/7">
              Have a question about our services or your visit? Tell us what&apos;s
              on your mind. We&apos;re here to help you find the care that feels right for you.
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
            <p className="mt-3 text-sm/6 text-muted">
              All fields are required unless marked optional.
            </p>
            <form className="mt-7 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
              <label className="text-base/6 text-ink">
                Name*
                <input required name="name" placeholder="Juan Dela Cruz" className="mt-2 h-12 w-full rounded-lg border border-[#aeb6c0] px-4 text-base outline-none placeholder:text-muted focus:border-burnt" />
              </label>
              <label className="text-base/6 text-ink">
                Email*
                <input required type="email" name="email" placeholder="juan.delacruz@gmail.com" className="mt-2 h-12 w-full rounded-lg border border-[#aeb6c0] px-4 text-base outline-none placeholder:text-muted focus:border-burnt" />
              </label>
              <label className="text-base/6 text-ink">
                Phone
                <input name="phone" placeholder="09123456789" className="mt-2 h-12 w-full rounded-lg border border-[#aeb6c0] px-4 text-base outline-none placeholder:text-muted focus:border-burnt" />
              </label>
              <div className="relative text-base/6 text-ink">
                Service/Topic*
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={topicOpen}
                  onClick={() => setTopicOpen((open) => !open)}
                  className="mt-2 flex h-12 w-full items-center justify-between rounded-lg border border-[#aeb6c0] bg-white px-4 text-left text-base outline-none focus:border-burnt"
                >
                  <span className={topic ? "text-ink" : "text-muted"}>
                    {topic || "Select a Topic"}
                  </span>
                  <svg
                    aria-hidden
                    viewBox="0 0 16 10"
                    className={`size-4 text-muted transition-transform ${topicOpen ? "rotate-180" : ""}`}
                    fill="currentColor"
                  >
                    <path d="M1.2 1.4a1 1 0 0 1 1.4-.2L8 5.7l5.4-4.5a1 1 0 1 1 1.2 1.6l-6 5a1 1 0 0 1-1.2 0l-6-5a1 1 0 0 1-.2-1.4Z" />
                  </svg>
                </button>
                {topicOpen && (
                  <ul
                    role="listbox"
                    className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-lg border border-[#aeb6c0] bg-white py-1 shadow-md"
                  >
                    {topicOptions.map((option) => (
                      <li key={option}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={topic === option}
                          onClick={() => {
                            setTopic(option);
                            setTopicOpen(false);
                            setTopicError(false);
                          }}
                          className="w-full px-4 py-3 text-left text-base text-ink transition-colors hover:bg-mist"
                        >
                          {option}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {topicError && (
                  <p className="mt-1 text-sm text-burnt">Please choose a service or topic.</p>
                )}
              </div>
              <label className="text-base/6 text-ink sm:col-span-2">
                Message*
                <textarea required name="message" placeholder="How can we help you?" className="mt-2 min-h-32 w-full resize-y rounded-lg border border-[#aeb6c0] px-4 py-3 text-base outline-none placeholder:text-muted focus:border-burnt" />
              </label>
              <p className="text-sm/6 text-muted sm:col-span-2">
                Please share only what&apos;s needed for your enquiry. Avoid including
                sensitive personal or payment information.
              </p>
              <div className="sm:col-span-2">
                <button type="submit" className={buttonClasses({ variant: "brand", size: "lg" })}>
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
            <h2 className="font-display text-3xl text-ink">Ready for a little time for yourself?</h2>
            <p className="mt-3 max-w-[560px] text-base/7 text-muted">
              No need to send an enquiry to book. Explore our services,
              <span className="block">
                see prices and durations, and choose a time that works for you.
              </span>
            </p>
          </div>
          <div className="flex gap-3">
            <a href={servicesHref} className={buttonClasses({ variant: "brand-outline", size: "lg" })}>
              View Services
            </a>
            <a href={servicesHref} className={buttonClasses({ variant: "brand", size: "lg" })}>
              Book An Appointment
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
