import { platformBillingService } from "@calcom/features/billing/lib/PlatformBillingService";
import { PLATFORM_FEATURES, type PlatformFeatureKey } from "@calcom/features/billing/lib/plan-features";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { z } from "zod";
import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

const platformFeatureKeySchema = z.custom<PlatformFeatureKey>(
  (value) => typeof value === "string" && PLATFORM_FEATURES.some((feature) => feature.key === value)
);

export const billingRouter = router({
  plans: authedProcedure.query(() => platformBillingService.getPlans()),
  currentPlan: authedProcedure
    .input(z.object({ teamId: z.number().int().positive() }))
    .query(({ ctx, input }) => platformBillingService.getCurrentPlan(input.teamId, ctx.user.id)),
  entitlements: authedProcedure
    .input(z.object({ teamId: z.number().int().positive() }))
    .query(({ ctx, input }) => platformBillingService.getEntitlements(input.teamId, ctx.user.id)),
  assertFeatureAccess: authedProcedure
    .input(
      z.object({
        teamId: z.number().int().positive(),
        feature: platformFeatureKeySchema,
      })
    )
    .query(({ ctx, input }) =>
      platformBillingService.assertFeatureAccess({
        teamId: input.teamId,
        userId: ctx.user.id,
        feature: input.feature,
      })
    ),
  createCheckout: authedProcedure
    .input(
      z.object({
        teamId: z.number().int().positive(),
        planId: z.enum(["pro", "enterprise"]),
        interval: z.enum(["month", "year"]),
      })
    )
    .mutation(({ ctx, input }) =>
      platformBillingService.createCheckout({
        ...input,
        userId: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name ?? undefined,
        successUrl: `${WEBAPP_URL}/settings/billing?checkout=success`,
        cancelUrl: `${WEBAPP_URL}/settings/billing?checkout=canceled`,
      })
    ),
  createPortal: authedProcedure
    .input(z.object({ teamId: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      platformBillingService.createPortal(input.teamId, ctx.user.id, `${WEBAPP_URL}/settings/billing`)
    ),
});
