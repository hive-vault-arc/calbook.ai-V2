"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import type { ReactElement } from "react";

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

export const RecruitingDashboard = ({ userName }: { userName: string }): ReactElement => {
  const { t, i18n } = useLocale();
  const todayStart = startOfToday().toISOString();
  const todayEnd = endOfToday().toISOString();
  const now = new Date().toISOString();

  const upcomingInterviews = trpc.viewer.bookings.get.useQuery({
    filters: { statuses: ["upcoming"], afterStartDate: now },
    limit: 5,
    sort: { sortStart: "asc" },
  });
  const todaysInterviews = trpc.viewer.bookings.get.useQuery({
    filters: { statuses: ["upcoming"], afterStartDate: todayStart, beforeEndDate: todayEnd },
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
        <p className="font-semibold text-default">{t("no_upcoming_interviews")}</p>
        <p className="mt-2 text-sm text-subtle">{t("no_upcoming_interviews_description")}</p>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <section className="overflow-hidden rounded-2xl border border-subtle bg-default shadow-sm">
        <div className="border-subtle border-b bg-[radial-gradient(circle_at_top_right,_rgba(139,92,246,0.16),_transparent_42%)] px-6 py-7 md:px-8 md:py-9">
          <div className="max-w-2xl">
            <Badge variant="purple" className="mb-4">
              {t("recruiting_workspace")}
            </Badge>
            <h1 className="font-cal font-semibold text-3xl text-emphasis tracking-tight md:text-4xl">
              {t("welcome_back_name", { name: userName })}
            </h1>
            <p className="mt-3 max-w-xl text-default text-sm leading-6 md:text-base">
              {t("recruiting_dashboard_description")}
            </p>
          </div>
        </div>
        <div className="grid gap-4 bg-subtle p-4 md:grid-cols-3 md:p-6">
          <DashboardMetric
            label={t("interviews_today")}
            value={todaysInterviews.data?.totalCount}
            description={t("interviews_today_description")}
          />
          <DashboardMetric
            label={t("upcoming_interviews")}
            value={upcomingInterviews.data?.totalCount}
            description={t("upcoming_interviews_description")}
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
              <h2 className="font-cal font-semibold text-emphasis text-lg">{t("next_interviews")}</h2>
              <p className="mt-1 text-sm text-subtle">{t("next_interviews_description")}</p>
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
