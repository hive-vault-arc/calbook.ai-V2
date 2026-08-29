import process from "node:process";
export type PlatformPlanId = "free" | "pro" | "enterprise";

export type PlatformPlan = {
  id: PlatformPlanId;
  name: string;
  description: string;
  monthlyPriceCents: number | null;
  annualPriceCents: number | null;
  monthlyPriceId?: string;
  annualPriceId?: string;
};

export const PLATFORM_PLANS: Record<PlatformPlanId, PlatformPlan> = {
  free: {
    id: "free",
    name: "Free",
    description: "For getting started with CalBook.ai",
    monthlyPriceCents: 0,
    annualPriceCents: 0,
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For professionals monetizing their time",
    monthlyPriceCents: 2900,
    annualPriceCents: 29000,
    monthlyPriceId: process.env.STRIPE_PLATFORM_PRO_MONTHLY_PRICE_ID,
    annualPriceId: process.env.STRIPE_PLATFORM_PRO_ANNUAL_PRICE_ID,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "For organizations with advanced scheduling needs",
    monthlyPriceCents: null,
    annualPriceCents: null,
    monthlyPriceId: process.env.STRIPE_PLATFORM_ENTERPRISE_MONTHLY_PRICE_ID,
    annualPriceId: process.env.STRIPE_PLATFORM_ENTERPRISE_ANNUAL_PRICE_ID,
  },
};

export function getPlatformPriceId(planId: Exclude<PlatformPlanId, "free">, interval: "month" | "year") {
  const plan = PLATFORM_PLANS[planId];
  return interval === "month" ? plan.monthlyPriceId : plan.annualPriceId;
}
