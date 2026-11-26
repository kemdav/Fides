import { formatPeso, PLAN_OPTIONS, type PlanOptionCode } from "@/lib/registration/options";
import { landingLinks } from "./links";
import type { Plan } from "./plan-card";

const appearance = {
  starter: {
    cta: "Get Started",
    background: "/images/landing/plan-starter-bg.svg",
    divider: "/images/landing/plan-divider-starter.svg",
    icon: "/images/landing/icon-psychiatry.svg",
    filledIcon: "/images/landing/icon-psychiatry-filled.svg",
    checkTone: "success",
  },
  professional: {
    cta: "Start Growing",
    background: "/images/landing/plan-pro-bg.svg",
    divider: "/images/landing/plan-divider-pro.svg",
    icon: "/images/landing/icon-crown.svg",
    filledIcon: "/images/landing/icon-crown-filled.svg",
    checkTone: "powder",
    featured: true,
  },
  business: {
    cta: "Scale Your Business",
    background: "/images/landing/plan-business-bg.svg",
    divider: "/images/landing/plan-divider-business.svg",
    icon: "/images/landing/icon-apartment.svg",
    checkTone: "deep",
  },
} satisfies Record<PlanOptionCode, Pick<Plan, "cta" | "background" | "divider" | "icon" | "filledIcon" | "checkTone" | "featured">>;

export const plans: (Plan & { code: PlanOptionCode })[] = PLAN_OPTIONS.map((plan) => ({
  ...plan,
  ...appearance[plan.code],
  price: formatPeso(plan.price),
  billed: "Billed monthly",
  includes: plan.includes ?? undefined,
  href: landingLinks.signup,
}));
