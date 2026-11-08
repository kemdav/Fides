import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/landing/section-heading";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { getTenantBySlug } from "@/lib/supabase/queries";

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();
  const tenantName = tenant.display_name || tenant.name;

  return {
    title: `About | ${tenantName}`,
    description: `Welcome to ${tenantName}. A little time to slow down, feel cared for, and reconnect with yourself.`,
    alternates: {
      canonical: `/${tenantSlug}/about`,
    },
  };
}

const expectations = [
  {
    title: "A welcome, just as you are",
    description:
      "First visit or familiar face, you're welcome here. Settle in, ask questions, and make yourself comfortable.",
  },
  {
    title: "Care shaped around you",
    description:
      "Tell us what you're looking for and how you'd like to feel. We'll listen and help you choose the care that suits you.",
  },
  {
    title: "A little less to think about",
    description:
      "Explore services, see prices and durations, and book a time that fits. A simple start to your moment of care.",
  },
];

export default async function AboutPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();
  const tenantName = tenant.display_name || tenant.name;

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
                      About {tenantName}
                    </span>
                    <span>
                      A space to pause.
                      <br />
                      Care to feel good in.
                    </span>
                  </span>
                }
              >
                Welcome to {tenantName}. A little time to slow down, feel
                cared for, and reconnect with yourself — whether you&apos;re
                here for a fresh look or a quiet moment of rest.
              </SectionHeading>

              <div className="mt-8">
                <Link href={`/${tenantSlug}/services`}>
                  <Button variant="brand" size="cta">
                    Book An Appointment
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-sm sm:rounded-3xl lg:aspect-[5/4]">
              <Image
                src="/images/placeholder-1.jpg"
                alt={`A space to pause at ${tenantName}`}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* Our Story Section */}
      <section className="bg-white py-16 sm:py-20 lg:py-28">
        <Container>
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionHeading
                align="left"
                title={
                  <span className="flex flex-col gap-2 sm:gap-3">
                    <span className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-burnt sm:text-sm">
                      Our Story
                    </span>
                    <span>
                      Little moments of care,
                      <br />
                      more room for you.
                    </span>
                  </span>
                }
              >
                <span className="sr-only">Our background and philosophy</span>
              </SectionHeading>
            </div>

            <div className="space-y-6 text-base/relaxed font-light text-muted sm:text-lg/relaxed lg:pt-2">
              <p>
                Life can feel full. We believe looking after yourself should
                feel like a welcome pause, not another thing on your list.
              </p>
              <p>
                That&apos;s the idea at the heart of {tenantName}: bringing salon
                and wellness care together with a warm, personal welcome. From
                a simple refresh to a moment of relaxation, we make space for
                whatever feeling good means to you.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Our Mission Section */}
      <section className="bg-[#FFFFEB] py-16 sm:py-20 lg:py-28">
        <Container>
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-sm sm:rounded-3xl lg:aspect-[5/4]">
              <Image
                src="/images/placeholder-2.jpg"
                alt={`Care that starts with you at ${tenantName}`}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>

            <div className="flex flex-col items-start text-left">
              <SectionHeading
                align="left"
                title={
                  <span className="flex flex-col gap-2 sm:gap-3">
                    <span className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-burnt sm:text-sm">
                      Our Mission
                    </span>
                    <span>
                      A warm welcome.
                      <br />
                      Care that starts with you.
                    </span>
                  </span>
                }
              >
                Our mission is simple: to create a warm, welcoming space where
                everyone can find a little time for themselves.
              </SectionHeading>

              <div className="mt-8 space-y-3">
                <p className="font-semibold text-ink sm:text-lg">
                  We listen first, then care thoughtfully.
                </p>
                <p className="text-base/relaxed font-light text-muted sm:text-lg/relaxed">
                  Your preferences, comfort, and questions matter. We take a
                  personal approach, with clear guidance and attention to the
                  little things that help you feel at ease.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Expectations Section */}
      <section className="bg-white py-16 sm:py-20 lg:py-28">
        <Container>
          <div className="flex flex-col items-start text-left">
            <SectionHeading
              align="left"
              title={
                <span className="flex flex-col gap-2 sm:gap-3">
                  <span className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-burnt sm:text-sm">
                    Your Time With Us
                  </span>
                  <span>What you can expect at {tenantName}</span>
                </span>
              }
            >
              <span className="sr-only">Expectations when visiting {tenantName}</span>
            </SectionHeading>

            <div className="mt-12 grid w-full grid-cols-1 gap-8 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3 lg:gap-12">
              {expectations.map((item) => (
                <div key={item.title} className="flex flex-col items-start">
                  <span
                    aria-hidden="true"
                    className="mb-6 block h-[2px] w-8 rounded-full bg-burnt"
                  />
                  <h3 className="font-display text-xl font-medium text-ink sm:text-2xl">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm/relaxed font-light text-muted sm:text-base/relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
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
                Make a little time for yourself.
              </h2>
              <p className="mt-3 text-base/relaxed font-light text-muted sm:text-lg/relaxed">
                A fresh look, a moment of rest, or simply a little care. Choose
                a service and find a time that works for you.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link href={`/${tenantSlug}/contact`}>
                <Button variant="brand-outline" size="cta">
                  Contact Us
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
