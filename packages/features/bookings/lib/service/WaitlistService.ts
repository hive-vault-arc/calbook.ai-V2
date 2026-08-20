import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { BookingWaitlist } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["waitlist-service"] });

export class WaitlistService {
  async addToWaitlist(params: {
    eventTypeId: number;
    slotTime: Date;
    email: string;
    name?: string;
    phoneNumber?: string;
  }): Promise<BookingWaitlist> {
    const existing = await prisma.bookingWaitlist.findFirst({
      where: {
        eventTypeId: params.eventTypeId,
        slotTime: params.slotTime,
        email: params.email,
        expiresAt: null,
      },
    });
    if (existing) {
      return existing;
    }

    return prisma.bookingWaitlist.create({
      data: {
        eventTypeId: params.eventTypeId,
        slotTime: params.slotTime,
        email: params.email,
        name: params.name,
        phoneNumber: params.phoneNumber,
      },
    });
  }

  async removeFromWaitlist(params: { eventTypeId: number; slotTime: Date; email: string }): Promise<void> {
    await prisma.bookingWaitlist.deleteMany({
      where: {
        eventTypeId: params.eventTypeId,
        slotTime: params.slotTime,
        email: params.email,
      },
    });
  }

  async promoteFromWaitlist(params: {
    eventTypeId: number;
    slotTime: Date;
  }): Promise<BookingWaitlist | null> {
    const nextInLine = await prisma.bookingWaitlist.findFirst({
      where: {
        eventTypeId: params.eventTypeId,
        slotTime: params.slotTime,
        notifiedAt: null,
        expiresAt: null,
      },
      orderBy: { createdAt: "asc" },
    });

    if (!nextInLine) {
      return null;
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const notified = await prisma.bookingWaitlist.update({
      where: { id: nextInLine.id },
      data: {
        notifiedAt: new Date(),
        expiresAt,
      },
    });

    log.info("Waitlist promotion notification", {
      email: notified.email,
      slotTime: params.slotTime.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    return notified;
  }

  async getWaitlistForSlot(params: { eventTypeId: number; slotTime: Date }): Promise<BookingWaitlist[]> {
    return prisma.bookingWaitlist.findMany({
      where: {
        eventTypeId: params.eventTypeId,
        slotTime: params.slotTime,
        expiresAt: null,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async expireOldNotifications(): Promise<number> {
    const result = await prisma.bookingWaitlist.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }
}

export const waitlistService = new WaitlistService();
