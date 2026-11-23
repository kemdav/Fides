"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { buttonClasses, inputClasses } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  submitContactForm,
  type ContactFormState,
} from "@/app/(site)/[slug]/contact/actions";
import { Icon } from "@/components/admin/icon";

const topicOptions = ["Services", "Booking", "General question"];

const initialState: ContactFormState = {
  success: false,
};

export interface StorefrontContactPageProps {
  tenantId: string;
  tenantSlug: string;
  businessName?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  servicesHref?: string;
}

export function StorefrontContactPage({
  tenantId,
  tenantSlug,
  businessName = "Our Studio",
  email,
  phone,
  address,
  servicesHref = "#services",
}: StorefrontContactPageProps) {
  const [topic, setTopic] = useState("");
  const [topicOpen, setTopicOpen] = useState(false);
  const [topicError, setTopicError] = useState(false);

  const [state, formAction, isPending] = useActionState(
    submitContactForm,
    initialState,
  );

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!topic) {
      event.preventDefault();
      setTopicError(true);
      return;
    }
    setTopicError(false);
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
              Have a question about our services or your visit? Tell us
              what&apos;s on your mind. We&apos;re here to help you find the
              care that feels right for you.
            </p>
          </div>
          <div className="relative aspect-[1.55/1] overflow-hidden rounded-lg">
            <Image
              src="/images/storefront/hero Image.png"
              alt={`${businessName} appointment booking on a phone`}
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
            <form
              action={formAction}
              onSubmit={handleFormSubmit}
              className="mt-7 grid gap-5 sm:grid-cols-2"
            >
              {/* Hidden inputs to scope inquiry to active tenant */}
              <input type="hidden" name="tenantId" value={tenantId} />
              <input type="hidden" name="tenantSlug" value={tenantSlug} />
              <input type="hidden" name="topic" value={topic} />

              <label className="text-base/6 text-ink">
                Name*
                <input
                  required
                  name="name"
                  placeholder="Juan Dela Cruz"
                  disabled={isPending}
                  className={cn(inputClasses(), "mt-2")}
                />
              </label>
              <label className="text-base/6 text-ink">
                Email*
                <input
                  required
                  type="email"
                  name="email"
                  placeholder="juan@gmail.com"
                  disabled={isPending}
                  className={cn(inputClasses(), "mt-2")}
                />
              </label>
              <label className="text-base/6 text-ink">
                Phone
                <input
                  name="phone"
                  placeholder="09123456789"
                  disabled={isPending}
                  className={cn(inputClasses(), "mt-2")}
                />
              </label>
              <div className="relative text-base/6 text-ink">
                Service/Topic*
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={topicOpen}
                  disabled={isPending}
                  onClick={() => setTopicOpen((open) => !open)}
                  className={cn(inputClasses(), "mt-2 flex items-center justify-between text-left")}
                >
                  <span className={topic ? "text-ink" : "text-muted"}>
                    {topic || "Select a Topic"}
                  </span>
                  <Icon name="chevron-down" className={`size-4 text-muted transition-transform ${topicOpen ? "rotate-180" : ""}`} />
                </button>
                {topicOpen && (
                  <ul
                    role="listbox"
                    className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-lg border border-glyph bg-white py-1 shadow-md"
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
                  <p className="mt-1 text-sm text-burnt">
                    Please choose a service or topic.
                  </p>
                )}
              </div>
              <label className="text-base/6 text-ink sm:col-span-2">
                Message*
                <textarea
                  required
                  name="message"
                  placeholder="How can we help you?"
                  disabled={isPending}
                  className={cn(inputClasses(false, true), "mt-2 min-h-32")}
                />
              </label>
              <p className="text-sm/6 text-muted sm:col-span-2">
                Please share only what&apos;s needed for your enquiry. Avoid
                including sensitive personal or payment information.
              </p>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className={buttonClasses({
                    variant: "brand",
                    size: "lg",
                    className: isPending ? "opacity-75 cursor-not-allowed" : "",
                  })}
                >
                  {isPending ? "Sending..." : "Send Message"}
                </button>

                {state.success && (
                  <p className="mt-3 text-sm font-medium text-success">
                    {state.message || "Thanks — we'll be in touch soon."}
                  </p>
                )}
                {state.error && (
                  <p className="mt-3 text-sm font-medium text-burnt">
                    {state.error}
                  </p>
                )}
              </div>
            </form>
          </div>

          <div className="text-sm/6 text-muted">
            {/* Dynamic tenant contact details card */}
            {(email || phone || address) && (
              <div className="mb-8 rounded-lg border border-hairline bg-powder/70 p-6">
                <h3 className="font-display text-xl text-ink">
                  Direct Details
                </h3>
                <div className="mt-4 space-y-3">
                  {email && (
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-burnt">
                        Email
                      </span>
                      <a
                        href={`mailto:${email}`}
                        className="text-sm font-medium text-ink hover:underline"
                      >
                        {email}
                      </a>
                    </div>
                  )}
                  {phone && (
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-burnt">
                        Phone
                      </span>
                      <a
                        href={`tel:${phone}`}
                        className="text-sm font-medium text-ink hover:underline"
                      >
                        {phone}
                      </a>
                    </div>
                  )}
                  {address && (
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-burnt">
                        Location
                      </span>
                      <p className="text-sm font-medium text-ink">{address}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="text-xs font-bold uppercase tracking-wider text-burnt">
              A little guidance
            </p>
            <h2 className="mt-3 font-display text-2xl text-ink">
              Not sure where to start?
            </h2>
            <p className="mt-4">
              A few details can help us understand what you need.
            </p>
            {[
              [
                "Finding the right service",
                "Share what you’re looking for or how you’d like to feel. We can help you explore your options.",
              ],
              [
                "Questions about your visit",
                "Let us know which service you have in mind, along with any preferences or questions.",
              ],
              [
                "An existing appointment",
                "Include the name used for your booking, the service, and your appointment details so we have the context.",
              ],
            ].map(([title, description]) => (
              <div key={title} className="mt-6 border-t border-line pt-4">
                <span className="block h-px w-10 bg-burnt" />
                <h3 className="mt-3 text-base font-semibold text-ink">
                  {title}
                </h3>
                <p className="mt-2">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-powder">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-8 sm:px-8 sm:py-10 lg:flex-row lg:items-center lg:justify-between lg:px-[90px] lg:py-12">
          <div>
            <h2 className="font-display text-3xl text-ink">
              Ready for a little time for yourself?
            </h2>
            <p className="mt-3 max-w-[560px] text-base/7 text-muted">
              No need to send an enquiry to book. Explore our services,
              <span className="block">
                see prices and durations, and choose a time that works for you.
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={servicesHref}
              className={buttonClasses({
                variant: "brand-outline",
                size: "lg",
              })}
            >
              View Services
            </a>
            <a
              href={servicesHref}
              className={buttonClasses({ variant: "brand", size: "lg" })}
            >
              Book An Appointment
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
