import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => ({
  default: {
    eventSubscription: { findFirst: vi.fn() },
    eventType: { findUnique: vi.fn() },
  },
}));

import prisma from "@calcom/prisma";
import { SubscriptionService } from "./SubscriptionService";

const mockPrisma = prisma as unknown as {
  eventSubscription: { findFirst: ReturnType<typeof vi.fn> };
  eventType: { findUnique: ReturnType<typeof vi.fn> };
};

describe("SubscriptionService", () => {
  const service = new SubscriptionService();

  beforeEach(() => {
    vi.clearAllMocks();
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
