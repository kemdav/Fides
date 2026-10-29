import Image from "next/image";
import Link from "next/link";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/utils";
import { landingLinks } from "./links";

type Plan = {
  name: string;
  price: string;
  billed: string;
  description: string;
  includes?: string;
  features: string[];
  cta: string;
  background: string;
  divider: string;
  icon: string;
  checkColor: string;
  featured?: boolean;
};

const plans: Plan[] = [
  {
    name: "Starter",
    price: "₱499",
    billed: "₱499 billed yearly",
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
    background: "/images/landing/plan-starter-bg.svg",
    divider: "/images/landing/plan-divider-starter.svg",
    icon: "/images/landing/icon-psychiatry.svg",
    checkColor: "var(--color-success)",
  },
  {
    name: "Professional",
    price: "₱1,299",
    billed: "₱499 billed yearly",
    description:
      "Unlock poweful tools to grow your bookings and streamline your daily operations. Ideal for growing providers ready to expand their reach.",
    includes: "(Includes all Basic Tier features, plus:)",
    features: [
      "24/7 AI Booking Assistant",
      "Automated Email Reminders",
      "Smart Waiting List Management",
      "Automated Commission Tracking",
      "Detailed Sales & Operational Analytics",
      "Quarterly BIR Tax-Ready Reports",
    ],
    cta: "Start Growing",
    background: "/images/landing/plan-pro-bg.svg",
    divider: "/images/landing/plan-divider-pro.svg",
    icon: "/images/landing/icon-crown.svg",
    checkColor: "var(--color-mint)",
    featured: true,
  },
  {
    name: "Business",
    price: "₱3,999",
    billed: "₱499 billed yearly",
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
    background: "/images/landing/plan-business-bg.svg",
    divider: "/images/landing/plan-divider-business.svg",
    icon: "/images/landing/icon-apartment.svg",
    checkColor: "var(--color-success-deep)",
  },
];

function CheckIcon({ color }: { color: string }) {
  const mask = 'url("/images/landing/check-circle.svg")';
  return (
    <span aria-hidden className="relative block size-6 shrink-0">
      <span
        className="absolute inset-0"
        style={{
          backgroundColor: color,
          maskImage: mask,
          WebkitMaskImage: mask,
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "2px 2px",
          WebkitMaskPosition: "2px 2px",
          maskSize: "20px 20px",
          WebkitMaskSize: "20px 20px",
        }}
      />
    </span>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const { featured } = plan;

  return (
    <div
      className={cn(
        "relative flex min-h-[927px] w-full max-w-[391px] flex-col px-[35px] pb-[51px] pt-10",
        featured ? "text-white" : "text-ink"
      )}
    >
      <Image src={plan.background} alt="" fill aria-hidden className="-z-0" />

      <div className="relative flex items-center gap-2.5">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[10px] border",
            featured ? "border-mist" : "border-burnt/60"
          )}
        >
          <Image src={plan.icon} alt="" width={20} height={20} aria-hidden />
        </span>
        <h3 className="text-2xl/7 font-semibold">{plan.name}</h3>
      </div>

      {featured && (
        <span className="absolute right-[9px] top-[53px] -translate-y-1/2 text-base/6 font-semibold text-info">
          Most Popular
        </span>
      )}

      <div className="relative mt-[38px] flex items-center gap-5 font-semibold">
        <p className="text-[44px]/12">{plan.price}</p>
        <div className="text-base/6">
          <p>/month (Php)</p>
          <p>{plan.billed}</p>
        </div>
      </div>

      <p className="relative mt-[13px] min-h-[63px] pr-4 text-sm/normal">{plan.description}</p>

      <Image
        src={plan.divider}
        alt=""
        width={391}
        height={1}
        aria-hidden
        className="relative -mx-[35px] mt-9 h-px w-[calc(100%+70px)] max-w-none"
      />

      {plan.includes && (
        <p className="relative mt-3 text-sm/5 font-semibold italic">{plan.includes}</p>
      )}

      <ul className={cn("relative -mr-6 flex flex-col gap-4", plan.includes ? "mt-[22px]" : "mt-[34px]")}>
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-3 text-sm/normal">
            <CheckIcon color={plan.checkColor} />
            {feature}
          </li>
        ))}
      </ul>

      <div className="relative mt-auto flex justify-center pt-8">
        <Link
          href={landingLinks.signup}
          className={buttonClasses({ variant: "accent", size: "pill" })}
        >
          {plan.cta}
        </Link>
      </div>
    </div>
  );
}

export function Pricing() {
  const [starter, professional, business] = plans;

  return (
    <section id="pricing" className="bg-burnt/10 px-4 pb-12 pt-12 sm:px-8 lg:px-[78px] lg:pb-10 lg:pt-[42px]">
      <div className="mx-auto max-w-[1286px] text-center text-ink">
        <h2 className="font-display text-4xl leading-[normal] sm:text-5xl lg:text-[56px]">
          Find the Right Plan for Your Business
        </h2>
        <p className="mx-auto mt-3 max-w-[789px] text-xl/7 font-light">
          Whether you&apos;re just starting out or growing your business, Fides has a
          plan to support your next step.
        </p>

        <div className="mt-10 flex flex-col items-center gap-10 text-left lg:mt-[50px] lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="w-full max-w-[391px] lg:mt-[83px]">
            <PlanCard plan={starter} />
          </div>

          <div className="w-full max-w-[422px] rounded-[30px] bg-sky py-[15px] pl-[14px] pr-0 drop-shadow-[8px_8px_4px_rgba(0,0,0,0.25)] lg:order-none">
            <div className="relative">
              <PlanCard plan={professional} />
            </div>
          </div>

          <div className="w-full max-w-[393px] lg:mt-[83px]">
            <PlanCard plan={business} />
          </div>
        </div>
      </div>
    </section>
  );
}
