import { z } from "zod";

export const subscriptionConfigSchema = z
  .object({
    subscriberBookingWindowDays: z.number().int().min(1).max(365),
    nonSubscriberBookingWindowDays: z.number().int().min(1).max(365),
  })
  .refine(
    ({ subscriberBookingWindowDays, nonSubscriberBookingWindowDays }) =>
      subscriberBookingWindowDays >= nonSubscriberBookingWindowDays,
    { message: "Subscriber booking window must be at least the non-subscriber booking window" }
  );

export type SubscriptionConfig = z.infer<typeof subscriptionConfigSchema>;
