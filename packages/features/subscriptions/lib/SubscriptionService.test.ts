import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const stripeMocks = vi.hoisted(() => ({
  productsCreate: vi.fn(),
  pricesCreate: vi.fn(),
  checkoutSessionsCreate: vi.fn(),
  checkoutSessionsRetrieve: vi.fn(),
  subscriptionsRetrieve: vi.fn(),
  portalSessionsCreate: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class StripeMock {
    products = { create: stripeMocks.productsCreate };
    prices = { create: stripeMocks.pricesCreate };
    checkout = {
      sessions: {
        create: stripeMocks.checkoutSessionsCreate,
        retrieve: stripeMocks.checkoutSessionsRetrieve,
      },
    };
    subscriptions = { retrieve: stripeMocks.subscriptionsRetrieve };
    billingPortal = { sessions: { create: stripeMocks.portalSessionsCreate } };
  },
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    eventSubscription: { findFirst: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
    eventType: { findUnique: vi.fn(), update: vi.fn() },
    credential: { findFirst: vi.fn() },
  },
}));

import process from "node:process";
import prisma from "@calcom/prisma";
import { SubscriptionService } from "./SubscriptionService";

const mockPrisma = prisma as unknown as {
  eventSubscription: {
    findFirst: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
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

    it("uses the platform Stripe account when no Connect credential exists", async () => {
      mockPrisma.eventType.findUnique.mockResolvedValue({
        id: 10,
        title: "Subscriber Session",
        userId: 20,
        teamId: null,
        requiresSubscription: false,
        stripeSubscriptionPriceId: null,
      });
      mockPrisma.credential.findFirst.mockResolvedValue(null);
      stripeMocks.productsCreate.mockResolvedValue({ id: "prod_platform" });
      stripeMocks.pricesCreate.mockResolvedValue({ id: "price_platform" });
      mockPrisma.eventType.update.mockResolvedValue({ id: 10 });

      await service.createEventTypePrice({
        eventTypeId: 10,
        amount: 2500,
        currency: "usd",
        interval: "month",
      });

      expect(stripeMocks.productsCreate).toHaveBeenCalledWith(
        { name: "Subscriber Session", metadata: { eventTypeId: "10" } },
        undefined
      );
      expect(stripeMocks.pricesCreate).toHaveBeenCalledWith(expect.any(Object), undefined);
    });
  });

  describe("createCheckoutSession", () => {
    it("creates checkout on the organizer connected account", async () => {
      mockPrisma.eventType.findUnique.mockResolvedValue({
        id: 10,
        title: "Subscriber Session",
        userId: 20,
        teamId: null,
        requiresSubscription: true,
        stripeSubscriptionPriceId: "price_123",
      });
      mockPrisma.credential.findFirst.mockResolvedValue({ key: { stripe_user_id: "acct_123" } });
      stripeMocks.checkoutSessionsCreate.mockResolvedValue({ id: "cs_123", url: "https://checkout.test" });

      await expect(
        service.createCheckoutSession({
          eventTypeId: 10,
          email: "booker@example.com",
          userId: 20,
          successUrl: "https://calbook.test/success",
          cancelUrl: "https://calbook.test/cancel",
        })
      ).resolves.toEqual({ url: "https://checkout.test" });

      expect(stripeMocks.checkoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          customer_email: "booker@example.com",
          line_items: [{ price: "price_123", quantity: 1 }],
        }),
        { stripeAccount: "acct_123" }
      );
    });
  });

  describe("syncCheckoutSession", () => {
    it("activates checkout without requiring a webhook", async () => {
      mockPrisma.eventType.findUnique.mockResolvedValue({
        id: 10,
        title: "Subscriber Session",
        userId: 20,
        teamId: null,
        requiresSubscription: true,
        stripeSubscriptionPriceId: "price_123",
      });
      mockPrisma.credential.findFirst.mockResolvedValue(null);
      stripeMocks.checkoutSessionsRetrieve.mockResolvedValue({
        id: "cs_123",
        payment_status: "paid",
        customer: "cus_123",
        subscription: "sub_123",
        metadata: { eventTypeId: "10", email: "booker@example.com", userId: "20" },
      });
      stripeMocks.subscriptionsRetrieve.mockResolvedValue({
        id: "sub_123",
        status: "active",
        customer: "cus_123",
        metadata: { eventTypeId: "10", email: "booker@example.com", userId: "20" },
        items: { data: [{ id: "si_123" }] },
        current_period_start: 1_700_000_000,
        current_period_end: 1_900_000_000,
        cancel_at: null,
        canceled_at: null,
      });
      mockPrisma.eventSubscription.findFirst.mockResolvedValue({
        id: 1,
        currentPeriodEnd: new Date("2030-01-01T00:00:00.000Z"),
      });

      await expect(
        service.syncCheckoutSession({
          eventTypeId: 10,
          userId: 20,
          email: "booker@example.com",
          sessionId: "cs_123",
        })
      ).resolves.toEqual({ hasActiveSubscription: true });

      expect(stripeMocks.checkoutSessionsRetrieve).toHaveBeenCalledWith("cs_123", {}, undefined);
      expect(stripeMocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_123", {}, undefined);
      expect(mockPrisma.eventSubscription.upsert).toHaveBeenCalledTimes(2);
    });

    it("rejects checkout sessions belonging to another user", async () => {
      mockPrisma.eventType.findUnique.mockResolvedValue({
        id: 10,
        title: "Subscriber Session",
        userId: 20,
        teamId: null,
        requiresSubscription: true,
        stripeSubscriptionPriceId: "price_123",
      });
      mockPrisma.credential.findFirst.mockResolvedValue(null);
      stripeMocks.checkoutSessionsRetrieve.mockResolvedValue({
        id: "cs_other",
        payment_status: "paid",
        subscription: "sub_123",
        metadata: { eventTypeId: "10", email: "other@example.com", userId: "99" },
      });

      await expect(
        service.syncCheckoutSession({
          eventTypeId: 10,
          userId: 20,
          email: "booker@example.com",
          sessionId: "cs_other",
        })
      ).rejects.toThrow("Checkout session does not belong to this subscription");
      expect(mockPrisma.eventSubscription.upsert).not.toHaveBeenCalled();
    });
  });

  describe("createPortalSession", () => {
    it("creates the portal session on the organizer connected account", async () => {
      mockPrisma.eventType.findUnique.mockResolvedValue({
        id: 10,
        title: "Subscriber Session",
        userId: 20,
        teamId: null,
        requiresSubscription: true,
        stripeSubscriptionPriceId: "price_123",
      });
      mockPrisma.credential.findFirst.mockResolvedValue({ key: { stripe_user_id: "acct_123" } });
      mockPrisma.eventSubscription.findFirst.mockResolvedValue({ stripeCustomerId: "cus_123" });
      stripeMocks.portalSessionsCreate.mockResolvedValue({ url: "https://portal.test" });

      await expect(
        service.createPortalSession({
          eventTypeId: 10,
          email: "booker@example.com",
          returnUrl: "https://calbook.test/event",
        })
      ).resolves.toEqual({ url: "https://portal.test" });
      expect(stripeMocks.portalSessionsCreate).toHaveBeenCalledWith(
        { customer: "cus_123", return_url: "https://calbook.test/event" },
        { stripeAccount: "acct_123" }
      );
    });
  });

  describe("handleStripeWebhook", () => {
    it("upserts the same subscription key when Stripe replays checkout completion", async () => {
      const event = {
        id: "evt_123",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            payment_status: "paid",
            customer: "cus_123",
            subscription: "sub_123",
            metadata: { eventTypeId: "10", email: "booker@example.com", userId: "20" },
          },
        },
      } as Stripe.Event;

      await service.handleStripeWebhook(event);
      await service.handleStripeWebhook(event);

      expect(mockPrisma.eventSubscription.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.eventSubscription.upsert).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ where: { stripeSubscriptionId: "sub_123" } })
      );
    });

    it("does not activate an unpaid checkout", async () => {
      const event = {
        id: "evt_unpaid",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_unpaid",
            payment_status: "unpaid",
            customer: "cus_123",
            subscription: "sub_123",
            metadata: { eventTypeId: "10", email: "booker@example.com", userId: "20" },
          },
        },
      } as Stripe.Event;

      await service.handleStripeWebhook(event);

      expect(mockPrisma.eventSubscription.upsert).not.toHaveBeenCalled();
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
        where: { eventTypeId: 10, status: "active", OR: [{ userId: 20 }] },
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

    it("returns false when currentPeriodEnd is null (fail closed)", async () => {
      mockPrisma.eventSubscription.findFirst.mockResolvedValue({
        id: 1,
        currentPeriodEnd: null,
      });

      await expect(service.checkEntitlement({ eventTypeId: 10, userId: 20 })).resolves.toBe(false);
    });

    it("returns false when no active subscription exists", async () => {
      mockPrisma.eventSubscription.findFirst.mockResolvedValue(null);

      await expect(service.checkEntitlement({ eventTypeId: 10, userId: 20 })).resolves.toBe(false);
    });

    it("returns false when neither userId nor email is provided", async () => {
      await expect(service.checkEntitlement({ eventTypeId: 10 })).resolves.toBe(false);
      expect(mockPrisma.eventSubscription.findFirst).not.toHaveBeenCalled();
    });

    it("uses OR logic when both userId and email are provided", async () => {
      mockPrisma.eventSubscription.findFirst.mockResolvedValue(null);

      await service.checkEntitlement({ eventTypeId: 10, userId: 20, email: "booker@example.com" });

      expect(mockPrisma.eventSubscription.findFirst).toHaveBeenCalledWith({
        where: {
          eventTypeId: 10,
          status: "active",
          OR: [{ userId: 20 }, { email: "booker@example.com" }],
        },
        select: { id: true, currentPeriodEnd: true },
      });
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
