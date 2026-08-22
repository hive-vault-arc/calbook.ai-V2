import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentryMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: sentryMocks.captureException,
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

import { FAILURE_CATEGORIES, logFailure } from "./monitoring";

describe("monitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("FAILURE_CATEGORIES", () => {
    it("exposes the six SaaS v1 failure categories", () => {
      expect(FAILURE_CATEGORIES.CHECKOUT).toBe("checkout_failure");
      expect(FAILURE_CATEGORIES.WEBHOOK).toBe("webhook_failure");
      expect(FAILURE_CATEGORIES.EMAIL).toBe("email_failure");
      expect(FAILURE_CATEGORIES.BOOKING).toBe("booking_failure");
      expect(FAILURE_CATEGORIES.PAYMENT).toBe("payment_failure");
      expect(FAILURE_CATEGORIES.SUBSCRIPTION).toBe("subscription_failure");
    });
  });

  describe("logFailure", () => {
    it("logs and reports to Sentry with the correct category tag", () => {
      const error = new Error("Stripe timeout");
      logFailure({
        category: FAILURE_CATEGORIES.CHECKOUT,
        message: "Checkout failed",
        error,
        context: { eventTypeId: 42 },
      });

      expect(sentryMocks.captureException).toHaveBeenCalledWith(error, {
        tags: { failureCategory: "checkout_failure" },
        extra: { category: "checkout_failure", message: "Checkout failed", eventTypeId: 42 },
      });
    });

    it("creates a synthetic error when none is provided", () => {
      logFailure({
        category: FAILURE_CATEGORIES.EMAIL,
        message: "Email send failed",
      });

      expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
      const [reportedError] = sentryMocks.captureException.mock.calls[0];
      expect(reportedError).toBeInstanceOf(Error);
      expect((reportedError as Error).message).toBe("Email send failed");
    });
  });
});
