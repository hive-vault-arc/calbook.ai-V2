import type { RouterInputs, RouterOutputs } from "@calcom/trpc/react";

type BookingListingStatus = NonNullable<
  RouterInputs["viewer"]["bookings"]["get"]["filters"]["statuses"]
>[number];

type BookingItem = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];

type BookingItemProps = BookingItem & {
  bookingPackage?: {
    totalSessions: number;
    usedSessions: number;
  } | null;
  listingStatus: BookingListingStatus;
  recurringInfo: RouterOutputs["viewer"]["bookings"]["get"]["recurringInfo"][number] | undefined;
  loggedInUser: {
    userId: number | undefined;
    userTimeZone: string | undefined;
    userTimeFormat: number | null | undefined;
    userEmail: string | undefined;
  };
  isToday: boolean;
  onClick?: () => void;
};

export type { BookingItemProps, BookingListingStatus };
