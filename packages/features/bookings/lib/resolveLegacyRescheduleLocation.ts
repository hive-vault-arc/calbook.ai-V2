import { DailyLocationType } from "@calcom/app-store/constants";
import { OrganizerDefaultConferencingAppType } from "@calcom/app-store/locations";
import type { Prisma } from "@calcom/prisma/client";
import { userMetadata } from "@calcom/prisma/zod-utils";

type ExistingBookingLocation = {
  location: string | null;
  metadata: Prisma.JsonValue;
  references: readonly { type: string; meetingUrl: string | null }[];
};

export function resolveLegacyRescheduleLocation({
  location,
  originalBooking,
  hasExplicitLocation,
  organizerMetadata,
}: {
  location: string;
  originalBooking: ExistingBookingLocation | null;
  hasExplicitLocation: boolean;
  organizerMetadata: Prisma.JsonValue;
}): string {
  if (
    location !== DailyLocationType ||
    originalBooking?.location !== DailyLocationType ||
    hasExplicitLocation
  ) {
    return location;
  }

  const parsed = userMetadata.safeParse(organizerMetadata);
  const preference = parsed.success ? parsed.data?.defaultConferencingApp : null;
  if (!parsed.success || preference?.appSlug || preference?.appLink) return location;

  const hasMeetingReference = originalBooking.references.some(
    (reference) =>
      reference.type.includes("_video") || reference.type.includes("_conferencing") || reference.meetingUrl
  );
  if (hasMeetingReference) return location;

  const metadata = originalBooking.metadata;
  if (metadata !== null && (typeof metadata !== "object" || Array.isArray(metadata))) return location;
  if (metadata?.videoCallUrl) return location;

  // Older defaults persisted Daily without creating a meeting. Re-resolve only orphaned, implicit locations.
  return OrganizerDefaultConferencingAppType;
}
