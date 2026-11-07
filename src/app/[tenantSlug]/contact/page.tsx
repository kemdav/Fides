"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useState, type FormEvent } from "react";
import { SectionHeading } from "@/components/landing/section-heading";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
};

const guidanceItems = [
  {
    title: "Finding the right service",
    description:
      "Share what you're looking for or how you'd like to feel. We can help you explore your options.",
  },
  {
    title: "Questions about your visit",
    description:
      "Let us know which service you have in mind, along with any preferences or questions.",
  },
  {
    title: "An existing appointment",
    description:
      "Include the name used for your booking, the service, and your appointment date so we have the context.",
  },
];

export default function ContactPage({ params }: PageProps) {
  const { tenantSlug } = use(params);
  const tenantName = "Bella Vita";

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="bg-[#FFFFEB] py-12 sm:py-16 lg:py-24">
        <Container>
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col items-start text-left">
              <SectionHeading
                align="left"
                title={
                  <span className="flex flex-col gap-2 sm:gap-3">
                    <span className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-burnt sm:text-sm">
                      Contact Us
                    </span>
                    <span>
                      A little conversation.
                      <br />
                      A little more care.
                    </span>
                  </span>
                }
              >
                Have a question about our services or your visit? Tell us
                what&apos;s on your mind. We&apos;re here to help you find the
                care that feels right for you.
              </SectionHeading>
            </div>

            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-sm sm:rounded-3xl lg:aspect-[5/4]">
              <Image
                src="/images/placeholder-1.jpg"
                alt={`Contact ${tenantName}`}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* Form and Guidance Section */}
      <section className="bg-white py-16 sm:py-20 lg:py-28">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16 xl:gap-20">
            {/* Form Left Column */}
            <div>
              <h2 className="font-display text-3xl leading-[normal] text-ink sm:text-4xl">
                Send us a message
              </h2>
              <p className="mt-2 text-base font-light text-muted sm:text-lg">
                A question, a preference, or a little guidance — start here.
              </p>
              <p className="mt-1 text-xs text-muted/80">
                All fields are required unless marked optional.
              </p>

              {submitted ? (
                <div className="mt-8 rounded-xl border border-burnt/20 bg-[#FFFFEB] p-6 text-left sm:p-8">
                  <h3 className="font-display text-2xl text-burnt">
                    Message Sent
                  </h3>
                  <p className="mt-2 text-base text-muted">
                    Thank you for reaching out to {tenantName}. We have received
                    your message and will get back to you shortly.
                  </p>
                  <Button
                    variant="brand"
                    size="cta"
                    className="mt-6"
                    onClick={() => setSubmitted(false)}
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="name"
                        className="mb-1.5 block text-sm font-medium text-ink"
                      >
                        Name<span className="text-burnt">*</span>
                      </label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        placeholder="Your Name"
                        className="h-11 rounded-md border-neutral-300 bg-white"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="mb-1.5 block text-sm font-medium text-ink"
                      >
                        Email<span className="text-burnt">*</span>
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="Your email address"
                        className="h-11 rounded-md border-neutral-300 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="phone"
                        className="mb-1.5 block text-sm font-medium text-ink"
                      >
                        Phone
                      </label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="Your phone number"
                        className="h-11 rounded-md border-neutral-300 bg-white"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="topic"
                        className="mb-1.5 block text-sm font-medium text-ink"
                      >
                        Service/Topic<span className="text-burnt">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="topic"
                          name="topic"
                          required
                          defaultValue=""
                          className="flex h-11 w-full appearance-none rounded-md border border-neutral-300 bg-white px-3 py-2 pr-10 text-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
                        >
                          <option value="" disabled>
                            Select a Topic
                          </option>
                          <option value="finding-service">
                            Finding the right service
                          </option>
                          <option value="visit-questions">
                            Questions about your visit
                          </option>
                          <option value="existing-appointment">
                            An existing appointment
                          </option>
                          <option value="general-inquiry">
                            General enquiry
                          </option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-500">
                          {/* Raw SVG Chevron Down icon */}
                          <svg
                            className="size-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                    <div>
                      <label
                        htmlFor="message"
                        className="mb-1.5 block text-sm font-medium text-ink"
                      >
                        Message<span className="text-burnt">*</span>
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={5}
                        required
                        placeholder="How can we help you?"
                        className="flex w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
                      />
                    </div>

                  <p className="text-xs text-muted">
                    Please share only what&apos;s needed for your enquiry. Avoid
                    including sensitive personal or payment information.
                  </p>

                  <div>
                    <Button type="submit" variant="brand" size="cta">
                      Send Message
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Sidebar Right Column */}
            <div className="flex flex-col items-start lg:pl-6">
              <SectionHeading
                align="left"
                title={
                  <span className="flex flex-col gap-2">
                    <span className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-burnt sm:text-sm">
                      A Little Guidance
                    </span>
                    <span className="text-2xl sm:text-3xl lg:text-3xl">
                      Not sure where to start?
                    </span>
                  </span>
                }
              >
                A few details can help us understand what you need.
              </SectionHeading>

              <div className="mt-4 w-full">
                {guidanceItems.map((item) => (
                  <div key={item.title}>
                    <span
                      aria-hidden="true"
                      className="my-6 block h-[2px] w-8 rounded-full bg-burnt"
                    />
                    <h3 className="text-base font-semibold text-ink sm:text-lg">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm/relaxed font-light text-muted sm:text-base/relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Bottom CTA Section */}
      <section className="border-t border-line/40 bg-[#FFFFEB] py-16 sm:py-20">
        <Container>
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-xl text-left">
              <h2 className="font-display text-3xl leading-[normal] text-ink sm:text-4xl">
                Ready for a little time for yourself?
              </h2>
              <p className="mt-3 text-base/relaxed font-light text-muted sm:text-lg/relaxed">
                No need to send an enquiry to book. Explore our services, see
                prices and durations, and choose a time that works for you.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link href={`/${tenantSlug}/services`}>
                <Button variant="brand-outline" size="cta">
                  View Services
                </Button>
              </Link>
              <Link href={`/${tenantSlug}/services`}>
                <Button variant="brand" size="cta">
                  Book An Appointment
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
