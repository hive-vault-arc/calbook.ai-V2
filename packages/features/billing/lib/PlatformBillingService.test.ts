import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const stripeMocks = vi.hoisted(() => ({
  customersCreate: vi.fn(),
  checkoutSessionsCreate: vi.fn(),
  portalSessionsCreate: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class StripeMock {
    customers = { create: stripeMocks.customersCreate };
    checkout = { sessions: { create: stripeMocks.checkoutSessionsCreate } };
    billingPortal = { sessions: { create: stripeMocks.portalSessionsCreate } };
  },
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    membership: { findFirst: vi.fn() },
    platformBilling: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("./plan-definitions", () => ({
  PLATFORM_PLANS: {
    free: {
      id: "free",
      name: "Free",
      description: "Free plan",
      monthlyPriceCents: 0,
      annualPriceCents: 0,
    },
    pro: {
      id: "pro",
      name: "Pro",
      description: "Pro plan",
      monthlyPriceCents: 2900,
      annualPriceCents: 29000,
      monthlyPriceId: "price_pro_monthly",
      annualPriceId: "price_pro_annual",
    },
    enterprise: {
      id: "enterprise",
      name: "Enterprise",
      description: "Enterprise plan",
      monthlyPriceCents: null,
      annualPriceCents: null,
      monthlyPriceId: "price_enterprise_monthly",
      annualPriceId: "price_enterprise_annual",
    },
  },
  getPlatformPriceId: vi.fn(() => "price_pro_monthly"),
}));

import process from "node:process";
import prisma from "@calcom/prisma";
import { PlatformBillingService } from "./PlatformBillingService";

const mockPrisma = prisma as unknown as {
  membership: { findFirst: ReturnType<typeof vi.fn> };
  platformBilling: {
    findUnique: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
};

function subscriptionEvent(
  type: "customer.subscription.created" | "customer.subscription.updated" | "customer.subscription.deleted",
  overrides: Partial<Stripe.Subscription> = {}
): Stripe.Event {
  return {
    id: `evt_${type}`,
    type,
    data: {
      object: {
        id: "sub_123",
        customer: "cus_123",
        metadata: { teamId: "10" },
        status: "active",
        current_period_start: 1_700_000_000,
        current_period_end: 1_800_000_000,
        items: { data: [{ price: { id: "price_pro_monthly" } }] },
        ...overrides,
      },
    },
  } as Stripe.Event;
}

function invoiceEvent(type: "invoice.payment_failed" | "invoice.payment_succeeded"): Stripe.Event {
  return {
    id: `evt_${type}`,
    type,
    data: { object: { id: "in_123", subscription: "sub_123" } },
  } as Stripe.Event;
}

describe("PlatformBillingService", () => {
  const service = new PlatformBillingService();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_PRIVATE_KEY = "sk_test_example";
    mockPrisma.membership.findFirst.mockResolvedValue({ teamId: 10, user: { trialEndsAt: null } });
  });

  it("returns public plan details with inherited features and without Stripe price IDs", async () => {
    const plans = await service.getPlans();
    const pro = plans.find((plan) => plan.id === "pro");

    expect(pro).toMatchObject({
      monthlyPriceCents: 2900,
      monthlyAvailable: true,
      annualAvailable: true,
    });
    expect(pro).not.toHaveProperty("monthlyPriceId");
    expect(pro?.features.map((feature) => feature.key)).toEqual(
      expect.arrayContaining(["booking-pages", "paid-bookings", "event-subscriptions"])
    );
  });

  it("gives organizations without a billing record only Free entitlements", async () => {
    mockPrisma.platformBilling.findUnique.mockResolvedValue(null);

    await expect(service.getEntitlements(10, 20)).resolves.toMatchObject({
      planId: "free",
      features: expect.not.arrayContaining([expect.objectContaining({ key: "paid-bookings" })]),
    });
  });

  it("allows registered Pro features and rejects them on Free", async () => {
    mockPrisma.platformBilling.findUnique.mockResolvedValueOnce({ plan: "pro" });
    await expect(
      service.assertFeatureAccess({ teamId: 10, userId: 20, feature: "paid-bookings" })
    ).resolves.toBeUndefined();

    mockPrisma.platformBilling.findUnique.mockResolvedValueOnce({ plan: "none" });
    await expect(
      service.assertFeatureAccess({ teamId: 10, userId: 20, feature: "paid-bookings" })
    ).rejects.toThrow("requires a CalBook Pro plan");
  });

  it("grants catalog-driven Pro entitlements during an active trial", async () => {
    mockPrisma.platformBilling.findUnique.mockResolvedValue(null);
    mockPrisma.membership.findFirst.mockResolvedValue({
      teamId: 10,
      user: { trialEndsAt: new Date("2099-01-01T00:00:00.000Z") },
    });

    await expect(service.getEntitlements(10, 20)).resolves.toMatchObject({
      planId: "pro",
      features: expect.arrayContaining([expect.objectContaining({ key: "paid-bookings" })]),
    });
  });

  it("uses a stable idempotency key for repeated checkout requests", async () => {
    mockPrisma.platformBilling.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ customerId: "cus_123" });
    stripeMocks.checkoutSessionsCreate.mockResolvedValue({ id: "cs_123", url: "https://checkout.test" });

    await expect(
      service.createCheckout({
        teamId: 10,
        userId: 20,
        email: "owner@example.com",
        planId: "pro",
        interval: "month",
        successUrl: "https://calbook.test/success",
        cancelUrl: "https://calbook.test/cancel",
      })
    ).resolves.toEqual({ sessionId: "cs_123", url: "https://checkout.test" });

    expect(stripeMocks.checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_123", mode: "subscription" }),
      { idempotencyKey: "platform-billing-checkout:10:pro:month" }
    );
  });

  it("rejects checkout when the organization already has a subscription", async () => {
    mockPrisma.platformBilling.findUnique.mockResolvedValue({ subscriptionId: "sub_existing" });

    await expect(
      service.createCheckout({
        teamId: 10,
        userId: 20,
        email: "owner@example.com",
        planId: "pro",
        interval: "month",
        successUrl: "https://calbook.test/success",
        cancelUrl: "https://calbook.test/cancel",
      })
    ).rejects.toThrow("Use the billing portal to change plans");
    expect(stripeMocks.checkoutSessionsCreate).not.toHaveBeenCalled();
  });

  it("synchronizes an active subscription onto the canonical billing record", async () => {
    await service.syncWebhook(subscriptionEvent("customer.subscription.updated"));

    expect(mockPrisma.platformBilling.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        update: expect.objectContaining({ plan: "pro", subscriptionId: "sub_123", overdue: false }),
      })
    );
  });

  it("marks failed invoices overdue and clears the flag after payment", async () => {
    await service.syncWebhook(invoiceEvent("invoice.payment_failed"));
    await service.syncWebhook(invoiceEvent("invoice.payment_succeeded"));

    expect(mockPrisma.platformBilling.updateMany).toHaveBeenNthCalledWith(1, {
      where: { subscriptionId: "sub_123" },
      data: { overdue: true },
    });
    expect(mockPrisma.platformBilling.updateMany).toHaveBeenNthCalledWith(2, {
      where: { subscriptionId: "sub_123" },
      data: { overdue: false },
    });
  });

  it("returns a deleted subscription to the free billing state", async () => {
    await service.syncWebhook(subscriptionEvent("customer.subscription.deleted", { status: "canceled" }));

    expect(mockPrisma.platformBilling.updateMany).toHaveBeenCalledWith({
      where: { OR: [{ id: 10 }, { subscriptionId: "sub_123" }] },
      data: {
        subscriptionId: null,
        priceId: null,
        plan: "none",
        billingCycleStart: null,
        billingCycleEnd: null,
        overdue: false,
      },
    });
  });

  it("clears a deleted subscription even when Stripe omits team metadata", async () => {
    await service.syncWebhook(
      subscriptionEvent("customer.subscription.deleted", { metadata: {}, status: "canceled" })
    );

    expect(mockPrisma.platformBilling.updateMany).toHaveBeenCalledWith({
      where: { subscriptionId: "sub_123" },
      data: {
        subscriptionId: null,
        priceId: null,
        plan: "none",
        billingCycleStart: null,
        billingCycleEnd: null,
        overdue: false,
      },
    });
  });

  it("replaying a subscription event updates the same team record", async () => {
    const event = subscriptionEvent("customer.subscription.updated");

    await service.syncWebhook(event);
    await service.syncWebhook(event);

    expect(mockPrisma.platformBilling.upsert).toHaveBeenCalledTimes(2);
    expect(mockPrisma.platformBilling.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { id: 10 } })
    );
  });
});
