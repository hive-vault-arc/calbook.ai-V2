"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import type { ReactElement } from "react";
import { useMemo } from "react";

const startOfToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const endOfToday = (): Date => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
};

const formatInterviewTime = (startTime: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date(startTime));

const formatInterviewDay = (startTime: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(startTime));

const DashboardMetric = ({
  label,
  value,
  description,
}: {
  label: string;
  value?: number;
  description: string;
}): ReactElement => {
  const metricValue = value ?? <SkeletonText className="h-9 w-10" />;

  return (
    <div className="rounded-xl border border-subtle bg-default p-5 shadow-sm">
      <p className="font-medium text-subtle text-xs uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-3 font-cal font-semibold text-3xl text-emphasis">{metricValue}</p>
      <p className="mt-2 text-sm text-subtle">{description}</p>
    </div>
  );
};

export const RecruitingDashboard = ({
  userName,
  workspaceType,
}: {
  userName: string;
  workspaceType: "recruiting" | "scheduling";
}): ReactElement => {
  const { t, i18n } = useLocale();
  const isRecruitingWorkspace = workspaceType === "recruiting";
  const bookingWindow = useMemo(
    () => ({
      now: new Date().toISOString(),
      todayStart: startOfToday().toISOString(),
      todayEnd: endOfToday().toISOString(),
    }),
    []
  );

  const upcomingInterviews = trpc.viewer.bookings.get.useQuery({
    filters: { statuses: ["upcoming"], afterStartDate: bookingWindow.now },
    limit: 5,
    sort: { sortStart: "asc" },
  });
  const todaysInterviews = trpc.viewer.bookings.get.useQuery({
    filters: {
      statuses: ["upcoming"],
      afterStartDate: bookingWindow.todayStart,
      beforeEndDate: bookingWindow.todayEnd,
    },
    limit: 1,
  });
  const interviewsNeedingConfirmation = trpc.viewer.bookings.get.useQuery({
    filters: { statuses: ["unconfirmed"] },
    limit: 1,
  });

  const interviews = upcomingInterviews.data?.bookings ?? [];
  let interviewContent: ReactElement;
  if (upcomingInterviews.isPending) {
    interviewContent = (
      <div className="space-y-4 p-5">
        <SkeletonText className="h-5 w-2/3" />
        <SkeletonText className="h-5 w-1/2" />
        <SkeletonText className="h-5 w-3/4" />
      </div>
    );
  } else if (upcomingInterviews.isError) {
    interviewContent = (
      <div className="px-5 py-12 text-center">
        <p className="font-semibold text-default">{t("something_went_wrong")}</p>
        <Button color="secondary" className="mt-4" onClick={() => upcomingInterviews.refetch()}>
          {t("try_again")}
        </Button>
      </div>
    );
  } else if (interviews.length) {
    interviewContent = (
      <ul className="divide-y divide-subtle">
        {interviews.map((interview) => {
          const candidate = interview.attendees[0];
          return (
            <li key={interview.uid} className="flex items-center gap-4 px-5 py-4">
              <div className="flex w-14 shrink-0 flex-col rounded-lg bg-subtle px-2 py-2 text-center">
                <span className="font-semibold text-emphasis text-xs">
                  {formatInterviewDay(interview.startTime, i18n.language)}
                </span>
                <span className="mt-1 text-subtle text-xs">
                  {formatInterviewTime(interview.startTime, i18n.language)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-default text-sm">{interview.title}</p>
                <p className="mt-1 truncate text-sm text-subtle">
                  {candidate?.name || candidate?.email || t("candidate")}
                </p>
              </div>
              <Button color="secondary" href="/bookings/upcoming" size="sm">
                {t("view")}
              </Button>
            </li>
          );
        })}
      </ul>
    );
  } else {
    interviewContent = (
      <div className="px-5 py-12 text-center">
        <p className="font-semibold text-default">
          {t(isRecruitingWorkspace ? "no_upcoming_interviews" : "no_upcoming_meetings")}
        </p>
        <p className="mt-2 text-sm text-subtle">
          {t(
            isRecruitingWorkspace ? "no_upcoming_interviews_description" : "no_upcoming_meetings_description"
          )}
        </p>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <section className="overflow-hidden rounded-2xl border border-subtle bg-default shadow-sm">
        <div className="border-subtle border-b bg-[radial-gradient(circle_at_top_right,_rgba(139,92,246,0.16),_transparent_42%)] px-6 py-7 md:px-8 md:py-9">
          <div className="max-w-2xl">
            <Badge variant={isRecruitingWorkspace ? "purple" : "gray"} className="mb-4">
              {t(isRecruitingWorkspace ? "recruiting_workspace" : "scheduling_workspace")}
            </Badge>
            <h1 className="font-cal font-semibold text-3xl text-emphasis tracking-tight md:text-4xl">
              {t("welcome_back_name", { name: userName })}
            </h1>
            <p className="mt-3 max-w-xl text-default text-sm leading-6 md:text-base">
              {t(
                isRecruitingWorkspace
                  ? "recruiting_dashboard_description"
                  : "scheduling_dashboard_description"
              )}
            </p>
          </div>
        </div>
        <div className="grid gap-4 bg-subtle p-4 md:grid-cols-3 md:p-6">
          <DashboardMetric
            label={t(isRecruitingWorkspace ? "interviews_today" : "meetings_today")}
            value={todaysInterviews.data?.totalCount}
            description={t(
              isRecruitingWorkspace ? "interviews_today_description" : "meetings_today_description"
            )}
          />
          <DashboardMetric
            label={t(isRecruitingWorkspace ? "upcoming_interviews" : "upcoming_meetings")}
            value={upcomingInterviews.data?.totalCount}
            description={t(
              isRecruitingWorkspace ? "upcoming_interviews_description" : "upcoming_meetings_description"
            )}
          />
          <DashboardMetric
            label={t("needs_confirmation")}
            value={interviewsNeedingConfirmation.data?.totalCount}
            description={t("needs_confirmation_description")}
          />
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-subtle bg-default shadow-sm">
        <div>
          <div className="flex items-center justify-between border-subtle border-b px-5 py-4">
            <div>
              <h2 className="font-cal font-semibold text-emphasis text-lg">
                {t(isRecruitingWorkspace ? "next_interviews" : "next_meetings")}
              </h2>
              <p className="mt-1 text-sm text-subtle">
                {t(isRecruitingWorkspace ? "next_interviews_description" : "next_meetings_description")}
              </p>
            </div>
            <Button color="minimal" href="/bookings/upcoming">
              {t("view_all")}
            </Button>
          </div>
          {interviewContent}
        </div>
      </section>
    </main>
  );
};
