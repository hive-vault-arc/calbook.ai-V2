import { describe, expect, it } from "vitest";
import { getPaymentBadgeKind } from "./getPaymentBadge";

describe("getPaymentBadgeKind", () => {
  it.each([
    [{ paymentOption: "ON_BOOKING", success: true, refunded: false }, "paid"],
    [{ paymentOption: "DEPOSIT", success: true, refunded: false }, "deposit"],
    [{ paymentOption: "TIP", success: true, refunded: false }, "tip"],
    [{ paymentOption: "HOLD", success: true, refunded: false }, "cardHeld"],
    [{ paymentOption: "ON_BOOKING", success: false, refunded: false }, "pending"],
    [{ paymentOption: "TIP", success: true, refunded: true }, "refunded"],
  ] as const)("maps %o to %s", (payment, expectedKind) => {
    expect(getPaymentBadgeKind(payment)).toBe(expectedKind);
  });
});
