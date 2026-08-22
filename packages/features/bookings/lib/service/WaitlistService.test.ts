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
      update: vi.fn(),
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
      update: vi.fn(),
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
    update: ReturnType<typeof vi.fn>;
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
    createdAt: new Date("2026-08-01"),
    notifiedAt: null,
    expiresAt: null,
    ...overrides,
  } as BookingWaitlist;
}

describe("WaitlistService", () => {
  let service: WaitlistService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WaitlistService();
  });

  describe("addToWaitlist", () => {
    it("should create a new waitlist entry with slot end time and tier", async () => {
      const entry = makeEntry({ tier: "pro", slotEndTime: new Date("2026-09-01T10:30:00Z") });
      mockPrisma.bookingWaitlist.findFirst.mockResolvedValue(null);
      mockPrisma.bookingWaitlist.create.mockResolvedValue(entry);

      const result = await service.addToWaitlist({
        eventTypeId: 10,
        slotTime: new Date("2026-09-01T10:00:00Z"),
        slotEndTime: new Date("2026-09-01T10:30:00Z"),
        tier: "pro",
        email: "booker@example.com",
        name: "Booker",
      });

      expect(result).toEqual(entry);
      expect(mockPrisma.bookingWaitlist.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventTypeId: 10,
          email: "booker@example.com",
          tier: "pro",
          slotEndTime: expect.any(Date),
        }),
      });
    });

    it("should return existing entry if already on waitlist (deduplication)", async () => {
      const existing = makeEntry();
      mockPrisma.bookingWaitlist.findFirst.mockResolvedValue(existing);

      const result = await service.addToWaitlist({
        eventTypeId: 10,
        slotTime: new Date("2026-09-01T10:00:00Z"),
        email: "booker@example.com",
      });

      expect(result).toEqual(existing);
      expect(mockPrisma.bookingWaitlist.create).not.toHaveBeenCalled();
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

  describe("consumePromotionToken", () => {
    it("should delete the entry with the given token", async () => {
      mockPrisma.bookingWaitlist.deleteMany.mockResolvedValue({ count: 1 });
      await service.consumePromotionToken("some-token");
      expect(mockPrisma.bookingWaitlist.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { promotionToken: "some-token" },
        })
      );
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

  describe("expireOldNotifications", () => {
    it("should delete entries with past expiry dates", async () => {
      mockPrisma.bookingWaitlist.deleteMany.mockResolvedValue({ count: 5 });
      const result = await service.expireOldNotifications();
      expect(result).toBe(5);
    });

    it("should return 0 when no expired entries exist", async () => {
      mockPrisma.bookingWaitlist.deleteMany.mockResolvedValue({ count: 0 });
      const result = await service.expireOldNotifications();
      expect(result).toBe(0);
    });
  });
});
