import process from "node:process";
import { stripeOAuthTokenSchema } from "@calcom/app-store/stripepayment/lib/server";
import { FAILURE_CATEGORIES, logFailure } from "@calcom/features/monitoring/lib/monitoring";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import Stripe from "stripe";
import { subscriptionConfigSchema } from "./subscriptionConfig";

const log = logger.getSubLogger({ prefix: ["subscription-service"] });

export type SubscriptionStatus = "active" | "past_due" | "canceled" | "expired" | "trialing";

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_PRIVATE_KEY;
  if (!key) {
    throw ErrorWithCode.Factory.InternalServerError("STRIPE_PRIVATE_KEY is not configured");
  }
  return new Stripe(key, { apiVersion: "2020-08-27" });
}

export class SubscriptionService {
  private async getStripeAccountForEventType(eventTypeId: number): Promise<{
    eventType: {
      id: number;
      title: string;
      userId: number | null;
      teamId: number | null;
      requiresSubscription: boolean;
      stripeSubscriptionPriceId: string | null;
    };
    stripeAccount?: string;
  }> {
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: {
        id: true,
        title: true,
        userId: true,
        teamId: true,
        requiresSubscription: true,
        stripeSubscriptionPriceId: true,
      },
    });
    if (!eventType) throw ErrorWithCode.Factory.EventTypeNotFound();

    const credential = await prisma.credential.findFirst({
      where: {
        appId: "stripe",
        OR: [
          ...(eventType.userId ? [{ userId: eventType.userId }] : []),
          ...(eventType.teamId ? [{ teamId: eventType.teamId }] : []),
        ],
      },
      select: { key: true },
    });
    const parsedCredential = stripeOAuthTokenSchema.safeParse(credential?.key);
    const stripeAccount = parsedCredential.success ? parsedCredential.data.stripe_user_id : undefined;

    return { eventType, stripeAccount };
  }

  async createEventTypePrice(params: {
    eventTypeId: number;
    amount: number;
    currency: string;
    interval: "month" | "year";
  }): Promise<{ priceId: string }> {
    const stripe = getStripeClient();
    const { eventType, stripeAccount } = await this.getStripeAccountForEventType(params.eventTypeId);
    const product = await stripe.products.create(
      { name: eventType.title, metadata: { eventTypeId: String(eventType.id) } },
      stripeAccount ? { stripeAccount } : undefined
    );
    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: params.amount,
        currency: params.currency,
        recurring: { interval: params.interval },
        metadata: { eventTypeId: String(eventType.id) },
      },
      stripeAccount ? { stripeAccount } : undefined
    );

    await prisma.eventType.update({
      where: { id: eventType.id },
      data: { stripeSubscriptionPriceId: price.id },
      select: { id: true },
    });

    return { priceId: price.id };
  }

  /**
   * R4.3-R4.4: Create a Stripe Checkout session for subscribing to an event type.
   */
  async createCheckoutSession(params: {
    eventTypeId: number;
    email: string;
    userId?: number;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }> {
    const stripe = getStripeClient();
    const { eventType, stripeAccount } = await this.getStripeAccountForEventType(params.eventTypeId);

    if (!eventType.requiresSubscription) {
      throw ErrorWithCode.Factory.EventTypeNotFound("Event type does not require subscription");
    }

    if (!eventType.stripeSubscriptionPriceId) {
      throw ErrorWithCode.Factory.MissingPaymentCredential(
        "Event type has no Stripe subscription price configured"
      );
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer_email: params.email,
        line_items: [{ price: eventType.stripeSubscriptionPriceId, quantity: 1 }],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          eventTypeId: String(params.eventTypeId),
          email: params.email,
          userId: params.userId ? String(params.userId) : "",
        },
        subscription_data: {
          metadata: {
            eventTypeId: String(params.eventTypeId),
            email: params.email,
            userId: params.userId ? String(params.userId) : "",
          },
        },
      },
      stripeAccount ? { stripeAccount } : undefined
    );

    log.info("Created subscription checkout session", {
      eventTypeId: params.eventTypeId,
      email: params.email,
      sessionId: session.id,
    });

    return { url: session.url ?? "" };
  }

  async syncCheckoutSession(params: {
    eventTypeId: number;
    userId: number;
    email: string;
    sessionId: string;
  }): Promise<{ hasActiveSubscription: boolean }> {
    const stripe = getStripeClient();
    const { stripeAccount } = await this.getStripeAccountForEventType(params.eventTypeId);
    const requestOptions = stripeAccount ? { stripeAccount } : undefined;
    const session = await stripe.checkout.sessions.retrieve(params.sessionId, {}, requestOptions);
    const metadataUserId = Number(session.metadata?.userId);
    const metadataEventTypeId = Number(session.metadata?.eventTypeId);
    const metadataEmail = session.metadata?.email?.toLowerCase();
    if (
      metadataUserId !== params.userId ||
      metadataEventTypeId !== params.eventTypeId ||
      metadataEmail !== params.email.toLowerCase()
    ) {
      throw ErrorWithCode.Factory.NotFound("Checkout session does not belong to this subscription");
    }

    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (!subscriptionId) throw ErrorWithCode.Factory.NotFound("Checkout session has no subscription");

    await this.handleCheckoutCompleted(session);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {}, requestOptions);
    await this.handleSubscriptionUpdated(subscription);

    return {
      hasActiveSubscription: await this.checkEntitlement({
        eventTypeId: params.eventTypeId,
        userId: params.userId,
        email: params.email,
      }),
    };
  }

  /**
   * R4.5: Idempotent webhook synchronization for subscription events.
   * Uses stripeSubscriptionId as the unique key to prevent duplicates.
   */
  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    log.info("Processing Stripe webhook", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        log.debug("Unhandled webhook type", { type: event.type });
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const eventTypeId = parseInt(session.metadata?.eventTypeId ?? "0", 10);
    const email = session.metadata?.email ?? "";
    const userId = session.metadata?.userId ? parseInt(session.metadata.userId, 10) : undefined;

    if (!eventTypeId || !email) {
      logFailure({
        category: FAILURE_CATEGORIES.CHECKOUT,
        message: "Missing metadata in checkout session",
        context: { sessionId: session.id },
      });
      return;
    }

    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (!subscriptionId) {
      logFailure({
        category: FAILURE_CATEGORIES.CHECKOUT,
        message: "No subscription in checkout session",
        context: { sessionId: session.id },
      });
      return;
    }
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      log.info("Checkout completed without confirmed payment", { sessionId: session.id });
      return;
    }

    // R4.5: Idempotent — upsert by stripeSubscriptionId
    await prisma.eventSubscription.upsert({
      where: { stripeSubscriptionId: subscriptionId },
      create: {
        eventTypeId,
        email,
        userId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscriptionId,
        status: "active",
      },
      update: {
        email,
        userId,
        stripeCustomerId: session.customer as string,
        status: "active",
      },
    });

    log.info("Subscription created via checkout", { subscriptionId, eventTypeId, email });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const eventTypeId = parseInt(subscription.metadata?.eventTypeId ?? "0", 10);
    if (!eventTypeId) {
      logFailure({
        category: FAILURE_CATEGORIES.SUBSCRIPTION,
        message: "Missing eventTypeId in subscription metadata",
        context: { subscriptionId: subscription.id },
      });
      return;
    }

    const status = this.mapStripeStatus(subscription.status);
    const email = subscription.metadata?.email ?? "";

    await prisma.eventSubscription.upsert({
      where: { stripeSubscriptionId: subscription.id },
      create: {
        eventTypeId,
        email,
        userId: subscription.metadata?.userId ? parseInt(subscription.metadata.userId, 10) : undefined,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionItemId: subscription.items.data[0]?.id,
        status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
      update: {
        status,
        stripeSubscriptionItemId: subscription.items.data[0]?.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
    });

    log.info("Subscription updated", { subscriptionId: subscription.id, status });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    await prisma.eventSubscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: { status: "expired", canceledAt: new Date() },
    });

    log.info("Subscription deleted/expired", { subscriptionId: subscription.id });
  }

  private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
    switch (stripeStatus) {
      case "active":
        return "active";
      case "past_due":
        return "past_due";
      case "canceled":
        return "canceled";
      case "trialing":
        return "trialing";
      default:
        return "expired";
    }
  }

  async getEventTypeSubscriptionConfig(eventTypeId: number): Promise<{
    requiresSubscription: boolean;
    subscriptionConfig: unknown;
  } | null> {
    return prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: { requiresSubscription: true, subscriptionConfig: true },
    });
  }

  /**
   * R4.7: Check if a user/email has an active subscription for an event type.
   */
  async checkEntitlement(params: { eventTypeId: number; email?: string; userId?: number }): Promise<boolean> {
    const where = {
      eventTypeId: params.eventTypeId,
      status: "active" as const,
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.email ? { email: params.email } : {}),
    };

    const subscription = await prisma.eventSubscription.findFirst({
      where,
      select: { id: true, currentPeriodEnd: true },
    });

    if (!subscription) return false;

    // Check if the subscription period hasn't ended
    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * R4.6: Create a Stripe Customer Portal session for managing subscriptions.
   */
  async createPortalSession(params: {
    eventTypeId: number;
    email: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    const stripe = getStripeClient();
    const { stripeAccount } = await this.getStripeAccountForEventType(params.eventTypeId);

    // Find the Stripe customer ID from existing subscriptions
    const subscription = await prisma.eventSubscription.findFirst({
      where: { eventTypeId: params.eventTypeId, email: params.email, stripeCustomerId: { not: null } },
      select: { stripeCustomerId: true },
    });

    if (!subscription?.stripeCustomerId) {
      throw ErrorWithCode.Factory.NotFound("No Stripe customer found for this email");
    }

    const session = await stripe.billingPortal.sessions.create(
      {
        customer: subscription.stripeCustomerId,
        return_url: params.returnUrl,
      },
      stripeAccount ? { stripeAccount } : undefined
    );

    return { url: session.url };
  }

  /**
   * R4.8: Get the booking window for a user based on subscription status.
   */
  getBookingWindow(params: { subscriptionConfig: unknown; hasActiveSubscription: boolean }): {
    bookingWindowDays: number;
  } {
    const parsedConfig = subscriptionConfigSchema.safeParse(params.subscriptionConfig);
    if (!parsedConfig.success) return { bookingWindowDays: 30 };

    return {
      bookingWindowDays: params.hasActiveSubscription
        ? parsedConfig.data.subscriberBookingWindowDays
        : parsedConfig.data.nonSubscriberBookingWindowDays,
    };
  }
}

export const subscriptionService = new SubscriptionService();
