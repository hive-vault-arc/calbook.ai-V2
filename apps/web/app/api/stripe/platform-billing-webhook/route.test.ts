import type Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  syncWebhook: vi.fn(),
  logFailure: vi.fn(),
  recordError: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class StripeMock {
    webhooks = { constructEvent: mocks.constructEvent };
  },
}));

vi.mock("@calcom/features/billing/lib/PlatformBillingService", () => ({
  platformBillingService: { syncWebhook: mocks.syncWebhook },
}));

vi.mock("@calcom/features/monitoring/lib/errorRateTracker", () => ({
  errorRateTracker: { recordError: mocks.recordError },
}));

vi.mock("@calcom/features/monitoring/lib/monitoring", () => ({
  FAILURE_CATEGORIES: { WEBHOOK: "webhook_failure" },
  logFailure: mocks.logFailure,
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({ error: vi.fn(), warn: vi.fn() }),
  },
}));

import { POST } from "./route";

function request(signature?: string): Request {
  return new Request("http://localhost/api/stripe/platform-billing-webhook", {
    method: "POST",
    headers: signature ? { "stripe-signature": signature } : undefined,
    body: JSON.stringify({ id: "evt_fixture" }),
  });
}

describe("platform billing webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logFailure.mockReturnValue("trace-webhook-123");
    mocks.recordError.mockResolvedValue(undefined);
    vi.stubEnv("STRIPE_PRIVATE_KEY", "sk_test_example");
    vi.stubEnv("STRIPE_PLATFORM_BILLING_WEBHOOK_SECRET", "whsec_example");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 503 when the webhook is not configured", async () => {
    vi.stubEnv("STRIPE_PLATFORM_BILLING_WEBHOOK_SECRET", "");

    const response = await POST(request("sig_fixture"));

    expect(response.status).toBe(503);
    expect(mocks.constructEvent).not.toHaveBeenCalled();
  });

  it("rejects a request without a Stripe signature", async () => {
    const response = await POST(request());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: "Missing signature" });
  });

  it("rejects an invalid Stripe signature without invoking the service", async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const response = await POST(request("sig_invalid"));

    expect(response.status).toBe(400);
    expect(mocks.syncWebhook).not.toHaveBeenCalled();
  });

  it("processes a verified Stripe event fixture", async () => {
    const event = {
      id: "evt_subscription_updated",
      type: "customer.subscription.updated",
    } as Stripe.Event;
    mocks.constructEvent.mockReturnValue(event);

    const response = await POST(request("sig_valid"));

    expect(response.status).toBe(200);
    expect(mocks.syncWebhook).toHaveBeenCalledWith(event);
    await expect(response.json()).resolves.toEqual({ received: true });
  });

  it("returns 500 so Stripe retries a verified event that fails processing", async () => {
    const error = new Error("Database unavailable");
    const event = {
      id: "evt_retryable",
      type: "invoice.payment_failed",
    } as Stripe.Event;
    mocks.constructEvent.mockReturnValue(event);
    mocks.syncWebhook.mockRejectedValue(error);

    const response = await POST(request("sig_valid"));

    expect(response.status).toBe(500);
    expect(mocks.logFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "webhook_failure",
        error,
        context: { eventId: event.id, eventType: event.type },
      })
    );
    expect(mocks.recordError).toHaveBeenCalledWith("platform-billing-webhook", {
      correlationId: "trace-webhook-123",
      category: "webhook_failure",
      context: { eventId: event.id, eventType: event.type },
    });
    expect(response.headers.get("x-correlation-id")).toBe("trace-webhook-123");
    await expect(response.json()).resolves.toEqual({
      message: "Webhook handler failed",
      correlationId: "trace-webhook-123",
    });
  });
});
