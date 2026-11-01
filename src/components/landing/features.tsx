import { FeatureStack, type FeatureItem } from "./feature-stack";
import { SectionHeading } from "./section-heading";

export const features: FeatureItem[] = [
  {
    title: "Branded Business Website",
    description:
      "Give your business a professional online presence where customers can discover and book your services.",
    icon: {
      src: "/images/landing/icon-website.svg",
      inset: "7.81% 6.25% 20.31% 10.94%",
      bleed: "-2.17% -1.89% -2.93% -2.55%",
    },
  },
  {
    title: "Online Booking & AI Chatbot",
    description:
      "Let customers book anytime with 24/7 AI assistance to answer questions and guide them through the booking process.",
    icon: {
      src: "/images/landing/feature-booking.svg",
      inset: "10.94% 7.81% 12.5% 9.38%",
      bleed: "-2.76% -2.55%",
    },
  },
  {
    title: "Appointment Management",
    description: "Manage online bookings, walk-ins, and other appointments from one calendar.",
    icon: {
      src: "/images/landing/feature-appointments.svg",
      inset: "10.94% 7.81% 9.38% 10.94%",
      bleed: "-2.65% -2.6%",
    },
  },
  {
    title: "Staff Management",
    description: "Keep track of staff schedules, availability, assignments, and permissions.",
    icon: {
      src: "/images/landing/feature-staff.svg",
      inset: "21.88% 4.69% 7.81% 4.69%",
      bleed: "0 -2.33% -3% -2.33%",
    },
  },
  {
    title: "Secure Customer Management",
    description:
      "Protect customer information while keeping profiles and appointment history organized and accessible.",
    icon: {
      src: "/images/landing/feature-customers.svg",
      inset: "14.06% 7.81% 6.25% 9.38%",
      bleed: "-2.65% -2.55%",
    },
  },
  {
    title: "BIR-Ready Reports",
    description:
      "Generate organized business reports to simplify recordkeeping and support tax preparation.",
    icon: {
      src: "/images/landing/feature-reports.svg",
      inset: "7.81% 6.25% 7.81% 12.5%",
      bleed: "-2.5% -2.6%",
    },
    solid: "#c55200",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-16 bg-powder lg:scroll-mt-[88px]">
      <FeatureStack items={features}>
        <SectionHeading reveal title="Everything You Need to Run Your Business">
          From accepting bookings to managing your daily operations, Fides keeps
          your business organized in one place.
        </SectionHeading>
      </FeatureStack>
    </section>
  );
}
