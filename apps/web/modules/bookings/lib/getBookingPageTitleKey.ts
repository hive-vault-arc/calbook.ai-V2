import { BookingStatus } from "@calcom/prisma/enums";

export function getBookingPageTitleKey({
  status,
  requiresConfirmation,
  recurring,
}: {
  status: BookingStatus;
  requiresConfirmation: boolean;
  recurring: boolean;
}) {
  if (status === BookingStatus.CANCELLED) return "booking_cancelled";
  if (status === BookingStatus.REJECTED) return "booking_rejected";

  const pending = status === BookingStatus.PENDING && requiresConfirmation;
  if (pending) return recurring ? "booking_submitted_recurring" : "booking_submitted";

  return recurring ? "booking_confirmed_recurring" : "booking_confirmed";
}
