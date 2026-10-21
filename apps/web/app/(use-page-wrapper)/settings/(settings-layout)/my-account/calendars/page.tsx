import { appsRouter } from "@calcom/trpc/server/routers/viewer/apps/_router";
import { calendarsRouter } from "@calcom/trpc/server/routers/viewer/calendars/_router";
import { CalendarListContainer } from "@components/apps/CalendarListContainer";
import { isGoogleCalendarAvailable } from "@components/apps/lib/isGoogleCalendarAvailable";
import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("calendars"),
    (t) => t("calendars_description"),
    undefined,
    undefined,
    "/settings/my-account/calendars"
  );

const Page = async () => {
  const [calendarsCaller, appsCaller] = await Promise.all([
    createRouterCaller(calendarsRouter),
    createRouterCaller(appsRouter),
  ]);

  const [connectedCalendars, installedCalendars, googleCalendarConfigured] = await Promise.all([
    calendarsCaller.connectedCalendars(),
    appsCaller.integrations({
      variant: "calendar",
      onlyInstalled: true,
    }),
    isGoogleCalendarAvailable(),
  ]);
  return (
    <CalendarListContainer
      connectedCalendars={connectedCalendars}
      installedCalendars={installedCalendars}
      googleCalendarConfigured={googleCalendarConfigured}
    />
  );
};

export default Page;
