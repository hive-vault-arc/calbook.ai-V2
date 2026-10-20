export function getBookingDisplayTimezone({
  isSuccessBookingPage,
  attendeeTimezone,
  viewerTimezone,
  fallbackTimezone,
}: {
  isSuccessBookingPage: boolean;
  attendeeTimezone?: string | null;
  viewerTimezone?: string | null;
  fallbackTimezone: string;
}): string {
  // A signed-in viewer's profile must not replace the timezone selected by the invitee.
  if (isSuccessBookingPage && attendeeTimezone) return attendeeTimezone;
  return viewerTimezone || fallbackTimezone;
}
