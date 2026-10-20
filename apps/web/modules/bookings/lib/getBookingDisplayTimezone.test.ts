import { describe, expect, it } from "vitest";
import { getBookingDisplayTimezone } from "./getBookingDisplayTimezone";

describe("getBookingDisplayTimezone", () => {
  const preferences = {
    attendeeTimezone: "Africa/Casablanca",
    viewerTimezone: "UTC",
    fallbackTimezone: "Europe/Paris",
  };

  it("keeps the selected attendee timezone on the confirmation page", () => {
    expect(getBookingDisplayTimezone({ ...preferences, isSuccessBookingPage: true })).toBe(
      "Africa/Casablanca"
    );
  });

  it("uses the viewer timezone when managing a booking", () => {
    expect(getBookingDisplayTimezone({ ...preferences, isSuccessBookingPage: false })).toBe("UTC");
  });

  it("falls back when neither account has a timezone", () => {
    expect(getBookingDisplayTimezone({ isSuccessBookingPage: true, fallbackTimezone: "UTC" })).toBe("UTC");
  });
});
