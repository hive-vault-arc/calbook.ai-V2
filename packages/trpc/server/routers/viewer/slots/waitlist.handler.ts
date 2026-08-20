import { waitlistService } from "@calcom/features/bookings/lib/service/WaitlistService";
import { TRPCError } from "@trpc/server";
import type { TJoinWaitlistInputSchema, TLeaveWaitlistInputSchema } from "./types";

type JoinWaitlistOptions = {
  input: TJoinWaitlistInputSchema;
};

type LeaveWaitlistOptions = {
  input: TLeaveWaitlistInputSchema;
};

export const joinWaitlistHandler = async ({ input }: JoinWaitlistOptions) => {
  const slotTime = new Date(input.slotUtcStartDate);
  if (isNaN(slotTime.getTime())) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid slot time" });
  }

  const entry = await waitlistService.addToWaitlist({
    eventTypeId: input.eventTypeId,
    slotTime,
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
