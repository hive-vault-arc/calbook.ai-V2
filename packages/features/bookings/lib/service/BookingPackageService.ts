import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { BookingPackage, BookingPackageStatus, Prisma } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["booking-package-service"] });

export class BookingPackageService {
  /**
   * Create a new booking package for an attendee.
   * The package allows N sessions to be booked against a single payment.
   */
  async createPackage(params: {
    organizerId: number;
    attendeeEmail: string;
    attendeeName?: string;
    eventTypeId: number;
    totalSessions: number;
    pricePerSession: number;
    currency: string;
    stripePaymentId?: string;
    expiresAt?: Date;
  }): Promise<BookingPackage> {
    if (params.totalSessions <= 0) {
      throw new Error("Total sessions must be greater than 0");
    }
    if (params.pricePerSession < 0) {
      throw new Error("Price per session cannot be negative");
    }

    return prisma.bookingPackage.create({
      data: {
        organizerId: params.organizerId,
        attendeeEmail: params.attendeeEmail,
        attendeeName: params.attendeeName,
        eventTypeId: params.eventTypeId,
        totalSessions: params.totalSessions,
        usedSessions: 0,
        pricePerSession: params.pricePerSession,
        currency: params.currency,
        stripePaymentId: params.stripePaymentId,
        expiresAt: params.expiresAt,
        status: "ACTIVE",
      },
    });
  }

  /**
   * Find an active package for a given attendee and event type.
   * Returns the package if there are remaining sessions and it hasn't expired.
   */
  async findActivePackage(params: {
    organizerId: number;
    attendeeEmail: string;
    eventTypeId: number;
  }): Promise<BookingPackage | null> {
    const now = new Date();
    return prisma.bookingPackage.findFirst({
      where: {
        organizerId: params.organizerId,
        attendeeEmail: params.attendeeEmail,
        eventTypeId: params.eventTypeId,
        status: "ACTIVE",
        usedSessions: { lt: prisma.bookingPackage.fields.totalSessions },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Redeem a session from a package by linking a booking to it
   * and incrementing the usedSessions counter.
   * Returns the updated package, or null if the package has no remaining sessions.
   */
  async redeemSession(params: { packageId: number; bookingId: number }): Promise<BookingPackage | null> {
    const result = await prisma.$transaction(async (tx) => {
      const pkg = await tx.bookingPackage.findUnique({
        where: { id: params.packageId },
        select: {
          id: true,
          totalSessions: true,
          usedSessions: true,
          status: true,
          expiresAt: true,
        },
      });

      if (!pkg) {
        throw new Error(`Booking package ${params.packageId} not found`);
      }

      if (pkg.status !== "ACTIVE") {
        throw new Error(`Booking package ${params.packageId} is not active`);
      }

      if (pkg.usedSessions >= pkg.totalSessions) {
        return null;
      }

      if (pkg.expiresAt && pkg.expiresAt < new Date()) {
        await tx.bookingPackage.update({
          where: { id: pkg.id },
          data: { status: "EXPIRED" },
        });
        return null;
      }

      const updatedPkg = await tx.bookingPackage.update({
        where: { id: pkg.id },
        data: {
          usedSessions: { increment: 1 },
          bookings: { connect: { id: params.bookingId } },
        },
      });

      if (updatedPkg.usedSessions >= updatedPkg.totalSessions) {
        return tx.bookingPackage.update({
          where: { id: pkg.id },
          data: { status: "EXPIRED" },
        });
      }

      return updatedPkg;
    });

    return result;
  }

  /**
   * Release a session back to the package when a booking is cancelled.
   * Decrements the usedSessions counter and unlinks the booking.
   */
  async releaseSession(params: { packageId: number; bookingId: number }): Promise<BookingPackage | null> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const pkg = await tx.bookingPackage.findUnique({
          where: { id: params.packageId },
          select: { id: true, usedSessions: true, status: true },
        });

        if (!pkg) {
          return null;
        }

        if (pkg.usedSessions <= 0) {
          return null;
        }

        const newStatus: BookingPackageStatus = pkg.status === "EXPIRED" ? "ACTIVE" : pkg.status;
        return tx.bookingPackage.update({
          where: { id: pkg.id },
          data: {
            usedSessions: { decrement: 1 },
            bookings: { disconnect: { id: params.bookingId } },
            status: newStatus,
          },
        });
      });

      return result;
    } catch (error) {
      log.error("Failed to release session from package", params.packageId, error);
      return null;
    }
  }

  /**
   * List packages for an organizer, optionally filtered by attendee email.
   */
  async listPackages(params: {
    organizerId: number;
    attendeeEmail?: string;
    status?: BookingPackageStatus;
  }): Promise<BookingPackage[]> {
    const where: Prisma.BookingPackageWhereInput = {
      organizerId: params.organizerId,
    };
    if (params.attendeeEmail) {
      where.attendeeEmail = params.attendeeEmail;
    }
    if (params.status) {
      where.status = params.status;
    }

    return prisma.bookingPackage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        uid: true,
        attendeeEmail: true,
        attendeeName: true,
        eventTypeId: true,
        totalSessions: true,
        usedSessions: true,
        pricePerSession: true,
        currency: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        organizerId: true,
        stripePaymentId: true,
        bookings: { select: { id: true, uid: true, startTime: true, status: true } },
      },
    });
  }

  /**
   * Cancel a package, making it unusable for future bookings.
   * Existing bookings linked to the package are not affected.
   */
  async cancelPackage(packageId: number, organizerId: number): Promise<BookingPackage | null> {
    const pkg = await prisma.bookingPackage.findFirst({
      where: { id: packageId, organizerId },
    });
    if (!pkg) {
      return null;
    }
    return prisma.bookingPackage.update({
      where: { id: packageId },
      data: { status: "CANCELLED" },
    });
  }
}

export const bookingPackageService = new BookingPackageService();
