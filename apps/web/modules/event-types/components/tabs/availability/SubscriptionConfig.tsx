"use client";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Label, Switch, TextField } from "@calcom/ui/components/form";
import { useFormContext } from "react-hook-form";

export function SubscriptionConfig() {
  const { t } = useLocale();
  const { register, setValue, watch } = useFormContext<FormValues>();
  const requiresSubscription = watch("requiresSubscription");

  return (
    <div className="rounded-lg border border-subtle p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label className="mb-1 font-semibold text-sm">{t("subscription_calendar")}</Label>
          <p className="text-sm text-subtle">{t("subscription_calendar_description")}</p>
        </div>
        <Switch
          checked={requiresSubscription}
          onCheckedChange={(checked) =>
            setValue("requiresSubscription", checked, { shouldDirty: true, shouldValidate: true })
          }
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <TextField
          label={t("stripe_subscription_price_id")}
          placeholder="price_..."
          disabled={!requiresSubscription}
          {...register("stripeSubscriptionPriceId")}
        />
        <TextField
          type="number"
          min={1}
          max={365}
          label={t("subscriber_booking_window_days")}
          {...register("subscriptionConfig.subscriberBookingWindowDays", { valueAsNumber: true })}
        />
        <TextField
          type="number"
          min={1}
          max={365}
          label={t("non_subscriber_booking_window_days")}
          {...register("subscriptionConfig.nonSubscriberBookingWindowDays", { valueAsNumber: true })}
        />
      </div>
    </div>
  );
}
