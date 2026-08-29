import type { BookerEvent } from "@calcom/features/bookings/types";
import { BookerLayouts, defaultBookerLayoutSettings } from "@calcom/prisma/zod-utils";

type ProfileBookerLayouts = BookerEvent["profile"]["bookerLayouts"] | undefined | null;

export function getBookerLayoutSettings({
  profileBookerLayouts,
  isEmbed,
}: {
  profileBookerLayouts: ProfileBookerLayouts;
  isEmbed: boolean;
}) {
  const configuredBookerLayouts = profileBookerLayouts || defaultBookerLayoutSettings;
  if (isEmbed) return configuredBookerLayouts;

  return {
    defaultLayout: BookerLayouts.MONTH_VIEW,
    enabledLayouts: [BookerLayouts.MONTH_VIEW],
  };
}
