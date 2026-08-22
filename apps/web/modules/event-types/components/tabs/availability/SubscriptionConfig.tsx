"use client";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Label, Select, Switch, TextField } from "@calcom/ui/components/form";
import { useFlags } from "@calcom/web/modules/feature-flags/hooks/useFlags";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

type SubscriptionInterval = "month" | "year";

export function SubscriptionConfig(): JSX.Element {
  const { t } = useLocale();
  const flags = useFlags();
  if (flags["event-subscriptions"] === false) return <></>;
  const intervalOptions = [
    { value: "month" as const, label: t("monthly") },
    { value: "year" as const, label: t("yearly") },
  ];
  const { register, setValue, watch } = useFormContext<FormValues>();
  const [amount, setAmount] = useState("25");
  const [currency, setCurrency] = useState("USD");
  const [interval, setInterval] = useState<SubscriptionInterval>("month");
  const eventTypeId = watch("id");
  const requiresSubscription = watch("requiresSubscription");
  const stripeConfiguration = trpc.viewer.subscriptions.getConfiguration.useQuery();
  const priceId = watch("stripeSubscriptionPriceId");
  const configurePrice = trpc.viewer.subscriptions.configurePrice.useMutation({
    onSuccess: ({ priceId }) => {
      setValue("stripeSubscriptionPriceId", priceId, { shouldDirty: true, shouldValidate: true });
    },
  });
  const amountInMinorUnits = Math.round(Number(amount) * 100);
  const canConfigurePrice =
    stripeConfiguration.data?.isConfigured === true &&
    Number.isFinite(amountInMinorUnits) &&
    amountInMinorUnits >= 50;

  return (
    <div className="rounded-lg border border-subtle p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label className="mb-1 font-semibold text-sm">{t("subscription_calendar")}</Label>
          <p className="text-sm text-subtle">{t("subscription_calendar_description")}</p>
          {stripeConfiguration.data?.isConfigured === false && (
            <p className="mt-1 text-sm text-warning">{t("stripe_api_key_required")}</p>
          )}
        </div>
        <Switch
          checked={requiresSubscription}
          disabled={stripeConfiguration.data?.isConfigured === false}
          onCheckedChange={(checked): void =>
            setValue("requiresSubscription", checked, { shouldDirty: true, shouldValidate: true })
          }
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <TextField
          type="number"
          min={0.5}
          step={0.01}
          label={t("subscription_price")}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <TextField
          maxLength={3}
          label={t("currency")}
          value={currency}
          onChange={(event) => setCurrency(event.target.value.toUpperCase())}
        />
        <div>
          <Label>{t("billing_interval")}</Label>
          <Select
            options={intervalOptions}
            value={intervalOptions.find((option) => option.value === interval)}
            onChange={(option) => option && setInterval(option.value)}
            isSearchable={false}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Button
          type="button"
          color="secondary"
          disabled={!canConfigurePrice || currency.length !== 3}
          loading={configurePrice.isPending}
          onClick={() =>
            configurePrice.mutate({
              eventTypeId,
              amount: amountInMinorUnits,
              currency,
              interval,
            })
          }>
          {priceId ? t("replace_subscription_price") : t("create_subscription_price")}
        </Button>
        {priceId && <span className="text-sm text-subtle">{t("subscription_price_configured")}</span>}
        {configurePrice.error && <span className="text-error text-sm">{configurePrice.error.message}</span>}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
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
