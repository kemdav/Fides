import Image from "next/image";
import Link from "next/link";
import { buttonClasses } from "@/components/ui";

interface AboutPageSectionProps {
  eyebrow: string;
  heading: string;
  children: React.ReactNode;
  headingClassName?: string;
}

function AboutPageSection({
  eyebrow,
  heading,
  children,
  headingClassName,
}: AboutPageSectionProps) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-burnt">
        {eyebrow}
      </p>
      <h2
        className={`mt-3 font-display text-3xl leading-[1.1] text-ink sm:text-5xl ${headingClassName ?? ""}`}
      >
        {heading}
      </h2>
      <div className="mt-5 text-xs text-muted sm:text-base/7">
        {children}
      </div>
    </div>
  );
}

export function StorefrontAboutPage({
  businessName,
}: {
  businessName: string;
}) {
  return (
    <main className="flex-1">
      <section className="bg-powder">
        <div className="mx-auto grid max-w-[1200px] items-center gap-8 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-2 lg:gap-16 lg:px-0 lg:py-16">
          <AboutPageSection
            eyebrow={`About ${businessName}`}
            heading="A space to pause. Care to feel good."
            headingClassName="max-w-[390px]"
          >
            <p>
              Welcome to Bella Vita. A little time to slow down, feel cared for,
              and reconnect with yourself—whether you&apos;re here for a fresh
              look or a quiet moment of rest.
            </p>
            <Link
              href="#book"
              className={buttonClasses({
                variant: "brand",
                size: "md",
                className: "mt-6",
              })}
            >
              Book An Appointment
            </Link>
          </AboutPageSection>

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
        <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-2 lg:gap-16 lg:px-0 lg:py-12">
          <AboutPageSection
            eyebrow="Our story"
            heading="Little moments of care, more room for you."
          >
            <p>
              Life can feel full. We believe looking after yourself should feel
              like a welcome pause, not another thing on your list.
            </p>
          </AboutPageSection>
          <div className="text-sm/6 text-muted sm:text-base/7">
            <p>
              That&apos;s the idea at the heart of Bella Vita: bringing calm and
              wellness into together with a warm, personal experience.
            </p>
            <p className="mt-3">
              Our team is here to make your visit easy, thoughtful, and
              genuinely yours.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-powder">
        <div className="mx-auto grid max-w-[1200px] items-center gap-8 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16 lg:px-0 lg:py-16">
          <div className="relative aspect-[1.35/1] overflow-hidden rounded-lg">
            <Image
              src="/images/storefront/Massage Service photograph.png"
              alt="Wellness massage at Bella Vita"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
          </div>
          <AboutPageSection eyebrow="Our mission" heading="A warm welcome. Care that starts with you.">
            <p>
              Our mission is simple: to create a warm, welcoming space where
              everyone can find a little time for themselves.
            </p>
            <p className="mt-3 font-semibold text-ink">
              We listen, then care thoughtfully.
            </p>
            <p className="mt-2">
              Your preferences, comfort, and questions matter. We take a
              personal approach, with clear guidance and attention to the
              little things that help you feel at ease.
            </p>
          </AboutPageSection>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8 sm:py-12 lg:px-0 lg:py-14">
          <p className="text-xs font-bold uppercase tracking-wider text-burnt">
            Your bella vita
          </p>
          <h2 className="mt-3 font-display text-3xl leading-[1.1] text-ink sm:text-4xl">
            What you can expect at Bella Vita
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {[
              [
                "A welcome, just as you are",
                "First visit or familiar face, you’re welcome here. Settle in, ask questions, and make yourself comfortable.",
              ],
              [
                "Care shaped around you",
                "Tell us what you’re looking for and how you’d like to feel. We’ll listen first and help you choose the right service for you.",
              ],
              [
                "A little less to think about",
                "Explore services, pick your duration, and book with ease. A simple start to your moment of care.",
              ],
            ].map(([title, description]) => (
              <div key={title}>
                <span className="block h-px w-3 bg-burnt" />
                <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
                <p className="mt-3 text-sm/6 text-muted">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-powder">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-5 py-8 sm:px-8 sm:py-10 lg:flex-row lg:items-center lg:justify-between lg:px-0">
          <div>
            <h2 className="font-display text-3xl text-ink">Make a little time for yourself.</h2>
            <p className="mt-3 max-w-md text-sm/6 text-muted">
              A fresh look, a moment of rest, or simply a little care. Choose a
              service and find a time that works for you.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="#contact"
              className={buttonClasses({
                variant: "brand-outline",
                size: "md",
              })}
            >
              Contact Us
            </Link>
            <Link
              href="#book"
              className={buttonClasses({
                variant: "brand",
                size: "md",
              })}
            >
              Book An Appointment
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
