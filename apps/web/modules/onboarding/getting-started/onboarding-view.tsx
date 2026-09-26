"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import type { IconName } from "@calcom/ui/components/icon";
import { RadioAreaGroup } from "@calcom/ui/components/radio";
import { showToast } from "@calcom/ui/components/toast";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useRef, useState, useTransition } from "react";
import { OnboardingCard } from "../components/OnboardingCard";
import { OnboardingLayout } from "../components/OnboardingLayout";
import { OnboardingContinuationPrompt } from "../components/onboarding-continuation-prompt";
import { PlanIcon } from "../components/plan-icon";
import { type PlanType, useOnboardingStore } from "../store/onboarding-store";

type OnboardingViewProps = {
  userEmail: string;
};

export const OnboardingView = ({ userEmail }: OnboardingViewProps) => {
  const router = useRouter();
  const { t } = useLocale();
  const { selectedPlan, setSelectedPlan, resetOnboardingPreservingPlan } = useOnboardingStore();
  const [workspaceType, setWorkspaceType] = useState<"recruiting" | "scheduling" | null>(null);
  const { data: user } = useMeQuery();
  const previousPlanRef = useRef<PlanType | null>(null);
  const [isPending, startTransition] = useTransition();
  const updateProfile = trpc.viewer.me.updateProfile.useMutation({
    onError: () => showToast(t("something_went_wrong"), "error"),
  });
  const hasTeamMembership = false;
  const isPendingMembership = false;

  useEffect(() => {
    if (!workspaceType && user?.workspaceType) setWorkspaceType(user.workspaceType);
  }, [user?.workspaceType, workspaceType]);

  // Reset onboarding data when visiting this page, but preserve the selected plan
  useEffect(() => {
    resetOnboardingPreservingPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetOnboardingPreservingPlan]);

  // If user has any team membership (pending or accepted), redirect them directly to personal onboarding
  // This handles the case where users sign up with an invite token (membership is auto-accepted)
  useEffect(() => {
    if (!isPendingMembership && hasTeamMembership) {
      setSelectedPlan("personal");
      startTransition(() => {
        router.push("/onboarding/personal/settings");
      });
    }
  }, [isPendingMembership, hasTeamMembership, router, setSelectedPlan]);

  // Plan order mapping for determining direction
  const planOrder: Record<PlanType, number> = {
    personal: 0,
    team: 1,
    organization: 2,
  };

  // Calculate animation direction synchronously
  const getDirection = (): "up" | "down" => {
    if (!selectedPlan || !previousPlanRef.current) return "down";
    const previousOrder = planOrder[previousPlanRef.current];
    const currentOrder = planOrder[selectedPlan];
    return currentOrder > previousOrder ? "up" : "down";
  };

  const direction = getDirection();

  // Update previous plan ref after render
  useEffect(() => {
    previousPlanRef.current = selectedPlan;
  }, [selectedPlan]);

  const handleContinue = async () => {
    if (!workspaceType) return;

    await updateProfile.mutateAsync({ metadata: { workspaceType } });

    if (selectedPlan) {
      posthog.capture("onboarding_plan_continue_clicked", {
        plan_type: selectedPlan,
        workspace_type: workspaceType,
      });
    }
    startTransition(() => {
      if (selectedPlan === "organization") {
        router.push("/onboarding/organization/details");
      } else if (selectedPlan === "team") {
        router.push("/onboarding/teams/details");
      } else if (selectedPlan === "personal") {
        router.push("/onboarding/personal/settings");
      }
    });
  };

  const planIconByType: Record<PlanType, IconName> = {
    personal: "user",
    team: "user",
    organization: "users",
  };

  const allPlans = [
    {
      id: "personal" as PlanType,
      title: t("onboarding_plan_personal_title"),
      badge: t("onboarding_plan_personal_badge"),
      description: t("onboarding_plan_personal_description"),
      icon: planIconByType.personal,
      variant: "single" as const,
    },
    {
      id: "team" as PlanType,
      title: t("onboarding_plan_team_title"),
      badge: t("onboarding_plan_team_badge"),
      description: t("onboarding_plan_team_description"),
      icon: planIconByType.team,
      variant: "team" as const,
    },
    {
      id: "organization" as PlanType,
      title: t("onboarding_plan_organization_title"),
      badge: t("onboarding_plan_organization_badge"),
      description: t("onboarding_plan_organization_description"),
      icon: planIconByType.organization,
      variant: "organization" as const,
    },
  ];

  // Only show organization plan for company emails
  const plans = allPlans.filter((plan) => {
    if (plan.id === "organization") {
      return false;
    }
    return true;
  });

  const selectedPlanData = plans.find((plan) => plan.id === selectedPlan);

  // Show loading state while checking for team membership or if redirecting
  if (isPendingMembership || hasTeamMembership) {
    return (
      <OnboardingLayout userEmail={userEmail}>
        <OnboardingCard title={t("loading")} subtitle="" />
      </OnboardingLayout>
    );
  }

  return (
    <>
      <OnboardingContinuationPrompt />
      <OnboardingLayout userEmail={userEmail}>
        {/* Left column - Main content */}
        <OnboardingCard
          title={t("onboarding_select_plan")}
          subtitle={t("onboarding_welcome_question")}
          footer={
            <div className="flex w-full justify-end gap-2">
              <Button
                data-testid="onboarding-continue-btn"
                color="primary"
                className="rounded-[10px]"
                onClick={handleContinue}
                disabled={isPending || updateProfile.isPending || !workspaceType}>
                {isPending || updateProfile.isPending ? t("loading") : t("continue")}
              </Button>
            </div>
          }>
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-semibold text-emphasis text-sm">{t("onboarding_workspace_title")}</p>
              <p className="mt-1 text-sm text-subtle">{t("onboarding_workspace_description")}</p>
            </div>
            <RadioAreaGroup.Group
              value={workspaceType ?? undefined}
              onValueChange={(value) => {
                const nextWorkspaceType = value as "recruiting" | "scheduling";
                setWorkspaceType(nextWorkspaceType);
                posthog.capture("onboarding_workspace_selected", { workspace_type: nextWorkspaceType });
              }}
              className="grid w-full gap-2 sm:grid-cols-2">
              <RadioAreaGroup.Item
                value="recruiting"
                className={classNames(
                  "relative overflow-hidden rounded-xl border bg-default transition",
                  workspaceType === "recruiting" ? "border-emphasis shadow-sm" : "border-subtle",
                  "[&>button]:top-4 [&>button]:right-4"
                )}
                classNames={{ container: "flex min-h-32 w-full flex-col gap-2 p-4 pr-10" }}>
                <Badge variant="purple" size="sm" className="w-fit rounded-md">
                  {t("onboarding_workspace_recruiting_badge")}
                </Badge>
                <p className="font-semibold text-emphasis text-sm">
                  {t("onboarding_workspace_recruiting_title")}
                </p>
                <p className="text-sm text-subtle">{t("onboarding_workspace_recruiting_description")}</p>
              </RadioAreaGroup.Item>
              <RadioAreaGroup.Item
                value="scheduling"
                className={classNames(
                  "relative overflow-hidden rounded-xl border bg-default transition",
                  workspaceType === "scheduling" ? "border-emphasis shadow-sm" : "border-subtle",
                  "[&>button]:top-4 [&>button]:right-4"
                )}
                classNames={{ container: "flex min-h-32 w-full flex-col gap-2 p-4 pr-10" }}>
                <Badge variant="gray" size="sm" className="w-fit rounded-md">
                  {t("onboarding_workspace_scheduling_badge")}
                </Badge>
                <p className="font-semibold text-emphasis text-sm">
                  {t("onboarding_workspace_scheduling_title")}
                </p>
                <p className="text-sm text-subtle">{t("onboarding_workspace_scheduling_description")}</p>
              </RadioAreaGroup.Item>
            </RadioAreaGroup.Group>
          </div>

          <div className="relative mt-6 flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-muted bg-cal-muted p-1">
            <div className="flex w-full flex-col items-start overflow-clip rounded-inherit">
              {/* Plan options */}
              <RadioAreaGroup.Group
                value={selectedPlan ?? undefined}
                onValueChange={(value) => {
                  const planType = value as PlanType;
                  setSelectedPlan(planType);
                  posthog.capture("onboarding_plan_selected", {
                    plan_type: planType,
                  });
                }}
                className="flex w-full flex-col gap-1 rounded-[10px]">
                {plans.map((plan) => {
                  const isSelected = selectedPlan === plan.id;

                  return (
                    <RadioAreaGroup.Item
                      key={plan.id}
                      value={plan.id}
                      className={classNames(
                        "relative flex items-center overflow-hidden rounded-[10px] border bg-default transition",
                        isSelected ? "border-emphasis shadow-sm" : "border-subtle",
                        "pr-12 [&>button]:right-6 [&>button]:left-auto [&>button]:mt-0 [&>button]:transform"
                      )}
                      classNames={{
                        container: "flex w-full items-center gap-3 p-5 pr-12",
                      }}>
                      <div className="flex w-full flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-1">
                          <p className="font-semibold text-emphasis text-sm leading-4">{plan.title}</p>
                          <Badge
                            variant="gray"
                            size="md"
                            className="hidden h-4 rounded-md px-1 py-1 md:flex md:items-center">
                            <span className="font-medium text-emphasis text-xs leading-3">{plan.badge}</span>
                          </Badge>
                        </div>
                        <Badge variant="gray" size="md" className="h-4 w-fit rounded-md px-1 py-1 md:hidden">
                          <span className="font-medium text-emphasis text-xs leading-3">{plan.badge}</span>
                        </Badge>
                        <p className="max-w-full font-medium text-sm text-subtle leading-[1.25]">
                          {plan.description}
                        </p>
                      </div>
                    </RadioAreaGroup.Item>
                  );
                })}
              </RadioAreaGroup.Group>
            </div>
          </div>
        </OnboardingCard>

        {/* Right column - Icon display */}
        <div className="hidden h-full w-full rounded-l-2xl border-subtle border-t border-b border-l bg-cal-muted xl:flex xl:items-center xl:justify-center">
          <AnimatePresence mode="wait">
            {selectedPlanData && (
              <PlanIcon
                key={selectedPlan}
                icon={selectedPlanData.icon}
                variant={selectedPlanData.variant}
                animationDirection={direction}
              />
            )}
          </AnimatePresence>
        </div>
      </OnboardingLayout>
    </>
  );
};
