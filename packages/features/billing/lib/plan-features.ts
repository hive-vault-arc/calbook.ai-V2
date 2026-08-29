import type { PlatformPlanId } from "./plan-definitions";

export type PlatformFeatureDefinition = {
  key: string;
  minimumPlan: PlatformPlanId;
  titleKey: string;
  descriptionKey: string;
};

export const PLATFORM_FEATURES = [
  {
    key: "booking-pages",
    minimumPlan: "free",
    titleKey: "billing_feature_booking_pages",
    descriptionKey: "billing_feature_booking_pages_description",
  },
  {
    key: "calendar-connections",
    minimumPlan: "free",
    titleKey: "billing_feature_calendar_connections",
    descriptionKey: "billing_feature_calendar_connections_description",
  },
  {
    key: "email-confirmations",
    minimumPlan: "free",
    titleKey: "billing_feature_email_confirmations",
    descriptionKey: "billing_feature_email_confirmations_description",
  },
  {
    key: "paid-bookings",
    minimumPlan: "pro",
    titleKey: "billing_feature_paid_bookings",
    descriptionKey: "billing_feature_paid_bookings_description",
  },
  {
    key: "advanced-availability",
    minimumPlan: "pro",
    titleKey: "billing_feature_advanced_availability",
    descriptionKey: "billing_feature_advanced_availability_description",
  },
  {
    key: "automated-workflows",
    minimumPlan: "pro",
    titleKey: "billing_feature_automated_workflows",
    descriptionKey: "billing_feature_automated_workflows_description",
  },
  {
    key: "custom-branding",
    minimumPlan: "pro",
    titleKey: "billing_feature_custom_branding",
    descriptionKey: "billing_feature_custom_branding_description",
  },
  {
    key: "waitlists",
    minimumPlan: "pro",
    titleKey: "billing_feature_waitlists",
    descriptionKey: "billing_feature_waitlists_description",
  },
  {
    key: "event-subscriptions",
    minimumPlan: "pro",
    titleKey: "billing_feature_event_subscriptions",
    descriptionKey: "billing_feature_event_subscriptions_description",
  },
  {
    key: "priority-support",
    minimumPlan: "enterprise",
    titleKey: "billing_feature_priority_support",
    descriptionKey: "billing_feature_priority_support_description",
  },
] as const satisfies readonly PlatformFeatureDefinition[];

export type PlatformFeatureKey = (typeof PLATFORM_FEATURES)[number]["key"];

const PLAN_RANK: Record<PlatformPlanId, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
};

export function normalizePlatformPlanId(plan: string | null | undefined): PlatformPlanId {
  if (plan === "pro" || plan === "enterprise") return plan;
  return "free";
}

export function getFeaturesForPlan(plan: PlatformPlanId): PlatformFeatureDefinition[] {
  return PLATFORM_FEATURES.filter((feature) => PLAN_RANK[plan] >= PLAN_RANK[feature.minimumPlan]);
}

export function planIncludesFeature(plan: PlatformPlanId, featureKey: PlatformFeatureKey): boolean {
  return getFeaturesForPlan(plan).some((feature) => feature.key === featureKey);
}
