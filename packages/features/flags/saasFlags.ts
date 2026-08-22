import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";
import type { FeatureId } from "./config";

/**
 * R5.4: Controlled rollout flags for SaaS v1 monetization features.
 * Each flag gates a feature family so it can be enabled/disabled globally
 * without code changes or redeployment.
 */
export const SAAS_FLAGS = {
  monetization: "monetization-paid-bookings",
  tieredAvailability: "tiered-availability",
  waitlist: "waitlist",
  eventSubscriptions: "event-subscriptions",
} as const satisfies Record<string, FeatureId>;

/**
 * Check if a SaaS feature flag is enabled.
 * Defaults to enabled (true) when no Feature row exists, so that existing
 * functionality is not broken if the flag is not seeded in the database.
 * Only disables when a Feature row exists with enabled=false.
 */
export async function isSaaSFeatureEnabled(flag: FeatureId): Promise<boolean> {
  try {
    const repo = getFeatureRepository();
    const feature = await repo.findBySlug(flag);
    if (!feature) return true;
    return feature.enabled;
  } catch {
    // If the feature repository is unavailable, default to enabled
    // so that flag infrastructure failures don't break existing functionality.
    return true;
  }
}
