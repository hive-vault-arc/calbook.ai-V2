import { z } from "zod";

import { subscriptionService } from "@calcom/features/subscriptions/lib/SubscriptionService";
import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import publicProcedure from "../../../procedures/publicProcedure";
import { router } from "../../../trpc";

export const subscriptionsRouter = router({
  /**
   * R4.4: Create a checkout session for subscribing to an event type.
   */
  createCheckout: publicProcedure
    .input(
      z.object({
        eventTypeId: z.number().int(),
        email: z.string().email(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const eventType = await prisma.eventType.findUnique({
        where: { id: input.eventTypeId },
        select: { id: true, requiresSubscription: true, stripeSubscriptionPriceId: true, slug: true },
      });

      if (!eventType || !eventType.requiresSubscription) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event type not found or does not require subscription" });
      }

      if (!eventType.stripeSubscriptionPriceId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Subscription pricing not configured" });
      }

      const session = ctx.req?.session;
      const userId = session?.user?.id;

      const successUrl = `${WEBAPP_URL}/subscription/success?eventTypeId=${input.eventTypeId}`;
      const cancelUrl = `${WEBAPP_URL}/subscription/cancel?eventTypeId=${input.eventTypeId}`;

      const result = await subscriptionService.createCheckoutSession({
        eventTypeId: input.eventTypeId,
        email: input.email,
        userId,
        successUrl,
        cancelUrl,
      });

      return { url: result.url };
    }),

  /**
   * R4.6: Create a Stripe Customer Portal session.
   */
  createPortal: authedProcedure
    .input(
      z.object({
        eventTypeId: z.number().int().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { email: true },
      });

      if (!user?.email) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User email not found" });
      }

      const returnUrl = input.eventTypeId
        ? `${WEBAPP_URL}/subscription/manage?eventTypeId=${input.eventTypeId}`
        : `${WEBAPP_URL}/settings/billing`;

      const result = await subscriptionService.createPortalSession({
        email: user.email,
        returnUrl,
      });

      return { url: result.url };
    }),

  /**
   * R4.7: Check if the current user has an active subscription for an event type.
   */
  checkEntitlement: publicProcedure
    .input(
      z.object({
        eventTypeId: z.number().int(),
      })
    )
    .query(async ({ input, ctx }) => {
      const session = ctx.req?.session;
      const userId = session?.user?.id;

      let email: string | undefined;
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });
        email = user?.email;
      }

      if (!userId && !email) {
        return { hasActiveSubscription: false };
      }

      const hasActiveSubscription = await subscriptionService.checkEntitlement({
        eventTypeId: input.eventTypeId,
        email,
        userId,
      });

      return { hasActiveSubscription };
    }),
});
