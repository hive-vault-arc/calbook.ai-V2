import { isSaaSFeatureEnabled, SAAS_FLAGS } from "@calcom/features/flags/saasFlags";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import authedProcedure from "../../../procedures/authedProcedure";
import publicProcedure from "../../../procedures/publicProcedure";
import { router } from "../../../trpc";
import { ZIsAvailableInputSchema, ZIsAvailableOutputSchema } from "./isAvailable.schema";
import { ZRemoveSelectedSlotInputSchema } from "./removeSelectedSlot.schema";
import { ZReserveSlotInputSchema } from "./reserveSlot.schema";
import { ZGetScheduleInputSchema, ZJoinWaitlistInputSchema, ZLeaveWaitlistInputSchema } from "./types";

type SlotsRouterHandlerCache = {
  getSchedule?: typeof import("./getSchedule.handler").getScheduleHandler;
  reserveSlot?: typeof import("./reserveSlot.handler").reserveSlotHandler;
  isAvailable?: typeof import("./isAvailable.handler").isAvailableHandler;
};

/** This should be called getAvailableSlots */
export const slotsRouter = router({
  getSchedule: publicProcedure.input(ZGetScheduleInputSchema).query(async ({ input, ctx }) => {
    const { getScheduleHandler } = await import("./getSchedule.handler");

    return getScheduleHandler({
      ctx,
      input,
    });
  }),
  reserveSlot: publicProcedure.input(ZReserveSlotInputSchema).mutation(async ({ input, ctx }) => {
    const { reserveSlotHandler } = await import("./reserveSlot.handler");

    return reserveSlotHandler({
      ctx: { ...ctx, req: ctx.req as NextApiRequest, res: ctx.res as NextApiResponse },
      input,
    });
  }),
  isAvailable: publicProcedure
    .input(ZIsAvailableInputSchema)
    .output(ZIsAvailableOutputSchema)
    .query(async ({ input, ctx }) => {
      const { isAvailableHandler } = await import("./isAvailable.handler");

      return isAvailableHandler({
        ctx: { ...ctx, req: ctx.req as NextApiRequest },
        input,
      });
    }),
  // This endpoint has no dependencies, it doesn't need its own file
  removeSelectedSlotMark: publicProcedure
    .input(ZRemoveSelectedSlotInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { req, prisma } = ctx;
      const uid = req?.cookies?.uid || input.uid;
      if (uid) {
        await prisma.selectedSlots.deleteMany({ where: { uid: { equals: uid } } });
      }
      return;
    }),
  joinWaitlist: publicProcedure.input(ZJoinWaitlistInputSchema).mutation(async ({ input }) => {
    const { joinWaitlistHandler } = await import("./waitlist.handler");
    return joinWaitlistHandler({ input });
  }),
  leaveWaitlist: publicProcedure.input(ZLeaveWaitlistInputSchema).mutation(async ({ input }) => {
    const { leaveWaitlistHandler } = await import("./waitlist.handler");
    return leaveWaitlistHandler({ input });
  }),
  // R3.8: Organizer waitlist visibility
  getWaitlistForEventType: authedProcedure
    .input(z.object({ eventTypeId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      if (!(await isSaaSFeatureEnabled(SAAS_FLAGS.waitlist))) {
        return { entries: [] };
      }
      const { prisma } = ctx;
      // Verify the user owns this event type
      const eventType = await prisma.eventType.findFirst({
        where: {
          id: input.eventTypeId,
          OR: [{ userId: ctx.user.id }, { hosts: { some: { userId: ctx.user.id } } }],
        },
        select: { id: true },
      });
      if (!eventType) {
        return { entries: [] };
      }
      const entries = await prisma.bookingWaitlist.findMany({
        where: { eventTypeId: input.eventTypeId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          slotTime: true,
          slotEndTime: true,
          tier: true,
          notifiedAt: true,
          expiresAt: true,
          createdAt: true,
        },
      });
      return { entries };
    }),
});
