import { describe, expect, it } from "vitest";
import { addWaitlistTierToBookingMetadata, getWaitlistTierFromBookingMetadata } from "./waitlistTierMetadata";

describe("waitlist tier booking metadata", () => {
  it("stores the server-selected tier without trusting the client metadata value", () => {
    expect(
      addWaitlistTierToBookingMetadata({ source: "booking-page", calbookTier: "forged" }, "pro")
    ).toEqual({ source: "booking-page", calbookTier: "pro" });
  });

  it("removes a client-provided tier when the booking has no selected tier", () => {
    expect(addWaitlistTierToBookingMetadata({ calbookTier: "forged" })).toEqual({});
  });

  it("reads only non-empty string tiers from stored booking metadata", () => {
    expect(getWaitlistTierFromBookingMetadata({ calbookTier: "pro" })).toBe("pro");
    expect(getWaitlistTierFromBookingMetadata({ calbookTier: 1 })).toBeUndefined();
    expect(getWaitlistTierFromBookingMetadata(null)).toBeUndefined();
  });
});
