import type { BookingWaitlist } from "@calcom/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WaitlistService } from "./WaitlistService";

vi.mock("@calcom/prisma", () => ({
  default: {
    bookingWaitlist: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
  prisma: {
    bookingWaitlist: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import prisma from "@calcom/prisma";

const mockPrisma = prisma as unknown as {
  bookingWaitlist: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
};

function makeEntry(overrides: Partial<BookingWaitlist> = {}): BookingWaitlist {
  return {
    id: 1,
    eventTypeId: 10,
    slotTime: new Date("2026-09-01T10:00:00Z"),
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
    it("should create a new waitlist entry", async () => {
      const entry = makeEntry();
      mockPrisma.bookingWaitlist.findFirst.mockResolvedValue(null);
      mockPrisma.bookingWaitlist.create.mockResolvedValue(entry);

      const result = await service.addToWaitlist({
        eventTypeId: 10,
        slotTime: new Date("2026-09-01T10:00:00Z"),
        email: "booker@example.com",
        name: "Booker",
      });

      expect(result).toEqual(entry);
      expect(mockPrisma.bookingWaitlist.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventTypeId: 10,
          email: "booker@example.com",
          name: "Booker",
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
    it("should promote the next person in line (oldest unnotified)", async () => {
      const next = makeEntry({ id: 5, email: "next@example.com" });
      mockPrisma.bookingWaitlist.findFirst.mockResolvedValue(next);
      mockPrisma.bookingWaitlist.update.mockResolvedValue(
        makeEntry({ id: 5, email: "next@example.com", notifiedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60 * 1000) })
      );

      const result = await service.promoteFromWaitlist({
        eventTypeId: 10,
        slotTime: new Date("2026-09-01T10:00:00Z"),
      });

      expect(result).not.toBeNull();
      expect(result?.email).toBe("next@example.com");
      expect(mockPrisma.bookingWaitlist.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            notifiedAt: null,
            expiresAt: null,
          }),
          orderBy: { createdAt: "asc" },
        })
      );
      expect(mockPrisma.bookingWaitlist.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: expect.objectContaining({
            notifiedAt: expect.any(Date),
            expiresAt: expect.any(Date),
          }),
        })
      );
    });

    it("should return null when no one is on the waitlist", async () => {
      mockPrisma.bookingWaitlist.findFirst.mockResolvedValue(null);

      const result = await service.promoteFromWaitlist({
        eventTypeId: 10,
        slotTime: new Date("2026-09-01T10:00:00Z"),
      });

      expect(result).toBeNull();
      expect(mockPrisma.bookingWaitlist.update).not.toHaveBeenCalled();
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
      expect(mockPrisma.bookingWaitlist.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expiresAt: { lt: expect.any(Date) },
          }),
        })
      );
    });

    it("should return 0 when no expired entries exist", async () => {
      mockPrisma.bookingWaitlist.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.expireOldNotifications();

      expect(result).toBe(0);
    });
  });
});
