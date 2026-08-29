"use client";

import { InstallAppButton } from "@calcom/app-store/InstallAppButton";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ShellSubHeading } from "@calcom/ui/components/layout";
import { List } from "@calcom/ui/components/list";
import { showToast } from "@calcom/ui/components/toast";
import { revalidateSettingsCalendars } from "@calcom/web/app/cache/path/settings/my-account";
import AppListCardWebWrapper from "@calcom/web/modules/apps/components/AppListCardWebWrapper";
import { SkeletonLoader } from "@calcom/web/modules/apps/components/SkeletonLoader";
import { SelectedCalendarsSettingsWebWrapper } from "@calcom/web/modules/calendars/components/SelectedCalendarsSettingsWebWrapper";
import SubHeadingTitleWithConnections from "@components/integrations/SubHeadingTitleWithConnections";
import useRouterQuery from "@lib/hooks/useRouterQuery";
import { QueryCell } from "@lib/QueryCell";
import { Suspense, useEffect } from "react";
import { DestinationCalendarSettingsWebWrapper } from "./DestinationCalendarSettingsWebWrapper";
import { getGoogleCalendarReadiness } from "./lib/getGoogleCalendarReadiness";

type CalendarListContainerProps = {
  connectedCalendars: RouterOutputs["viewer"]["calendars"]["connectedCalendars"];
  installedCalendars: RouterOutputs["viewer"]["apps"]["integrations"];
  googleCalendarConfigured: boolean;
  heading?: boolean;
  fromOnboarding?: boolean;
};

type Props = {
  onChanged: () => unknown | Promise<unknown>;
  fromOnboarding?: boolean;
  destinationCalendarId?: string;
  isPending?: boolean;
};

function CalendarList(props: Props): JSX.Element {
  const { t } = useLocale();
  const query = trpc.viewer.apps.integrations.useQuery({ variant: "calendar", onlyInstalled: false });

  return (
    <QueryCell
      query={query}
      success={({ data }) => (
        <List>
          {data.items.map((item) => (
            <AppListCardWebWrapper
              title={item.name}
              key={item.name}
              logo={item.logo}
              description={item.description}
              shouldHighlight
              slug={item.slug}
              actions={
                <InstallAppButton
                  type={item.type}
                  render={(buttonProps) => (
                    <Button color="secondary" {...buttonProps}>
                      {t("connect")}
                    </Button>
                  )}
                  onChanged={() => props.onChanged()}
                />
              }
            />
          ))}
        </List>
      )}
    />
  );
}

const AddCalendarButton = (): JSX.Element => {
  const { t } = useLocale();
  return (
    <Button color="secondary" StartIcon="plus" href="/apps/categories/calendar">
      {t("add_calendar")}
    </Button>
  );
};

export const CalendarListContainerSkeletonLoader = (): JSX.Element => {
  const { t } = useLocale();
  return (
    <SettingsHeader
      title={t("calendars")}
      description={t("calendars_description")}
      CTA={<AddCalendarButton />}>
      <SkeletonLoader />
    </SettingsHeader>
  );
};

export function CalendarListContainer({
  connectedCalendars: data,
  installedCalendars,
  googleCalendarConfigured,
  heading = true,
  fromOnboarding,
}: CalendarListContainerProps): JSX.Element {
  const { t } = useLocale();
  const { error, setQuery: setError } = useRouterQuery("error");

  useEffect(() => {
    if (error === "account_already_linked" || error === "no_default_calendar") {
      showToast(t(error), "error", { id: error });
      setError(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const utils = trpc.useUtils();
  const onChanged = (): void => {
    Promise.allSettled([
      utils.viewer.apps.integrations.invalidate(
        { variant: "calendar", onlyInstalled: true },
        {
          exact: true,
        }
      ),
      utils.viewer.calendars.connectedCalendars.invalidate(),
      revalidateSettingsCalendars(),
    ]);
  };
  const mutation = trpc.viewer.calendars.setDestinationCalendar.useMutation({
    onSuccess: () => {
      utils.viewer.calendars.connectedCalendars.invalidate();
      revalidateSettingsCalendars();
    },
  });
  const googleCalendarReadiness = getGoogleCalendarReadiness({
    googleCalendarConfigured,
    connectedCalendarCount: data.connectedCalendars.length,
  });

  let content = null;
  if (!!data.connectedCalendars.length || !!installedCalendars?.items.length) {
    let headingContent = null;
    if (heading) {
      headingContent = (
        <>
          <DestinationCalendarSettingsWebWrapper connectedCalendars={data} />
          <Suspense fallback={<SkeletonLoader />}>
            <SelectedCalendarsSettingsWebWrapper
              onChanged={onChanged}
              fromOnboarding={fromOnboarding}
              destinationCalendarId={data.destinationCalendar?.externalId}
              isPending={mutation.isPending}
              connectedCalendars={data}
            />
          </Suspense>
        </>
      );
    }
    content = headingContent;
  } else if (fromOnboarding) {
    content = (
      <>
        {!!data?.connectedCalendars.length && (
          <ShellSubHeading
            className="mt-4"
            title={<SubHeadingTitleWithConnections title={t("connect_additional_calendar")} />}
          />
        )}
        <CalendarList onChanged={onChanged} />
      </>
    );
  } else {
    content = (
      <div className="space-y-4">
        <section className="border-subtle bg-default overflow-hidden rounded-xl border">
          <div className="border-subtle flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-subtle text-xs font-medium uppercase tracking-wide">
                {t("calendar_connection_status")}
              </p>
              <h2 className="text-emphasis mt-1 text-lg font-semibold">
                {googleCalendarReadiness === "needsPlatformSetup"
                  ? t("google_calendar_setup_required")
                  : t("google_calendar_ready")}
              </h2>
              <p className="text-subtle mt-2 text-sm">
                {googleCalendarReadiness === "needsPlatformSetup"
                  ? t("google_calendar_setup_required_description")
                  : t("google_calendar_ready_description")}
              </p>
            </div>
            <Badge variant={googleCalendarReadiness === "needsPlatformSetup" ? "orange" : "green"}>
              {googleCalendarReadiness === "needsPlatformSetup"
                ? t("calendar_setup_required")
                : t("calendar_ready_to_connect")}
            </Badge>
          </div>

          <ol className="grid gap-px bg-subtle sm:grid-cols-3">
            <li className="bg-default p-5">
              <p className="text-muted text-xs font-medium">1 · {t("calendar_platform_access")}</p>
              <p className="text-emphasis mt-2 text-sm font-medium">
                {googleCalendarReadiness === "needsPlatformSetup"
                  ? t("calendar_platform_access_missing")
                  : t("calendar_platform_access_ready")}
              </p>
            </li>
            <li className="bg-default p-5">
              <p className="text-muted text-xs font-medium">2 · {t("calendar_your_account")}</p>
              <p className="text-emphasis mt-2 text-sm font-medium">
                {googleCalendarReadiness === "needsPlatformSetup"
                  ? t("calendar_waiting_for_setup")
                  : t("calendar_ready_to_connect")}
              </p>
            </li>
            <li className="bg-default p-5">
              <p className="text-muted text-xs font-medium">3 · {t("calendar_meeting_sync")}</p>
              <p className="text-emphasis mt-2 text-sm font-medium">
                {t("calendar_starts_after_connection")}
              </p>
            </li>
          </ol>

          <div className="flex flex-col gap-2 p-5 sm:flex-row">
            {googleCalendarReadiness === "readyToConnect" && (
              <Button data-testid="connect-google-calendar" href="/apps/google-calendar">
                {t("connect_google_calendar")}
              </Button>
            )}
            <Button color="secondary" data-testid="connect-calendar-apps" href="/apps/categories/calendar">
              {t("browse_calendar_providers")}
            </Button>
          </div>
        </section>

        <aside className="border-subtle bg-subtle rounded-xl border p-4">
          <p className="text-emphasis text-sm font-medium">{t("calendar_email_separation_title")}</p>
          <p className="text-subtle mt-1 text-sm">{t("calendar_email_separation_description")}</p>
        </aside>
      </div>
    );
  }

  return (
    <SettingsHeader
      title={t("calendars")}
      description={t("calendars_description")}
      CTA={<AddCalendarButton />}>
      {content}
    </SettingsHeader>
  );
}
