const WAITLIST_TIER_METADATA_KEY = "calbookTier";

export function addWaitlistTierToBookingMetadata(
  metadata: Record<string, string>,
  tier?: string
): Record<string, string> {
  const bookingMetadata = { ...metadata };
  delete bookingMetadata[WAITLIST_TIER_METADATA_KEY];
  if (tier) bookingMetadata[WAITLIST_TIER_METADATA_KEY] = tier;
  return bookingMetadata;
}

export function getWaitlistTierFromBookingMetadata(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const tier = (metadata as Record<string, unknown>)[WAITLIST_TIER_METADATA_KEY];
  return typeof tier === "string" && tier.length > 0 ? tier : undefined;
}
