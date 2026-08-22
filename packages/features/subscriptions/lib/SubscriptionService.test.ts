import { beforeEach, describe, expect, it, vi } from "vitest";

const stripeMocks = vi.hoisted(() => ({
  productsCreate: vi.fn(),
  pricesCreate: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class StripeMock {
    products = { create: stripeMocks.productsCreate };
    prices = { create: stripeMocks.pricesCreate };
  },
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    eventSubscription: { findFirst: vi.fn() },
    eventType: { findUnique: vi.fn(), update: vi.fn() },
    credential: { findFirst: vi.fn() },
  },
}));

import process from "node:process";
import prisma from "@calcom/prisma";
import { SubscriptionService } from "./SubscriptionService";

const mockPrisma = prisma as unknown as {
  eventSubscription: { findFirst: ReturnType<typeof vi.fn> };
  eventType: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  credential: { findFirst: ReturnType<typeof vi.fn> };
};

describe("SubscriptionService", () => {
  const service = new SubscriptionService();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_PRIVATE_KEY = "sk_test_example";
  });

  describe("createEventTypePrice", () => {
    it("creates the product and price on the organizer Stripe account", async () => {
      mockPrisma.eventType.findUnique.mockResolvedValue({
        id: 10,
        title: "Subscriber Session",
        userId: 20,
        teamId: null,
        requiresSubscription: false,
        stripeSubscriptionPriceId: null,
      });
      mockPrisma.credential.findFirst.mockResolvedValue({ key: { stripe_user_id: "acct_123" } });
      stripeMocks.productsCreate.mockResolvedValue({ id: "prod_123" });
      stripeMocks.pricesCreate.mockResolvedValue({ id: "price_123" });
      mockPrisma.eventType.update.mockResolvedValue({ id: 10 });

      await expect(
        service.createEventTypePrice({ eventTypeId: 10, amount: 2500, currency: "usd", interval: "month" })
      ).resolves.toEqual({ priceId: "price_123" });

      expect(stripeMocks.productsCreate).toHaveBeenCalledWith(
        { name: "Subscriber Session", metadata: { eventTypeId: "10" } },
        { stripeAccount: "acct_123" }
      );
      expect(stripeMocks.pricesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ product: "prod_123", unit_amount: 2500, currency: "usd" }),
        { stripeAccount: "acct_123" }
      );
      expect(mockPrisma.eventType.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { stripeSubscriptionPriceId: "price_123" },
        select: { id: true },
      });
    });
  });

  describe("checkEntitlement", () => {
    it("returns true for an active subscription inside its billing period", async () => {
      mockPrisma.eventSubscription.findFirst.mockResolvedValue({
        id: 1,
        currentPeriodEnd: new Date(Date.now() + 60_000),
      });

      await expect(service.checkEntitlement({ eventTypeId: 10, userId: 20 })).resolves.toBe(true);
      expect(mockPrisma.eventSubscription.findFirst).toHaveBeenCalledWith({
        where: { eventTypeId: 10, status: "active", userId: 20 },
        select: { id: true, currentPeriodEnd: true },
      });
    });

    it("returns false when the billing period has ended", async () => {
      mockPrisma.eventSubscription.findFirst.mockResolvedValue({
        id: 1,
        currentPeriodEnd: new Date(Date.now() - 60_000),
      });

      await expect(service.checkEntitlement({ eventTypeId: 10, userId: 20 })).resolves.toBe(false);
    });

    it("returns false when no active subscription exists", async () => {
      mockPrisma.eventSubscription.findFirst.mockResolvedValue(null);

      await expect(service.checkEntitlement({ eventTypeId: 10, userId: 20 })).resolves.toBe(false);
    });
  });

  describe("getBookingWindow", () => {
    const subscriptionConfig = {
      subscriberBookingWindowDays: 30,
      nonSubscriberBookingWindowDays: 7,
    };

    it("uses the subscriber booking window for entitled bookers", () => {
      expect(service.getBookingWindow({ subscriptionConfig, hasActiveSubscription: true })).toEqual({
        bookingWindowDays: 30,
      });
    });

    it("uses the non-subscriber booking window for other bookers", () => {
      expect(service.getBookingWindow({ subscriptionConfig, hasActiveSubscription: false })).toEqual({
        bookingWindowDays: 7,
      });
    });

    it("uses the default window for malformed configuration", () => {
      expect(
        service.getBookingWindow({
          subscriptionConfig: { subscriberBookingWindowDays: 2, nonSubscriberBookingWindowDays: 7 },
          hasActiveSubscription: true,
        })
      ).toEqual({ bookingWindowDays: 30 });
    });
  });
});
