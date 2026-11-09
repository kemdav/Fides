import { PlanCard, type Plan } from "./plan-card";
import { landingLinks } from "./links";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export const plans: Plan[] = [
  {
    name: "Starter",
    price: "₱499",
    billed: "Billed monthly",
    description:
      "Get started with essential tools to manage your services and bookings. Ideal for new providers building their business.",
    features: [
      "Real-Time Booking Calendar",
      "Custom Service & Pricing Menu",
      "Staff & Resource Allocation",
      "Walk-in Registration & Booking",
      "QR Code Check-in System",
      "Instant Booking & Status Email Alerts",
      "Status Tracking & Audit Logs",
      "Daily Operations Dashboard",
      "Customer Profile & Visit History",
      "Basic Sales & Activity Reports",
      "Annual BIR Tax-Ready Reports",
    ],
    cta: "Get Started",
    href: landingLinks.signup,
    background: "/images/landing/plan-starter-bg.svg",
    divider: "/images/landing/plan-divider-starter.svg",
    icon: "/images/landing/icon-psychiatry.svg",
    checkTone: "success",
  },
  {
    name: "Professional",
    price: "₱1,299",
    billed: "Billed monthly",
    description:
      "Unlock powerful tools to grow your bookings and streamline your daily operations. Ideal for growing providers ready to expand their reach.",
    includes: "(Includes all Starter features, plus:)",
    features: [
      "24/7 AI Booking Assistant",
      "Automated Email Reminders",
      "Smart Waiting List Management",
      "Automated Commission Tracking",
      "Detailed Sales & Operational Analytics",
      "Quarterly BIR Tax-Ready Reports",
    ],
    cta: "Start Growing",
    href: landingLinks.signup,
    background: "/images/landing/plan-pro-bg.svg",
    divider: "/images/landing/plan-divider-pro.svg",
    icon: "/images/landing/icon-crown.svg",
    checkTone: "powder",
    featured: true,
  },
  {
    name: "Business",
    price: "₱3,999",
    billed: "Billed monthly",
    description:
      "Take your business further with advanced tools for teams, locations, and operations. Ideal for established providers ready to scale.",
    includes: "(Includes all Professional Tier features, plus:)",
    features: [
      "Multi-Branch Management",
      "Centralized Executive Dashboard & Analytics",
      "Multi-Branch Inventory Tracking",
      "Consolidated Multi-Branch BIR Reporting",
      "Location-Based Role & Access Control",
    ],
    cta: "Scale Your Business",
    href: landingLinks.signup,
    background: "/images/landing/plan-business-bg.svg",
    divider: "/images/landing/plan-divider-business.svg",
    icon: "/images/landing/icon-apartment.svg",
    checkTone: "deep",
  },
];

export function Pricing() {
  const [starter, professional, business] = plans;

  return (
    <section
      id="pricing"
      className="scroll-mt-16 bg-burnt/10 px-4 py-12 text-ink sm:px-8 lg:scroll-mt-[88px] lg:px-[78px] lg:py-[100px]"
    >
      <div className="mx-auto max-w-[1286px]">
        <SectionHeading reveal title="Find the Right Plan for Your Business">
          Whether you&apos;re just starting out or growing your business, Fides has a
          plan to support your next step.
        </SectionHeading>

        <div className="mt-10 flex flex-col items-center gap-10 text-left sm:mt-[83px] xl:flex-row xl:items-start xl:justify-between xl:gap-10">
          <Reveal from="up" className="w-full max-w-[391px] xl:mt-[83px]">
            <PlanCard plan={starter} />
          </Reveal>
          <Reveal from="up" delay={140} className="w-full max-w-[422px]">
            <PlanCard plan={professional} />
          </Reveal>
          <Reveal from="up" delay={280} className="w-full max-w-[393px] xl:mt-[83px]">
            <PlanCard plan={business} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
