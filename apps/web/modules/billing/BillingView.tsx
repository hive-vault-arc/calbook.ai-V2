"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

type BillingViewProps = {
  teamId: number | null;
  teamName: string | null;
};

type BillingInterval = "month" | "year";

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function BillingSkeleton(): JSX.Element {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-[32rem] animate-pulse rounded-2xl bg-subtle" />
      ))}
    </div>
  );
}

export function BillingView({ teamId, teamName }: BillingViewProps): JSX.Element {
  const { t } = useLocale();
  const [interval, setInterval] = useState<BillingInterval>("month");
  const queryTeamId = teamId ?? 0;
  const plansQuery = trpc.viewer.billing.plans.useQuery();
  const currentPlanQuery = trpc.viewer.billing.currentPlan.useQuery(
    { teamId: queryTeamId },
    { enabled: Boolean(teamId) }
  );
  const checkoutMutation = trpc.viewer.billing.createCheckout.useMutation({
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (error) => showToast(error.message, "error"),
  });
  const portalMutation = trpc.viewer.billing.createPortal.useMutation({
    onSuccess: (url) => window.location.assign(url),
    onError: (error) => showToast(error.message, "error"),
  });

  const storedPlan = currentPlanQuery.data?.plan;
  const currentPlanId = storedPlan === "pro" || storedPlan === "enterprise" ? storedPlan : "free";
  const hasPaidAccess = currentPlanId !== "free";
  const hasSubscription = Boolean(currentPlanQuery.data?.subscriptionId);

  return (
    <SettingsHeader
      title={t("billing_and_plans")}
      description={t("billing_and_plans_description")}
      borderInShellHeader>
      <div className="border-subtle border-x border-b bg-default px-4 py-6 sm:px-6 sm:py-8">
        {!teamId ? (
          <div className="mx-auto max-w-xl py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-subtle text-brand-default">
              <Icon name="credit-card" className="h-5 w-5" />
            </span>
            <h2 className="mt-5 font-cal text-2xl text-emphasis">{t("billing_owner_required")}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-subtle">
              {t("billing_owner_required_description")}
            </p>
            <Button className="mt-6" href="/onboarding">
              {t("create_workspace")}
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-col gap-5 rounded-2xl border border-brand-subtle bg-brand-subtle p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-default">
                  {teamName ?? t("your_organization")}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h2 className="font-cal text-2xl text-emphasis">
                    {t("billing_current_plan", { plan: t(`billing_plan_${currentPlanId}`) })}
                  </h2>
                  {currentPlanQuery.data?.overdue ? (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                      {t("payment_attention_required")}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-subtle">
                  {currentPlanQuery.data?.isTrial
                    ? t("billing_trial_status", {
                        date: currentPlanQuery.data.trialEndsAt
                          ? new Date(currentPlanQuery.data.trialEndsAt).toLocaleDateString()
                          : "",
                      })
                    : hasPaidAccess
                      ? t("billing_paid_plan_status")
                      : t("billing_free_plan_status")}
                </p>
              </div>
              {hasSubscription ? (
                <Button
                  color="secondary"
                  EndIcon="external-link"
                  loading={portalMutation.isPending}
                  onClick={() => portalMutation.mutate({ teamId })}>
                  {t("change_or_cancel_plan")}
                </Button>
              ) : null}
            </div>

            <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-cal text-3xl text-emphasis">{t("choose_your_plan")}</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-subtle">
                  {t("choose_your_plan_description")}
                </p>
              </div>
              <div className="inline-flex w-fit rounded-full border border-subtle bg-subtle p-1" role="group">
                {(["month", "year"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={interval === option}
                    onClick={() => setInterval(option)}
                    className={`min-h-9 rounded-full px-4 text-sm font-semibold transition ${
                      interval === option
                        ? "bg-default text-emphasis shadow-sm"
                        : "text-subtle hover:text-emphasis"
                    }`}>
                    {option === "month" ? t("monthly") : t("annually")}
                  </button>
                ))}
              </div>
            </div>

            {plansQuery.isPending ? (
              <BillingSkeleton />
            ) : (
              <div className="grid items-stretch gap-4 lg:grid-cols-3">
                {plansQuery.data?.map((plan) => {
                  const isPro = plan.id === "pro";
                  const isCurrent = currentPlanId === plan.id && !currentPlanQuery.data?.isTrial;
                  const priceCents = interval === "month" ? plan.monthlyPriceCents : plan.annualPriceCents;
                  const checkoutAvailable =
                    interval === "month" ? plan.monthlyAvailable : plan.annualAvailable;
                  const canCheckout = plan.id !== "free" && plan.id !== "enterprise" && checkoutAvailable;
                  const startCheckout = (): void => {
                    if (plan.id !== "pro" && plan.id !== "enterprise") return;
                    checkoutMutation.mutate({ teamId, planId: plan.id, interval });
                  };

                  return (
                    <article
                      key={plan.id}
                      className={`relative flex min-h-[32rem] flex-col overflow-hidden rounded-2xl border bg-default p-6 ${
                        isPro
                          ? "border-brand-default shadow-[0_20px_60px_-36px_rgba(124,58,237,0.8)]"
                          : "border-subtle"
                      }`}>
                      {isPro ? <div className="absolute inset-x-0 top-0 h-1 bg-brand-default" /> : null}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-cal text-2xl text-emphasis">{t(`billing_plan_${plan.id}`)}</p>
                          <p className="mt-2 min-h-10 text-sm leading-5 text-subtle">
                            {t(`billing_plan_${plan.id}_description`)}
                          </p>
                        </div>
                        {isPro ? (
                          <span className="rounded-full bg-brand-subtle px-3 py-1 text-xs font-semibold text-brand-default">
                            {t("recommended")}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-7 border-b border-subtle pb-7">
                        {priceCents === null ? (
                          <p className="font-cal text-4xl text-emphasis">{t("custom_pricing")}</p>
                        ) : (
                          <div className="flex items-end gap-2">
                            <p className="font-cal text-5xl text-emphasis">{formatPrice(priceCents)}</p>
                            <p className="pb-1 text-sm text-subtle">
                              /{interval === "month" ? t("month") : t("year")}
                            </p>
                          </div>
                        )}
                        {plan.id === "pro" && interval === "year" ? (
                          <p className="mt-2 text-sm font-medium text-brand-default">
                            {t("billing_annual_savings")}
                          </p>
                        ) : null}
                      </div>

                      <ul className="mt-6 flex-1 space-y-4">
                        {plan.features.map((feature) => (
                          <li key={feature.key} className="flex gap-3">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-brand-default">
                              <Icon name="check" className="h-3 w-3" />
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-emphasis">{t(feature.titleKey)}</p>
                              <p className="mt-1 text-xs leading-5 text-subtle">
                                {t(feature.descriptionKey)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-7">
                        {isCurrent ? (
                          <Button className="w-full justify-center" color="secondary" disabled>
                            {t("current_plan")}
                          </Button>
                        ) : canCheckout ? (
                          <Button
                            className="w-full justify-center"
                            color={isPro ? "primary" : "secondary"}
                            loading={checkoutMutation.isPending}
                            onClick={startCheckout}>
                            {t("choose_plan", { plan: t(`billing_plan_${plan.id}`) })}
                          </Button>
                        ) : plan.id === "enterprise" ? (
                          <Button
                            className="w-full justify-center"
                            color="secondary"
                            href={`mailto:${SUPPORT_MAIL_ADDRESS}?subject=CalBook.ai Enterprise`}>
                            {t("contact_sales")}
                          </Button>
                        ) : (
                          <Button className="w-full justify-center" color="secondary" disabled>
                            {t("plan_unavailable")}
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </SettingsHeader>
  );
}
