import { sendWaitlistPromotionEmail } from "@calcom/emails/templates/waitlist-promotion-email";
import type { BookingWaitlist } from "@calcom/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WaitlistService } from "./WaitlistService";

vi.mock("@calcom/emails/templates/waitlist-promotion-email", () => ({
  sendWaitlistPromotionEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/lib/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
  return { ...actual, WEBSITE_URL: "https://calbook.ai" };
});

vi.mock("@calcom/prisma", () => ({
  default: {
    bookingWaitlist: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    eventType: {
      findUnique: vi.fn().mockResolvedValue({
        title: "Test Event",
        slug: "test-event",
        userId: 1,
        users: [{ username: "testuser", name: "Test User" }],
      }),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        bookingWaitlist: {
          findFirst: vi.fn(),
          update: vi.fn(),
        },
      })
    ),
  },
  prisma: {
    bookingWaitlist: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    eventType: {
      findUnique: vi.fn().mockResolvedValue({
        title: "Test Event",
        slug: "test-event",
        userId: 1,
        users: [{ username: "testuser", name: "Test User" }],
      }),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        bookingWaitlist: {
          findFirst: vi.fn(),
          update: vi.fn(),
        },
      })
    ),
  },
}));

import prisma from "@calcom/prisma";

const mockPrisma = prisma as unknown as {
  bookingWaitlist: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

function makeEntry(overrides: Partial<BookingWaitlist> = {}): BookingWaitlist {
  return {
    id: 1,
    eventTypeId: 10,
    slotTime: new Date("2026-09-01T10:00:00Z"),
    slotEndTime: new Date("2026-09-01T10:30:00Z"),
    tier: null,
    promotionToken: null,
    email: "booker@example.com",
    name: "Booker",
    phoneNumber: null,
    deduplicationKey: "dedupe-key",
    createdAt: new Date("2026-08-01"),
    notifiedAt: null,
    expiresAt: null,
    redemptionClaimToken: null,
    redemptionClaimExpiresAt: null,
    ...overrides,
  } as BookingWaitlist;
}

describe("WaitlistService", () => {
  let service: WaitlistService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendWaitlistPromotionEmail).mockReset().mockResolvedValue(undefined);
    service = new WaitlistService();
  });

  describe("addToWaitlist", () => {
    it("should create a new waitlist entry with slot end time and tier", async () => {
      const entry = makeEntry({ tier: "pro", slotEndTime: new Date("2026-09-01T10:30:00Z") });
      mockPrisma.bookingWaitlist.upsert.mockResolvedValue(entry);

      const result = await service.addToWaitlist({
        eventTypeId: 10,
        slotTime: new Date("2026-09-01T10:00:00Z"),
        slotEndTime: new Date("2026-09-01T10:30:00Z"),
        tier: "pro",
        email: "booker@example.com",
        name: "Booker",
      });

      expect(result).toEqual(entry);
      expect(mockPrisma.bookingWaitlist.upsert).toHaveBeenCalledWith({
        where: { deduplicationKey: expect.stringMatching(/^[a-f0-9]{64}$/) },
        create: expect.objectContaining({
          eventTypeId: 10,
          email: "booker@example.com",
          tier: "pro",
          slotEndTime: expect.any(Date),
          deduplicationKey: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
        update: {},
      });
    });

    it("should give concurrent duplicate joins the same database entry", async () => {
      const existing = makeEntry();
      mockPrisma.bookingWaitlist.upsert.mockResolvedValue(existing);

      const params = {
        eventTypeId: 10,
        slotTime: new Date("2026-09-01T10:00:00Z"),
        email: "Booker@Example.com",
      };
      const [first, second] = await Promise.all([
        service.addToWaitlist(params),
        service.addToWaitlist(params),
      ]);

      expect(first).toEqual(existing);
      expect(second).toEqual(existing);
      expect(mockPrisma.bookingWaitlist.upsert).toHaveBeenCalledTimes(2);
      const firstKey = mockPrisma.bookingWaitlist.upsert.mock.calls[0]?.[0].where.deduplicationKey;
      const secondKey = mockPrisma.bookingWaitlist.upsert.mock.calls[1]?.[0].where.deduplicationKey;
      expect(firstKey).toBe(secondKey);
      expect(mockPrisma.bookingWaitlist.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ email: "booker@example.com" }) })
      );
    });
  });

  describe("removeFromWaitlist", () => {
    it("should delete all entries for the email and slot", async () => {
      mockPrisma.bookingWaitlist.deleteMany.mockResolvedValue({ count: 1 });

      await service.removeFromWaitlist({
        eventTypeId: 10,
        slotTime: new Date("2026-09-01T10:00:00Z"),
        email: "booker@example.com",
      });

      expect(mockPrisma.bookingWaitlist.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventTypeId: 10,
            email: "booker@example.com",
          }),
        })
      );
    });
  });

  describe("promoteFromWaitlist", () => {
    it("should atomically promote the next person in line with a promotion token", async () => {
      const next = makeEntry({ id: 5, email: "next@example.com" });
      const promoted = makeEntry({
        id: 5,
        email: "next@example.com",
        notifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        promotionToken: "abc123",
      });

      const txBookingWaitlist = {
        findFirst: vi.fn().mockResolvedValue(next),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue(promoted),
      };
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ bookingWaitlist: txBookingWaitlist })
      );

      const result = await service.promoteFromWaitlist({
        eventTypeId: 10,
        slotTime: new Date("2026-09-01T10:00:00Z"),
      });

      expect(result).not.toBeNull();
      expect(result?.email).toBe("next@example.com");
      expect(result?.promotionToken).toBeTruthy();
      expect(txBookingWaitlist.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            notifiedAt: null,
            expiresAt: null,
          }),
          orderBy: { createdAt: "asc" },
        })
      );
      expect(txBookingWaitlist.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5, notifiedAt: null, expiresAt: null },
          data: expect.objectContaining({
            notifiedAt: expect.any(Date),
            expiresAt: expect.any(Date),
            promotionToken: expect.any(String),
          }),
        })
      );
    });

    it("should filter by tier when tier is provided", async () => {
      const txBookingWaitlist = {
        findFirst: vi.fn().mockResolvedValue(null),
        updateMany: vi.fn(),
        findUnique: vi.fn(),
      };
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ bookingWaitlist: txBookingWaitlist })
      );

      await service.promoteFromWaitlist({
        eventTypeId: 10,
        slotTime: new Date("2026-09-01T10:00:00Z"),
        tier: "pro",
      });

      expect(txBookingWaitlist.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tier: "pro",
          }),
        })
      );
    });

    it("should return null when another promotion claims the same entry", async () => {
      const next = makeEntry({ id: 5 });
      const txBookingWaitlist = {
        findFirst: vi.fn().mockResolvedValue(next),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUnique: vi.fn(),
      };
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ bookingWaitlist: txBookingWaitlist })
      );

      const result = await service.promoteFromWaitlist({
        eventTypeId: 10,
        slotTime: new Date("2026-09-01T10:00:00Z"),
      });

      expect(result).toBeNull();
      expect(txBookingWaitlist.findUnique).not.toHaveBeenCalled();
    });

    it("should return null when no one is on the waitlist", async () => {
      const txBookingWaitlist = {
        findFirst: vi.fn().mockResolvedValue(null),
        updateMany: vi.fn(),
        findUnique: vi.fn(),
      };
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ bookingWaitlist: txBookingWaitlist })
      );

      const result = await service.promoteFromWaitlist({
        eventTypeId: 10,
        slotTime: new Date("2026-09-01T10:00:00Z"),
      });

      expect(result).toBeNull();
      expect(txBookingWaitlist.updateMany).not.toHaveBeenCalled();
    });

    it("should retry a transient promotion email failure with the same invitation", async () => {
      const next = makeEntry({ id: 5 });
      const promoted = makeEntry({
        id: 5,
        notifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        promotionToken: "stable-promotion-token",
      });
      const txBookingWaitlist = {
        findFirst: vi.fn().mockResolvedValue(next),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue(promoted),
      };
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ bookingWaitlist: txBookingWaitlist })
      );
      vi.mocked(sendWaitlistPromotionEmail)
        .mockRejectedValueOnce(new Error("Temporary provider failure"))
        .mockResolvedValueOnce(undefined);

      await expect(
        service.promoteFromWaitlist({
          eventTypeId: 10,
          slotTime: new Date("2026-09-01T10:00:00Z"),
        })
      ).resolves.toEqual(promoted);

      expect(sendWaitlistPromotionEmail).toHaveBeenCalledTimes(2);
      expect(sendWaitlistPromotionEmail).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ bookingLink: expect.stringContaining("stable-promotion-token") })
      );
    });

    it("should preserve the claimed promotion when all email attempts fail", async () => {
      const next = makeEntry({ id: 5 });
      const promoted = makeEntry({
        id: 5,
        notifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        promotionToken: "retryable-promotion-token",
      });
      const txBookingWaitlist = {
        findFirst: vi.fn().mockResolvedValue(next),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue(promoted),
      };
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ bookingWaitlist: txBookingWaitlist })
      );
      vi.mocked(sendWaitlistPromotionEmail).mockRejectedValue(new Error("Provider unavailable"));

      await expect(
        service.promoteFromWaitlist({
          eventTypeId: 10,
          slotTime: new Date("2026-09-01T10:00:00Z"),
        })
      ).rejects.toThrow("Provider unavailable");

      expect(sendWaitlistPromotionEmail).toHaveBeenCalledTimes(3);
      expect(txBookingWaitlist.updateMany).toHaveBeenCalledOnce();
    });
  });

  describe("validatePromotionToken", () => {
    it("should return the entry for a valid, non-expired token", async () => {
      const entry = makeEntry({
        promotionToken: "valid-token",
        notifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      mockPrisma.bookingWaitlist.findUnique.mockResolvedValue(entry);

      const result = await service.validatePromotionToken("valid-token");
      expect(result).not.toBeNull();
      expect(result?.email).toBe("booker@example.com");
    });

    it("should return null for an expired token", async () => {
      const entry = makeEntry({
        promotionToken: "expired-token",
        notifiedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      });
      mockPrisma.bookingWaitlist.findUnique.mockResolvedValue(entry);

      const result = await service.validatePromotionToken("expired-token");
      expect(result).toBeNull();
    });

    it("should return null for a non-existent token", async () => {
      mockPrisma.bookingWaitlist.findUnique.mockResolvedValue(null);
      const result = await service.validatePromotionToken("nonexistent");
      expect(result).toBeNull();
    });

    it("should return null for an entry without notifiedAt", async () => {
      const entry = makeEntry({ promotionToken: "unnotified", notifiedAt: null, expiresAt: null });
      mockPrisma.bookingWaitlist.findUnique.mockResolvedValue(entry);
      const result = await service.validatePromotionToken("unnotified");
      expect(result).toBeNull();
    });
  });

  describe("claimPromotionToken", () => {
    const claimParams = {
      token: "promotion-token",
      eventTypeId: 10,
      email: "booker@example.com",
      slotTime: new Date("2026-09-01T10:00:00Z"),
      tier: undefined,
    };

    it("should atomically claim a valid promotion for the matching booking", async () => {
      const entry = makeEntry({
        promotionToken: claimParams.token,
        notifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        redemptionClaimToken: "claim-token",
      });
      mockPrisma.bookingWaitlist.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.bookingWaitlist.findUnique.mockResolvedValue(entry);

      const result = await service.claimPromotionToken(claimParams);

      expect(result?.entry).toEqual(entry);
      expect(result?.claimToken).toMatch(/^[a-f0-9]{64}$/);
      expect(mockPrisma.bookingWaitlist.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          promotionToken: claimParams.token,
          eventTypeId: 10,
          email: { equals: "booker@example.com", mode: "insensitive" },
          tier: null,
          expiresAt: { gt: expect.any(Date) },
          OR: [{ redemptionClaimToken: null }, { redemptionClaimExpiresAt: { lt: expect.any(Date) } }],
        }),
        data: {
          redemptionClaimToken: expect.any(String),
          redemptionClaimExpiresAt: expect.any(Date),
        },
      });
    });

    it("should allow only one concurrent request to claim a promotion", async () => {
      const entry = makeEntry({ promotionToken: claimParams.token, redemptionClaimToken: "winner" });
      mockPrisma.bookingWaitlist.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });
      mockPrisma.bookingWaitlist.findUnique.mockResolvedValue(entry);

      const [first, second] = await Promise.all([
        service.claimPromotionToken(claimParams),
        service.claimPromotionToken(claimParams),
      ]);

      expect(first).not.toBeNull();
      expect(second).toBeNull();
      expect(mockPrisma.bookingWaitlist.findUnique).toHaveBeenCalledTimes(1);
    });

    it("should reject an already claimed or consumed promotion", async () => {
      mockPrisma.bookingWaitlist.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.claimPromotionToken(claimParams)).resolves.toBeNull();
      expect(mockPrisma.bookingWaitlist.findUnique).not.toHaveBeenCalled();
    });

    it("should release only the request's own failed redemption claim", async () => {
      mockPrisma.bookingWaitlist.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.releasePromotionClaim("promotion-token", "claim-token")).resolves.toBe(true);
      expect(mockPrisma.bookingWaitlist.updateMany).toHaveBeenCalledWith({
        where: { promotionToken: "promotion-token", redemptionClaimToken: "claim-token" },
        data: { redemptionClaimToken: null, redemptionClaimExpiresAt: null },
      });
    });
  });

  describe("consumePromotionToken", () => {
    it("should consume only the request's own redemption claim", async () => {
      mockPrisma.bookingWaitlist.deleteMany.mockResolvedValue({ count: 1 });
      await expect(service.consumePromotionToken("some-token", "claim-token")).resolves.toBe(true);
      expect(mockPrisma.bookingWaitlist.deleteMany).toHaveBeenCalledWith({
        where: { promotionToken: "some-token", redemptionClaimToken: "claim-token" },
      });
    });

    it("should reject reuse after the promotion row has already been consumed", async () => {
      mockPrisma.bookingWaitlist.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.consumePromotionToken("some-token", "used-claim")).resolves.toBe(false);
    });
  });

  describe("getWaitlistForSlot", () => {
    it("should return active waitlist entries for a slot", async () => {
      const entries = [makeEntry({ id: 1 }), makeEntry({ id: 2, email: "second@example.com" })];
      mockPrisma.bookingWaitlist.findMany.mockResolvedValue(entries);

      const result = await service.getWaitlistForSlot({
        eventTypeId: 10,
        slotTime: new Date("2026-09-01T10:00:00Z"),
      });

      expect(result).toEqual(entries);
      expect(mockPrisma.bookingWaitlist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventTypeId: 10,
            expiresAt: null,
          }),
          orderBy: { createdAt: "asc" },
        })
      );
    });
  });

  describe("recoverExpiredPromotions", () => {
    const expiredEntry = {
      id: 1,
      eventTypeId: 10,
      slotTime: new Date("2026-09-01T10:00:00Z"),
      tier: "pro",
    };

    it("should atomically replace an expired invitation with the next matching person", async () => {
      const next = makeEntry({ id: 2, tier: "pro", email: "next@example.com" });
      const promoted = makeEntry({
        id: 2,
        tier: "pro",
        email: "next@example.com",
        notifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        promotionToken: "replacement-token",
      });
      mockPrisma.bookingWaitlist.findMany.mockResolvedValue([expiredEntry]);
      const txBookingWaitlist = {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        findFirst: vi.fn().mockResolvedValue(next),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue(promoted),
      };
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ bookingWaitlist: txBookingWaitlist })
      );

      await expect(service.recoverExpiredPromotions()).resolves.toEqual({
        expired: 1,
        promoted: 1,
        failed: 0,
      });
      expect(mockPrisma.bookingWaitlist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expiresAt: { lt: expect.any(Date) },
            OR: [{ redemptionClaimToken: null }, { redemptionClaimExpiresAt: { lt: expect.any(Date) } }],
          }),
          take: 100,
        })
      );
      expect(txBookingWaitlist.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tier: "pro", notifiedAt: null, expiresAt: null }),
        })
      );
      expect(sendWaitlistPromotionEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "next@example.com",
          bookingLink: expect.stringContaining("replacement-token"),
        })
      );
    });

    it("should let only one concurrent recovery claim an expired invitation", async () => {
      mockPrisma.bookingWaitlist.findMany.mockResolvedValue([expiredEntry]);
      const deleteMany = vi.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
      const findFirst = vi.fn().mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ bookingWaitlist: { deleteMany, findFirst, updateMany: vi.fn(), findUnique: vi.fn() } })
      );

      const results = await Promise.all([
        service.recoverExpiredPromotions(),
        service.recoverExpiredPromotions(),
      ]);

      expect(results).toEqual([
        { expired: 1, promoted: 0, failed: 0 },
        { expired: 0, promoted: 0, failed: 0 },
      ]);
      expect(findFirst).toHaveBeenCalledOnce();
    });

    it("should keep an active redemption claim out of the recovery batch", async () => {
      mockPrisma.bookingWaitlist.findMany.mockResolvedValue([]);

      await expect(service.recoverExpiredPromotions(500)).resolves.toEqual({
        expired: 0,
        promoted: 0,
        failed: 0,
      });
      expect(mockPrisma.bookingWaitlist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ redemptionClaimToken: null }, { redemptionClaimExpiresAt: { lt: expect.any(Date) } }],
          }),
          take: 100,
        })
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
