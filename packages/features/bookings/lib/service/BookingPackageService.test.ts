import type { BookingPackage } from "@calcom/prisma/client";
import { BookingPackageStatus } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingPackageService } from "./BookingPackageService";

vi.mock("@calcom/prisma", () => ({
  default: {
    bookingPackage: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      fields: { totalSessions: "totalSessions" },
    },
    $transaction: vi.fn(),
  },
  prisma: {
    bookingPackage: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      fields: { totalSessions: "totalSessions" },
    },
    $transaction: vi.fn(),
  },
}));

import prisma from "@calcom/prisma";

const mockPrisma = prisma as unknown as {
  bookingPackage: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    fields: { totalSessions: string };
  };
  $transaction: ReturnType<typeof vi.fn>;
};

function makePackage(overrides: Partial<BookingPackage> = {}): BookingPackage {
  return {
    id: 1,
    uid: "pkg-uid-1",
    organizerId: 100,
    attendeeEmail: "booker@example.com",
    attendeeName: "Booker",
    eventTypeId: 10,
    stripePaymentId: null,
    totalSessions: 5,
    usedSessions: 0,
    pricePerSession: 10000,
    currency: "usd",
    status: BookingPackageStatus.ACTIVE,
    expiresAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  } as BookingPackage;
}

describe("BookingPackageService", () => {
  let service: BookingPackageService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BookingPackageService();
  });

  describe("createPackage", () => {
    it("should create a package with ACTIVE status", async () => {
      const pkg = makePackage();
      mockPrisma.bookingPackage.create.mockResolvedValue(pkg);

      const result = await service.createPackage({
        organizerId: 100,
        attendeeEmail: "booker@example.com",
        attendeeName: "Booker",
        eventTypeId: 10,
        totalSessions: 5,
        pricePerSession: 10000,
        currency: "usd",
      });

      expect(result).toEqual(pkg);
      expect(mockPrisma.bookingPackage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizerId: 100,
          attendeeEmail: "booker@example.com",
          eventTypeId: 10,
          totalSessions: 5,
          usedSessions: 0,
          status: "ACTIVE",
        }),
      });
    });

    it("should throw when totalSessions is 0", async () => {
      await expect(
        service.createPackage({
          organizerId: 100,
          attendeeEmail: "booker@example.com",
          eventTypeId: 10,
          totalSessions: 0,
          pricePerSession: 10000,
          currency: "usd",
        })
      ).rejects.toThrow("Total sessions must be greater than 0");
    });

    it("should throw when pricePerSession is negative", async () => {
      await expect(
        service.createPackage({
          organizerId: 100,
          attendeeEmail: "booker@example.com",
          eventTypeId: 10,
          totalSessions: 5,
          pricePerSession: -1,
          currency: "usd",
        })
      ).rejects.toThrow("Price per session cannot be negative");
    });
  });

  describe("findActivePackage", () => {
    it("should find an active package with remaining sessions", async () => {
      const pkg = makePackage({ usedSessions: 2, totalSessions: 5 });
      mockPrisma.bookingPackage.findFirst.mockResolvedValue(pkg);

      const result = await service.findActivePackage({
        organizerId: 100,
        attendeeEmail: "booker@example.com",
        eventTypeId: 10,
      });

      expect(result).toEqual(pkg);
      expect(mockPrisma.bookingPackage.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizerId: 100,
            attendeeEmail: "booker@example.com",
            eventTypeId: 10,
            status: "ACTIVE",
          }),
        })
      );
    });

    it("should return null when no active package exists", async () => {
      mockPrisma.bookingPackage.findFirst.mockResolvedValue(null);

      const result = await service.findActivePackage({
        organizerId: 100,
        attendeeEmail: "booker@example.com",
        eventTypeId: 10,
      });

      expect(result).toBeNull();
    });
  });

  describe("redeemSession", () => {
    it("should increment usedSessions and connect booking", async () => {
      const updatedPkg = makePackage({ usedSessions: 2, totalSessions: 5 });

      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => {
        return cb(mockPrisma);
      });
      mockPrisma.bookingPackage.findUnique.mockResolvedValue({
        id: 1,
        totalSessions: 5,
        usedSessions: 1,
        status: BookingPackageStatus.ACTIVE,
        expiresAt: null,
      });
      mockPrisma.bookingPackage.update.mockResolvedValue(updatedPkg);

      const result = await service.redeemSession({ packageId: 1, bookingId: 50 });

      expect(result).toEqual(updatedPkg);
      expect(mockPrisma.bookingPackage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            usedSessions: { increment: 1 },
            bookings: { connect: { id: 50 } },
          }),
        })
      );
    });

    it("should mark package as EXPIRED when last session is redeemed", async () => {
      const exhaustedPkg = makePackage({
        usedSessions: 5,
        totalSessions: 5,
        status: BookingPackageStatus.EXPIRED,
      });

      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => {
        return cb(mockPrisma);
      });
      mockPrisma.bookingPackage.findUnique.mockResolvedValue({
        id: 1,
        totalSessions: 5,
        usedSessions: 4,
        status: BookingPackageStatus.ACTIVE,
        expiresAt: null,
      });
      mockPrisma.bookingPackage.update
        .mockResolvedValueOnce(makePackage({ usedSessions: 5, totalSessions: 5 }))
        .mockResolvedValueOnce(exhaustedPkg);

      const result = await service.redeemSession({ packageId: 1, bookingId: 50 });

      expect(result).toEqual(exhaustedPkg);
      expect(mockPrisma.bookingPackage.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { status: "EXPIRED" },
        })
      );
    });

    it("should return null when package has no remaining sessions", async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => {
        return cb(mockPrisma);
      });
      mockPrisma.bookingPackage.findUnique.mockResolvedValue({
        id: 1,
        totalSessions: 5,
        usedSessions: 5,
        status: BookingPackageStatus.ACTIVE,
        expiresAt: null,
      });

      const result = await service.redeemSession({ packageId: 1, bookingId: 50 });

      expect(result).toBeNull();
    });

    it("should throw when package is not found", async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => {
        return cb(mockPrisma);
      });
      mockPrisma.bookingPackage.findUnique.mockResolvedValue(null);

      await expect(service.redeemSession({ packageId: 999, bookingId: 50 })).rejects.toThrow(
        "Booking package 999 not found"
      );
    });

    it("should throw when package is not ACTIVE", async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => {
        return cb(mockPrisma);
      });
      mockPrisma.bookingPackage.findUnique.mockResolvedValue({
        id: 1,
        totalSessions: 5,
        usedSessions: 2,
        status: BookingPackageStatus.CANCELLED,
        expiresAt: null,
      });

      await expect(service.redeemSession({ packageId: 1, bookingId: 50 })).rejects.toThrow(
        "Booking package 1 is not active"
      );
    });
  });

  describe("releaseSession", () => {
    it("should decrement usedSessions and disconnect booking", async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => {
        return cb(mockPrisma);
      });
      mockPrisma.bookingPackage.findUnique.mockResolvedValue({
        id: 1,
        usedSessions: 3,
        status: BookingPackageStatus.ACTIVE,
      });
      mockPrisma.bookingPackage.update.mockResolvedValue(makePackage({ usedSessions: 2 }));

      const result = await service.releaseSession({ packageId: 1, bookingId: 50 });

      expect(result).not.toBeNull();
      expect(mockPrisma.bookingPackage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            usedSessions: { decrement: 1 },
            bookings: { disconnect: { id: 50 } },
          }),
        })
      );
    });

    it("should return null when package is not found", async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => {
        return cb(mockPrisma);
      });
      mockPrisma.bookingPackage.findUnique.mockResolvedValue(null);

      const result = await service.releaseSession({ packageId: 999, bookingId: 50 });

      expect(result).toBeNull();
    });

    it("should return null when usedSessions is already 0", async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => {
        return cb(mockPrisma);
      });
      mockPrisma.bookingPackage.findUnique.mockResolvedValue({
        id: 1,
        usedSessions: 0,
        status: BookingPackageStatus.ACTIVE,
      });

      const result = await service.releaseSession({ packageId: 1, bookingId: 50 });

      expect(result).toBeNull();
    });
  });

  describe("cancelPackage", () => {
    it("should cancel a package owned by the organizer", async () => {
      const pkg = makePackage({ status: BookingPackageStatus.ACTIVE });
      const cancelled = makePackage({ status: BookingPackageStatus.CANCELLED });
      mockPrisma.bookingPackage.findFirst.mockResolvedValue(pkg);
      mockPrisma.bookingPackage.update.mockResolvedValue(cancelled);

      const result = await service.cancelPackage(1, 100);

      expect(result).toEqual(cancelled);
      expect(mockPrisma.bookingPackage.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: "CANCELLED" },
      });
    });

    it("should return null when package is not found or not owned by organizer", async () => {
      mockPrisma.bookingPackage.findFirst.mockResolvedValue(null);

      const result = await service.cancelPackage(999, 100);

      expect(result).toBeNull();
      expect(mockPrisma.bookingPackage.update).not.toHaveBeenCalled();
    });
  });

  describe("listPackages", () => {
    it("should list packages for an organizer", async () => {
      const packages = [makePackage(), makePackage({ id: 2, uid: "pkg-uid-2" })];
      mockPrisma.bookingPackage.findMany.mockResolvedValue(packages);

      const result = await service.listPackages({ organizerId: 100 });

      expect(result).toEqual(packages);
      expect(mockPrisma.bookingPackage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizerId: 100 },
        })
      );
    });

    it("should filter by attendeeEmail when provided", async () => {
      mockPrisma.bookingPackage.findMany.mockResolvedValue([]);

      await service.listPackages({ organizerId: 100, attendeeEmail: "booker@example.com" });

      expect(mockPrisma.bookingPackage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizerId: 100,
            attendeeEmail: "booker@example.com",
          }),
        })
      );
    });

    it("should filter by status when provided", async () => {
      mockPrisma.bookingPackage.findMany.mockResolvedValue([]);

      await service.listPackages({ organizerId: 100, status: BookingPackageStatus.ACTIVE });

      expect(mockPrisma.bookingPackage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizerId: 100,
            status: BookingPackageStatus.ACTIVE,
          }),
        })
      );
    });
  });
});
