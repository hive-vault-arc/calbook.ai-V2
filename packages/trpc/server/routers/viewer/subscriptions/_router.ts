import process from "node:process";
import { subscriptionService } from "@calcom/features/subscriptions/lib/SubscriptionService";
import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

export const subscriptionsRouter = router({
  getConfiguration: authedProcedure.query(() => ({
    isConfigured: Boolean(process.env.STRIPE_PRIVATE_KEY),
  })),

  configurePrice: authedProcedure
    .input(
      z.object({
        eventTypeId: z.number().int(),
        amount: z.number().int().min(50).max(100_000_000),
        currency: z.string().regex(/^[a-zA-Z]{3}$/),
        interval: z.enum(["month", "year"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const eventType = await prisma.eventType.findFirst({
        where: {
          id: input.eventTypeId,
          OR: [
            { userId: ctx.user.id },
            {
              team: {
                members: {
                  some: {
                    userId: ctx.user.id,
                    accepted: true,
                    role: { in: [MembershipRole.OWNER, MembershipRole.ADMIN] },
                  },
                },
              },
            },
          ],
        },
        select: { id: true },
      });
      if (!eventType) throw new TRPCError({ code: "FORBIDDEN" });

      return subscriptionService.createEventTypePrice({
        eventTypeId: input.eventTypeId,
        amount: input.amount,
        currency: input.currency.toLowerCase(),
        interval: input.interval,
      });
    }),

  /**
   * R4.4: Create a checkout session for subscribing to an event type.
   */
  createCheckout: authedProcedure
    .input(z.object({ eventTypeId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const eventType = await prisma.eventType.findUnique({
        where: { id: input.eventTypeId },
        select: {
          id: true,
          requiresSubscription: true,
          stripeSubscriptionPriceId: true,
          slug: true,
          users: { select: { username: true }, take: 1 },
        },
      });

      if (!eventType || !eventType.requiresSubscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event type not found or does not require subscription",
        });
      }

      if (!eventType.stripeSubscriptionPriceId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Subscription pricing not configured" });
      }

      const hasActiveSubscription = await subscriptionService.checkEntitlement({
        eventTypeId: input.eventTypeId,
        userId: ctx.user.id,
        email: ctx.user.email,
      });
      if (hasActiveSubscription) {
        throw new TRPCError({ code: "CONFLICT", message: "An active subscription already exists" });
      }

      const username = eventType.users[0]?.username;
      if (!username) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Event type owner has no booking profile" });
      }

      const returnUrl = `${WEBAPP_URL}/${username}/${eventType.slug}`;
      const result = await subscriptionService.createCheckoutSession({
        eventTypeId: input.eventTypeId,
        email: ctx.user.email,
        userId: ctx.user.id,
        successUrl: `${returnUrl}?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${returnUrl}?subscription=canceled`,
      });

      return { url: result.url };
    }),

  syncCheckout: authedProcedure
    .input(z.object({ eventTypeId: z.number().int(), sessionId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      return subscriptionService.syncCheckoutSession({
        eventTypeId: input.eventTypeId,
        sessionId: input.sessionId,
        userId: ctx.user.id,
        email: ctx.user.email,
      });
    }),

  /**
   * R4.6: Create a Stripe Customer Portal session.
   */
  createPortal: authedProcedure
    .input(
      z.object({
        eventTypeId: z.number().int(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let returnUrl = `${WEBAPP_URL}/settings/billing`;
      if (input.eventTypeId) {
        const eventType = await prisma.eventType.findUnique({
          where: { id: input.eventTypeId },
          select: { slug: true, users: { select: { username: true }, take: 1 } },
        });
        const username = eventType?.users[0]?.username;
        if (eventType && username) {
          returnUrl = `${WEBAPP_URL}/${username}/${eventType.slug}`;
        }
      }

      const result = await subscriptionService.createPortalSession({
        eventTypeId: input.eventTypeId,
        email: ctx.user.email,
        returnUrl,
      });

      return { url: result.url };
    }),

  /**
   * R4.7: Check if the current user has an active subscription for an event type.
   */
  checkEntitlement: authedProcedure
    .input(z.object({ eventTypeId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const hasActiveSubscription = await subscriptionService.checkEntitlement({
        eventTypeId: input.eventTypeId,
        email: ctx.user.email,
        userId: ctx.user.id,
      });

      return { hasActiveSubscription };
    }),
});
