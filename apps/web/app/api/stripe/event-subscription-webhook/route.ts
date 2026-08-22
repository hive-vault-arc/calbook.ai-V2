import process from "node:process";
import { subscriptionService } from "@calcom/features/subscriptions/lib/SubscriptionService";
import logger from "@calcom/lib/logger";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const log = logger.getSubLogger({ prefix: ["stripe-subscription-webhook"] });

/**
 * R4.5: Stripe webhook for per-event-type subscription events.
 * Handles checkout.session.completed, customer.subscription.created/updated/deleted.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const stripeSecret = process.env.STRIPE_PRIVATE_KEY;
  const webhookSecret = process.env.STRIPE_EVENT_SUBSCRIPTION_WEBHOOK_SECRET;

  if (!stripeSecret || !webhookSecret) {
    log.warn("Stripe subscription webhook is disabled");
    return new NextResponse(null, { status: 204 });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2020-08-27" });
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ message: "Missing signature" }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    log.error("Webhook signature verification failed", err);
    return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
  }

  try {
    await subscriptionService.handleStripeWebhook(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    log.error("Webhook handler error", { type: event.type, error: err });
    return NextResponse.json({ message: "Webhook handler failed" }, { status: 500 });
  }
}
