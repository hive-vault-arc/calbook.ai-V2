import process from "node:process";
import { platformBillingService } from "@calcom/features/billing/lib/PlatformBillingService";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request): Promise<NextResponse> {
  const secret = process.env.STRIPE_PLATFORM_BILLING_WEBHOOK_SECRET;
  const key = process.env.STRIPE_PRIVATE_KEY;
  if (!secret || !key) return new NextResponse(null, { status: 204 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ message: "Missing signature" }, { status: 400 });
  const stripe = new Stripe(key, { apiVersion: "2020-08-27" });
  try {
    const event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
    await platformBillingService.syncWebhook(event);
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ message: "Invalid or failed webhook" }, { status: 400 });
  }
}
