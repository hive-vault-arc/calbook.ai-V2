import { waitlistService } from "@calcom/features/bookings/lib/service/WaitlistService";
import { isSaaSFeatureEnabled, SAAS_FLAGS } from "@calcom/features/flags/saasFlags";
import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TJoinWaitlistInputSchema, TLeaveWaitlistInputSchema } from "./types";

type JoinWaitlistOptions = {
  input: TJoinWaitlistInputSchema;
};

type LeaveWaitlistOptions = {
  input: TLeaveWaitlistInputSchema;
};

// R3.7: Simple in-memory rate limiting per email
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5;

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(email);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(email, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  entry.count++;
  return true;
}

export const joinWaitlistHandler = async ({ input }: JoinWaitlistOptions) => {
  if (!(await isSaaSFeatureEnabled(SAAS_FLAGS.waitlist))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "waitlist_disabled" });
  }
  const slotTime = new Date(input.slotUtcStartDate);
  if (isNaN(slotTime.getTime())) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid slot time" });
  }

  // R3.7: Rate limiting
  if (!checkRateLimit(input.email)) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many requests. Please try again later." });
  }

  // R3.7: Event validation — verify the event type exists
  const eventType = await prisma.eventType.findUnique({
    where: { id: input.eventTypeId },
    select: { id: true, title: true },
  });
  if (!eventType) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event type not found" });
  }

  const slotEndTime = input.slotUtcEndDate ? new Date(input.slotUtcEndDate) : undefined;
  if (slotEndTime && isNaN(slotEndTime.getTime())) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid slot end time" });
  }

  const entry = await waitlistService.addToWaitlist({
    eventTypeId: input.eventTypeId,
    slotTime,
    slotEndTime,
    tier: input.tier,
    email: input.email,
    name: input.name,
    phoneNumber: input.phoneNumber,
  });

  return { id: entry.id, success: true };
};

export const leaveWaitlistHandler = async ({ input }: LeaveWaitlistOptions) => {
  const slotTime = new Date(input.slotUtcStartDate);
  if (isNaN(slotTime.getTime())) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid slot time" });
  }

  await waitlistService.removeFromWaitlist({
    eventTypeId: input.eventTypeId,
    slotTime,
    email: input.email,
  });

  return { success: true };
};
