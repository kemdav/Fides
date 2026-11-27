import type { PublicPlan } from "@/lib/plans/catalog";
import { formatPeso } from "@/lib/registration/options";
import { landingLinks } from "./links";
import type { Plan } from "./plan-card";

type Appearance = Pick<Plan, "cta" | "background" | "divider" | "icon" | "filledIcon" | "checkTone" | "featured">;

const appearance: Record<string, Appearance> = {
  basic: {
    cta: "Get Started",
    background: "/images/landing/plan-starter-bg.svg",
    divider: "/images/landing/plan-divider-starter.svg",
    icon: "/images/landing/icon-psychiatry.svg",
    filledIcon: "/images/landing/icon-psychiatry-filled.svg",
    checkTone: "success",
  },
  business: {
    cta: "Start Growing",
    background: "/images/landing/plan-pro-bg.svg",
    divider: "/images/landing/plan-divider-pro.svg",
    icon: "/images/landing/icon-crown.svg",
    filledIcon: "/images/landing/icon-crown-filled.svg",
    checkTone: "powder",
    featured: true,
  },
  enterprise: {
    cta: "Scale Your Business",
    background: "/images/landing/plan-business-bg.svg",
    divider: "/images/landing/plan-divider-business.svg",
    icon: "/images/landing/icon-apartment.svg",
    checkTone: "deep",
  },
};

/** a tier an administrator adds later borrows the plain look */
const plain: Appearance = {
  cta: "Get Started",
  background: "/images/landing/plan-starter-bg.svg",
  divider: "/images/landing/plan-divider-starter.svg",
  icon: "/images/landing/icon-psychiatry.svg",
  checkTone: "success",
};

export type PlanCardData = Plan & { code: string };

export function toPlanCards(plans: readonly PublicPlan[]): PlanCardData[] {
  return plans.map((plan) => ({
    ...(appearance[plan.code] ?? plain),
    code: plan.code,
    name: plan.name,
    description: plan.description,
    features: plan.features,
    price: formatPeso(plan.price),
    billed: "Billed monthly",
    includes: plan.includes ?? undefined,
    href: landingLinks.signup,
  }));
}
