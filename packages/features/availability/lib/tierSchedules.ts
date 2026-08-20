/**
 * TierSchedules maps tier names to schedule IDs.
 * Example: { "free": 1, "pro": 2, "premium": 3 }
 */
export type TierSchedules = Record<string, number>;

/**
 * Parse the tierSchedules JSON from an event type.
 * Returns null if tierSchedules is not set or invalid.
 */
export function parseTierSchedules(tierSchedules: unknown): TierSchedules | null {
  if (!tierSchedules || typeof tierSchedules !== "object") {
    return null;
  }
  const parsed = tierSchedules as Record<string, unknown>;
  const result: TierSchedules = {};
  for (const [tier, scheduleId] of Object.entries(parsed)) {
    if (typeof scheduleId === "number" && scheduleId > 0) {
      result[tier] = scheduleId;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Resolve the schedule ID for a given tier.
 * Falls back to the event type's default scheduleId if the tier is not found.
 */
export function resolveTierScheduleId(
  eventType: { scheduleId?: number | null; tierSchedules?: unknown },
  tier?: string
): number | null {
  if (!tier) {
    return eventType.scheduleId ?? null;
  }
  const tiers = parseTierSchedules(eventType.tierSchedules);
  if (!tiers) {
    return eventType.scheduleId ?? null;
  }
  const tierScheduleId = tiers[tier];
  if (!tierScheduleId) {
    return eventType.scheduleId ?? null;
  }
  return tierScheduleId;
}

/**
 * Get the list of available tiers for an event type.
 * Returns an empty array if tierSchedules is not configured.
 */
export function getAvailableTiers(eventType: { tierSchedules?: unknown }): string[] {
  const tiers = parseTierSchedules(eventType.tierSchedules);
  return tiers ? Object.keys(tiers) : [];
}
