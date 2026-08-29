import { createHash, randomBytes } from "node:crypto";
import { sendWaitlistPromotionEmail } from "@calcom/emails/templates/waitlist-promotion-email";
import { WEBSITE_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { BookingWaitlist } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["waitlist-service"] });

const PROMOTION_EXPIRY_HOURS = 2;
const PROMOTION_EXPIRY_MS = PROMOTION_EXPIRY_HOURS * 60 * 60 * 1000;
const REDEMPTION_CLAIM_EXPIRY_MS = 30 * 60 * 1000;
const PROMOTION_EMAIL_MAX_ATTEMPTS = 3;

function generatePromotionToken(): string {
  return randomBytes(32).toString("hex");
}

function generateWaitlistDeduplicationKey(params: {
  eventTypeId: number;
  slotTime: Date;
  tier?: string;
  email: string;
}): string {
  return createHash("sha256")
    .update(
      [
        params.eventTypeId,
        params.slotTime.toISOString(),
        params.tier ?? "",
        params.email.trim().toLowerCase(),
      ].join(":")
    )
    .digest("hex");
}

async function sendPromotionEmailWithRetry(
  payload: Parameters<typeof sendWaitlistPromotionEmail>[0]
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= PROMOTION_EMAIL_MAX_ATTEMPTS; attempt += 1) {
    try {
      await sendWaitlistPromotionEmail(payload);
      return;
    } catch (error) {
      lastError = error;
      log.warn("Waitlist promotion email attempt failed", {
        attempt,
        maxAttempts: PROMOTION_EMAIL_MAX_ATTEMPTS,
        recipient: payload.to,
      });
    }
  }

  throw lastError;
}

export type PromotionClaim = {
  entry: BookingWaitlist;
  claimToken: string;
};

export type WaitlistRecoveryResult = {
  expired: number;
  promoted: number;
  failed: number;
};

export class WaitlistService {
  async addToWaitlist(params: {
    eventTypeId: number;
    slotTime: Date;
    slotEndTime?: Date;
    tier?: string;
    email: string;
    name?: string;
    phoneNumber?: string;
  }): Promise<BookingWaitlist> {
    const deduplicationKey = generateWaitlistDeduplicationKey(params);
    return prisma.bookingWaitlist.upsert({
      where: { deduplicationKey },
      create: {
        eventTypeId: params.eventTypeId,
        slotTime: params.slotTime,
        slotEndTime: params.slotEndTime,
        tier: params.tier,
        email: params.email.trim().toLowerCase(),
        name: params.name,
        phoneNumber: params.phoneNumber,
        deduplicationKey,
      },
      update: {},
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

  /**
   * R3.3: Atomic promotion — uses a transaction with conditional update
   * so only one person gets promoted per released seat.
   */
  async promoteFromWaitlist(params: {
    eventTypeId: number;
    slotTime: Date;
    tier?: string;
  }): Promise<BookingWaitlist | null> {
    const promoted = await prisma.$transaction(async (tx) => {
      // Find the next eligible person (oldest unnotified, matching tier if specified)
      const nextInLine = await tx.bookingWaitlist.findFirst({
        where: {
          eventTypeId: params.eventTypeId,
          slotTime: params.slotTime,
          notifiedAt: null,
          expiresAt: null,
          ...(params.tier ? { tier: params.tier } : {}),
        },
        orderBy: { createdAt: "asc" },
      });

      if (!nextInLine) {
        return null;
      }

      // R3.4: Generate a cryptographically random, single-use promotion token with 2-hour expiry
      const promotionToken = generatePromotionToken();
      const expiresAt = new Date(Date.now() + PROMOTION_EXPIRY_MS);

      const claim = await tx.bookingWaitlist.updateMany({
        where: { id: nextInLine.id, notifiedAt: null, expiresAt: null },
        data: { notifiedAt: new Date(), expiresAt, promotionToken },
      });
      if (claim.count !== 1) return null;

      const notified = await tx.bookingWaitlist.findUnique({ where: { id: nextInLine.id } });
      if (!notified) return null;

      log.info("Waitlist promotion notification", {
        waitlistEntryId: notified.id,
        slotTime: params.slotTime.toISOString(),
        expiresAt: expiresAt.toISOString(),
        tier: params.tier,
      });

      return notified;
    });

    if (promoted) await this.sendPromotionEmail(promoted);

    return promoted;
  }

  /**
   * R3.4: Validate a promotion token and mark it as used.
   * Returns the waitlist entry if the token is valid and not expired.
   */
  async validatePromotionToken(token: string): Promise<BookingWaitlist | null> {
    const entry = await prisma.bookingWaitlist.findUnique({
      where: { promotionToken: token },
    });

    if (!entry || !entry.notifiedAt || !entry.expiresAt) {
      return null;
    }

    if (entry.expiresAt < new Date()) {
      log.info("Promotion token expired", { waitlistEntryId: entry.id });
      return null;
    }

    return entry;
  }

  async claimPromotionToken(params: {
    token: string;
    eventTypeId: number;
    email: string;
    slotTime: Date;
    tier?: string;
  }): Promise<PromotionClaim | null> {
    const now = new Date();
    const claimToken = generatePromotionToken();
    const claimExpiresAt = new Date(now.getTime() + REDEMPTION_CLAIM_EXPIRY_MS);
    const claim = await prisma.bookingWaitlist.updateMany({
      where: {
        promotionToken: params.token,
        eventTypeId: params.eventTypeId,
        email: { equals: params.email, mode: "insensitive" },
        slotTime: params.slotTime,
        tier: params.tier ?? null,
        notifiedAt: { not: null },
        expiresAt: { gt: now },
        OR: [{ redemptionClaimToken: null }, { redemptionClaimExpiresAt: { lt: now } }],
      },
      data: { redemptionClaimToken: claimToken, redemptionClaimExpiresAt: claimExpiresAt },
    });
    if (claim.count !== 1) return null;

    const entry = await prisma.bookingWaitlist.findUnique({ where: { redemptionClaimToken: claimToken } });
    if (!entry) return null;
    return { entry, claimToken };
  }

  async releasePromotionClaim(token: string, claimToken: string): Promise<boolean> {
    const released = await prisma.bookingWaitlist.updateMany({
      where: { promotionToken: token, redemptionClaimToken: claimToken },
      data: { redemptionClaimToken: null, redemptionClaimExpiresAt: null },
    });
    return released.count === 1;
  }

  /**
   * R3.4: Consume a promotion token after it's been used to create a booking.
   * Removes the waitlist entry so the token can't be reused.
   */
  async consumePromotionToken(token: string, claimToken: string): Promise<boolean> {
    const consumed = await prisma.bookingWaitlist.deleteMany({
      where: { promotionToken: token, redemptionClaimToken: claimToken },
    });
    return consumed.count === 1;
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

  async recoverExpiredPromotions(batchSize = 100): Promise<WaitlistRecoveryResult> {
    const now = new Date();
    const candidates = await prisma.bookingWaitlist.findMany({
      where: {
        notifiedAt: { not: null },
        expiresAt: { lt: now },
        OR: [{ redemptionClaimToken: null }, { redemptionClaimExpiresAt: { lt: now } }],
      },
      select: { id: true, eventTypeId: true, slotTime: true, tier: true },
      orderBy: { expiresAt: "asc" },
      take: Math.max(1, Math.min(batchSize, 100)),
    });
    const result: WaitlistRecoveryResult = { expired: 0, promoted: 0, failed: 0 };

    for (const candidate of candidates) {
      try {
        const recovery = await prisma.$transaction(async (tx) => {
          const expired = await tx.bookingWaitlist.deleteMany({
            where: {
              id: candidate.id,
              notifiedAt: { not: null },
              expiresAt: { lt: now },
              OR: [{ redemptionClaimToken: null }, { redemptionClaimExpiresAt: { lt: now } }],
            },
          });
          if (expired.count !== 1) return { expired: false, promoted: null };

          const nextInLine = await tx.bookingWaitlist.findFirst({
            where: {
              eventTypeId: candidate.eventTypeId,
              slotTime: candidate.slotTime,
              tier: candidate.tier,
              notifiedAt: null,
              expiresAt: null,
            },
            orderBy: { createdAt: "asc" },
          });
          if (!nextInLine) return { expired: true, promoted: null };

          const expiresAt = new Date(Date.now() + PROMOTION_EXPIRY_MS);
          const promoted = await tx.bookingWaitlist.updateMany({
            where: { id: nextInLine.id, notifiedAt: null, expiresAt: null },
            data: {
              notifiedAt: new Date(),
              expiresAt,
              promotionToken: generatePromotionToken(),
            },
          });
          if (promoted.count !== 1) return { expired: true, promoted: null };

          const entry = await tx.bookingWaitlist.findUnique({ where: { id: nextInLine.id } });
          return { expired: true, promoted: entry };
        });

        if (!recovery.expired) continue;
        result.expired += 1;
        if (!recovery.promoted) continue;

        result.promoted += 1;
        await this.sendPromotionEmail(recovery.promoted);
      } catch (error) {
        result.failed += 1;
        log.error("Failed to recover expired waitlist promotion", {
          waitlistEntryId: candidate.id,
          eventTypeId: candidate.eventTypeId,
          slotTime: candidate.slotTime.toISOString(),
          error,
        });
      }
    }

    return result;
  }

  private async sendPromotionEmail(promoted: BookingWaitlist): Promise<void> {
    const eventType = await prisma.eventType.findUnique({
      where: { id: promoted.eventTypeId },
      select: { title: true, users: { select: { name: true } } },
    });
    if (!eventType) return;

    const bookingLink = `${WEBSITE_URL}/booking/waitlist/${promoted.promotionToken}`;
    await sendPromotionEmailWithRetry({
      to: promoted.email,
      name: promoted.name,
      eventTitle: eventType.title,
      organizerName: eventType.users[0]?.name || "Organizer",
      slotTime: promoted.slotTime.toISOString(),
      slotEndTime: promoted.slotEndTime?.toISOString(),
      tier: promoted.tier ?? undefined,
      bookingLink,
      expiresAt:
        promoted.expiresAt?.toISOString() ?? new Date(Date.now() + PROMOTION_EXPIRY_MS).toISOString(),
    });
  }
}

export const waitlistService = new WaitlistService();
