import process from "node:process";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import Stripe from "stripe";
import {
  getPlatformPriceId,
  PLATFORM_PLANS,
  type PlatformPlan,
  type PlatformPlanId,
} from "./plan-definitions";
import {
  getFeaturesForPlan,
  normalizePlatformPlanId,
  type PlatformFeatureDefinition,
  type PlatformFeatureKey,
  planIncludesFeature,
} from "./plan-features";

const log = logger.getSubLogger({ prefix: ["platform-billing"] });

function getStripe(): Stripe {
  const key = process.env.STRIPE_PRIVATE_KEY;
  if (!key) throw ErrorWithCode.Factory.InternalServerError("STRIPE_PRIVATE_KEY is not configured");
  return new Stripe(key, { apiVersion: "2020-08-27" });
}

async function assertBillingAdmin(teamId: number, userId: number) {
  const membership = await prisma.membership.findFirst({
    where: { teamId, userId, accepted: true, role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] } },
    select: { teamId: true },
  });
  if (!membership) throw ErrorWithCode.Factory.Forbidden("Only organization admins can manage billing");
}

async function assertTeamMember(teamId: number, userId: number): Promise<void> {
  const membership = await prisma.membership.findFirst({
    where: { teamId, userId, accepted: true },
    select: { teamId: true },
  });
  if (!membership) throw ErrorWithCode.Factory.Forbidden("You do not have access to this organization");
}

async function getActiveTeamTrialEnd(teamId: number): Promise<Date | null> {
  const owner = await prisma.membership.findFirst({
    where: {
      teamId,
      accepted: true,
      role: MembershipRole.OWNER,
      user: { trialEndsAt: { gt: new Date() } },
    },
    select: { user: { select: { trialEndsAt: true } } },
  });
  return owner?.user.trialEndsAt ?? null;
}

export type PublicPlatformPlan = Omit<PlatformPlan, "monthlyPriceId" | "annualPriceId"> & {
  monthlyAvailable: boolean;
  annualAvailable: boolean;
  features: PlatformFeatureDefinition[];
};

async function getOrCreateCustomer(teamId: number, email: string, name?: string) {
  const existing = await prisma.platformBilling.findUnique({
    where: { id: teamId },
    select: { customerId: true },
  });
  if (existing?.customerId) return existing.customerId;
  const stripe = getStripe();
  const customer = await stripe.customers.create({ email, name, metadata: { teamId: String(teamId) } });
  await prisma.platformBilling.upsert({
    where: { id: teamId },
    create: { id: teamId, customerId: customer.id },
    update: { customerId: customer.id },
    select: { id: true },
  });
  return customer.id;
}

export class PlatformBillingService {
  async getPlans(): Promise<PublicPlatformPlan[]> {
    return Object.values(PLATFORM_PLANS).map(({ monthlyPriceId, annualPriceId, ...plan }) => ({
      ...plan,
      monthlyAvailable: plan.id === "free" || Boolean(monthlyPriceId),
      annualAvailable: plan.id === "free" || Boolean(annualPriceId),
      features: getFeaturesForPlan(plan.id),
    }));
  }

  async getEntitlements(
    teamId: number,
    userId: number
  ): Promise<{ planId: PlatformPlanId; features: PlatformFeatureDefinition[] }> {
    await assertTeamMember(teamId, userId);
    const [billing, trialEndsAt] = await Promise.all([
      prisma.platformBilling.findUnique({
        where: { id: teamId },
        select: { plan: true },
      }),
      getActiveTeamTrialEnd(teamId),
    ]);
    const hasActiveTrial = Boolean(trialEndsAt);
    const storedPlan = normalizePlatformPlanId(billing?.plan);
    const planId = storedPlan === "free" && hasActiveTrial ? "pro" : storedPlan;
    return { planId, features: getFeaturesForPlan(planId) };
  }

  async assertFeatureAccess(params: {
    teamId: number;
    userId: number;
    feature: PlatformFeatureKey;
  }): Promise<void> {
    const { planId } = await this.getEntitlements(params.teamId, params.userId);
    if (planIncludesFeature(planId, params.feature)) return;

    throw ErrorWithCode.Factory.Forbidden("This feature requires a CalBook Pro plan");
  }

  async getCurrentPlan(teamId: number, userId: number) {
    await assertBillingAdmin(teamId, userId);
    const [billing, trialEndsAt] = await Promise.all([
      prisma.platformBilling.findUnique({
        where: { id: teamId },
        select: {
          customerId: true,
          subscriptionId: true,
          priceId: true,
          plan: true,
          billingCycleStart: true,
          billingCycleEnd: true,
          overdue: true,
        },
      }),
      getActiveTeamTrialEnd(teamId),
    ]);
    const hasActiveTrial = Boolean(trialEndsAt);
    const current =
      billing ??
      ({
        customerId: null,
        subscriptionId: null,
        priceId: null,
        plan: "none",
        billingCycleStart: null,
        billingCycleEnd: null,
        overdue: false,
      } as const);
    const storedPlan = normalizePlatformPlanId(current.plan);

    return {
      ...current,
      plan: storedPlan === "free" && hasActiveTrial ? "pro" : storedPlan,
      isTrial: storedPlan === "free" && hasActiveTrial,
      trialEndsAt,
    };
  }

  async createCheckout(params: {
    teamId: number;
    userId: number;
    email: string;
    name?: string;
    planId: Exclude<PlatformPlanId, "free">;
    interval: "month" | "year";
    successUrl: string;
    cancelUrl: string;
  }) {
    await assertBillingAdmin(params.teamId, params.userId);
    const currentBilling = await prisma.platformBilling.findUnique({
      where: { id: params.teamId },
      select: { subscriptionId: true },
    });
    if (currentBilling?.subscriptionId) {
      throw ErrorWithCode.Factory.BadRequest(
        "This organization already has a subscription. Use the billing portal to change plans."
      );
    }

    const priceId = getPlatformPriceId(params.planId, params.interval);
    if (!priceId)
      throw ErrorWithCode.Factory.InternalServerError(`Stripe price is not configured for ${params.planId}`);
    const customerId = await getOrCreateCustomer(params.teamId, params.email, params.name);
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create(
      {
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: { teamId: String(params.teamId), planId: params.planId },
        subscription_data: { metadata: { teamId: String(params.teamId), planId: params.planId } },
      },
      { idempotencyKey: `platform-billing-checkout:${params.teamId}:${params.planId}:${params.interval}` }
    );
    if (!session.url) throw ErrorWithCode.Factory.InternalServerError("Stripe checkout session has no URL");
    return { url: session.url, sessionId: session.id };
  }

  async createPortal(teamId: number, userId: number, returnUrl: string) {
    await assertBillingAdmin(teamId, userId);
    const billing = await prisma.platformBilling.findUnique({
      where: { id: teamId },
      select: { customerId: true },
    });
    if (!billing?.customerId)
      throw ErrorWithCode.Factory.NotFound("No Stripe customer exists for this organization");
    return (
      await getStripe().billingPortal.sessions.create({ customer: billing.customerId, return_url: returnUrl })
    ).url;
  }

  async syncWebhook(event: Stripe.Event) {
    if (
      ![
        "checkout.session.completed",
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "invoice.payment_failed",
        "invoice.payment_succeeded",
      ].includes(event.type)
    )
      return;

    if (event.type === "invoice.payment_failed" || event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      if (!subscriptionId) return;

      await prisma.platformBilling.updateMany({
        where: { subscriptionId },
        data: { overdue: event.type === "invoice.payment_failed" },
      });
      return;
    }

    const object = event.data.object as Stripe.Checkout.Session | Stripe.Subscription;
    const metadata = object.metadata;
    const teamId = Number(metadata?.teamId);
    if (event.type === "customer.subscription.deleted") {
      const subscription = object as Stripe.Subscription;
      await prisma.platformBilling.updateMany({
        where: teamId
          ? { OR: [{ id: teamId }, { subscriptionId: subscription.id }] }
          : { subscriptionId: subscription.id },
        data: {
          subscriptionId: null,
          priceId: null,
          plan: "none",
          billingCycleStart: null,
          billingCycleEnd: null,
          overdue: false,
        },
      });
      return;
    }
    if (!teamId) {
      log.warn("Ignoring platform billing event without teamId", { eventId: event.id });
      return;
    }
    if (event.type === "checkout.session.completed") return;
    const subscription = object as Stripe.Subscription;
    const priceId = subscription.items.data[0]?.price.id;
    const plan =
      Object.values(PLATFORM_PLANS).find(
        (candidate) => candidate.monthlyPriceId === priceId || candidate.annualPriceId === priceId
      )?.id ?? "none";
    await prisma.platformBilling.upsert({
      where: { id: teamId },
      create: {
        id: teamId,
        customerId:
          typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
        subscriptionId: subscription.id,
        priceId,
        plan,
        billingCycleStart: subscription.current_period_start,
        billingCycleEnd: subscription.current_period_end,
        overdue: subscription.status === "past_due" || subscription.status === "unpaid",
      },
      update: {
        subscriptionId: subscription.id,
        priceId,
        plan,
        billingCycleStart: subscription.current_period_start,
        billingCycleEnd: subscription.current_period_end,
        overdue: subscription.status === "past_due" || subscription.status === "unpaid",
      },
      select: { id: true },
    });
  }
}

export const platformBillingService = new PlatformBillingService();
