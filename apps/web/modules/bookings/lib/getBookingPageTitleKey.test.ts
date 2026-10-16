import { BookingStatus } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import { getBookingPageTitleKey } from "./getBookingPageTitleKey";

describe("getBookingPageTitleKey", () => {
  it.each([false, true])("reports cancellation regardless of recurrence (%s)", (recurring) => {
    expect(
      getBookingPageTitleKey({ status: BookingStatus.CANCELLED, requiresConfirmation: true, recurring })
    ).toBe("booking_cancelled");
  });

  it.each([false, true])("reports rejection regardless of recurrence (%s)", (recurring) => {
    expect(
      getBookingPageTitleKey({ status: BookingStatus.REJECTED, requiresConfirmation: true, recurring })
    ).toBe("booking_rejected");
  });

  it.each([
    [false, "booking_submitted"],
    [true, "booking_submitted_recurring"],
  ] as const)("preserves pending confirmation titles (%s)", (recurring, expected) => {
    expect(
      getBookingPageTitleKey({ status: BookingStatus.PENDING, requiresConfirmation: true, recurring })
    ).toBe(expected);
  });

  it.each([
    [false, "booking_confirmed"],
    [true, "booking_confirmed_recurring"],
  ] as const)("preserves accepted titles (%s)", (recurring, expected) => {
    expect(
      getBookingPageTitleKey({ status: BookingStatus.ACCEPTED, requiresConfirmation: true, recurring })
    ).toBe(expected);
  });

  it("preserves the existing pending-without-confirmation behavior", () => {
    expect(
      getBookingPageTitleKey({
        status: BookingStatus.PENDING,
        requiresConfirmation: false,
        recurring: false,
      })
    ).toBe("booking_confirmed");
  });
});
