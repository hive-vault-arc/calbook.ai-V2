import process from "node:process";
import { platformBillingService } from "@calcom/features/billing/lib/PlatformBillingService";
import { getPlatformBillingEnv } from "@calcom/features/billing/lib/platform-billing-env";
import { errorRateTracker } from "@calcom/features/monitoring/lib/errorRateTracker";
import { FAILURE_CATEGORIES, logFailure } from "@calcom/features/monitoring/lib/monitoring";
import logger from "@calcom/lib/logger";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const log = logger.getSubLogger({ prefix: ["stripe-platform-billing-webhook"] });

export async function POST(req: Request): Promise<NextResponse> {
  const { webhookSecret: secret, privateKey: key } = getPlatformBillingEnv(process.env);
  if (!secret || !key) {
    log.error("Stripe platform billing webhook is not configured");
    return NextResponse.json({ message: "Webhook is not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ message: "Missing signature" }, { status: 400 });

  const stripe = new Stripe(key, { apiVersion: "2020-08-27" });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    log.warn("Stripe platform billing webhook signature verification failed", { error });
    return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
  }

  try {
    await platformBillingService.syncWebhook(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    logFailure({
      category: FAILURE_CATEGORIES.WEBHOOK,
      message: "Platform billing webhook handler error",
      error,
      context: { eventId: event.id, eventType: event.type },
    });
    errorRateTracker.recordError("platform-billing-webhook");
    return NextResponse.json({ message: "Webhook handler failed" }, { status: 500 });
  }
}
