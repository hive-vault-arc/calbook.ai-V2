import process from "node:process";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import Stripe from "stripe";

const log = logger.getSubLogger({ prefix: ["subscription-service"] });

export type SubscriptionStatus = "active" | "past_due" | "canceled" | "expired" | "trialing";

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_PRIVATE_KEY;
  if (!key) {
    throw new Error("STRIPE_PRIVATE_KEY is not configured");
  }
  return new Stripe(key, { apiVersion: "2020-08-27" });
}

export class SubscriptionService {
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

    const eventType = await prisma.eventType.findUnique({
      where: { id: params.eventTypeId },
      select: {
        id: true,
        title: true,
        requiresSubscription: true,
        stripeSubscriptionPriceId: true,
        users: { select: { id: true, stripeCustomerId: true } },
      },
    });

    if (!eventType || !eventType.requiresSubscription) {
      throw new Error("Event type does not require subscription");
    }

    if (!eventType.stripeSubscriptionPriceId) {
      throw new Error("Event type has no Stripe subscription price configured");
    }

    const session = await stripe.checkout.sessions.create({
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
    });

    log.info("Created subscription checkout session", {
      eventTypeId: params.eventTypeId,
      email: params.email,
      sessionId: session.id,
    });

    return { url: session.url ?? "" };
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
      log.error("Missing metadata in checkout session", { sessionId: session.id });
      return;
    }

    const subscriptionId = session.subscription as string;
    if (!subscriptionId) {
      log.error("No subscription in checkout session", { sessionId: session.id });
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
      log.error("Missing eventTypeId in subscription metadata", { subscriptionId: subscription.id });
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

  /**
   * R4.7: Check if a user/email has an active subscription for an event type.
   */
  async checkEntitlement(params: { eventTypeId: number; email?: string; userId?: number }): Promise<boolean> {
    const where = {
      eventTypeId: params.eventTypeId,
      status: "active" as const,
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.email && !params.userId ? { email: params.email } : {}),
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
  async createPortalSession(params: { email: string; returnUrl: string }): Promise<{ url: string }> {
    const stripe = getStripeClient();

    // Find the Stripe customer ID from existing subscriptions
    const subscription = await prisma.eventSubscription.findFirst({
      where: { email: params.email, stripeCustomerId: { not: null } },
      select: { stripeCustomerId: true },
    });

    if (!subscription?.stripeCustomerId) {
      throw new Error("No Stripe customer found for this email");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: params.returnUrl,
    });

    return { url: session.url };
  }

  /**
   * R4.8: Get the booking window for a user based on subscription status.
   */
  getBookingWindow(params: { subscriptionConfig: unknown; hasActiveSubscription: boolean }): {
    bookingWindowDays: number;
  } {
    const config = params.subscriptionConfig as
      | { subscriberBookingWindowDays?: number; nonSubscriberBookingWindowDays?: number }
      | null
      | undefined;

    const defaultWindow = 30;
    if (!config) return { bookingWindowDays: defaultWindow };

    if (params.hasActiveSubscription) {
      return { bookingWindowDays: config.subscriberBookingWindowDays ?? defaultWindow };
    }
    return { bookingWindowDays: config.nonSubscriberBookingWindowDays ?? defaultWindow };
  }
}

export const subscriptionService = new SubscriptionService();
