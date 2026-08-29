"use client";

import type { BulkUpdatParams } from "@calcom/features/eventtypes/components/BulkEditDefaultForEventsModal";
import { BulkEditDefaultForEventsModal } from "@calcom/features/eventtypes/components/BulkEditDefaultForEventsModal";
import { ScheduleListItem } from "@calcom/features/schedules/components/ScheduleListItem";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { showToast } from "@calcom/ui/components/toast";
import { NewScheduleButton } from "@calcom/web/modules/schedules/components/NewScheduleButton";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { revalidateAvailabilityList } from "app/(use-page-wrapper)/(main-nav)/availability/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getWeeklyAvailabilitySummary, orderWeekdays } from "./lib/getWeeklyAvailabilitySummary";

type AvailabilityListProps = {
  availabilities: RouterOutputs["viewer"]["availability"]["list"];
};
export function AvailabilityList({ availabilities }: AvailabilityListProps) {
  const { i18n, t } = useLocale();
  const [bulkUpdateModal, setBulkUpdateModal] = useState(false);
  const utils = trpc.useUtils();
  const router = useRouter();
  const { data: user } = useMeQuery();
  const defaultSchedule = availabilities.schedules.find((schedule) => schedule.isDefault);
  const defaultWeek = defaultSchedule
    ? orderWeekdays(getWeeklyAvailabilitySummary(defaultSchedule.availability), user?.weekStart)
    : [];
  const availableDayCount = defaultWeek.filter(({ minutes }) => minutes > 0).length;
  const dayFormatter = new Intl.DateTimeFormat(i18n.language, { weekday: "short", timeZone: "UTC" });

  const deleteMutation = trpc.viewer.availability.schedule.delete.useMutation({
    onMutate: async ({ scheduleId }) => {
      await utils.viewer.availability.list.cancel();
      const previousValue = utils.viewer.availability.list.getData();
      if (previousValue) {
        const filteredValue = previousValue.schedules.filter(({ id }) => id !== scheduleId);
        utils.viewer.availability.list.setData(undefined, { ...previousValue, schedules: filteredValue });
      }

      return { previousValue };
    },

    onError: (err, variables, context) => {
      if (context?.previousValue) {
        utils.viewer.availability.list.setData(undefined, context.previousValue);
      }
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
    onSettled: () => {
      utils.viewer.availability.list.invalidate();
    },
    onSuccess: () => {
      revalidateAvailabilityList();
      showToast(t("schedule_deleted_successfully"), "success");
    },
  });

  const updateMutation = trpc.viewer.availability.schedule.update.useMutation({
    onSuccess: async ({ schedule }) => {
      await utils.viewer.availability.list.invalidate();
      revalidateAvailabilityList();
      showToast(
        t("availability_updated_successfully", {
          scheduleName: schedule.name,
        }),
        "success"
      );
      setBulkUpdateModal(true);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  const bulkUpdateDefaultAvailabilityMutation =
    trpc.viewer.availability.schedule.bulkUpdateToDefaultAvailability.useMutation();

  const { data: eventTypesQueryData, isFetching: isEventTypesFetching } =
    trpc.viewer.eventTypes.bulkEventFetch.useQuery();

  const bulkUpdateFunction = ({ eventTypeIds, callback }: BulkUpdatParams) => {
    bulkUpdateDefaultAvailabilityMutation.mutate(
      {
        eventTypeIds,
      },
      {
        onSuccess: () => {
          utils.viewer.availability.list.invalidate();
          revalidateAvailabilityList();
          showToast(t("bulk_updated_schedule_successfully"), "success");
          callback();
        },
      }
    );
  };

  const handleBulkEditDialogToggle = () => {
    utils.viewer.apps.getUsersDefaultConferencingApp.invalidate();
  };

  const duplicateMutation = trpc.viewer.availability.schedule.duplicate.useMutation({
    onSuccess: async ({ schedule }) => {
      await router.push(`/availability/${schedule.id}`);
      showToast(t("schedule_created_successfully", { scheduleName: schedule.name }), "success");
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  // Adds smooth delete button - item fades and old item slides into place

  const [animationParentRef] = useAutoAnimate<HTMLUListElement>();

  return (
    <>
      {availabilities.schedules.length === 0 ? (
        <div className="flex justify-center">
          <EmptyScreen
            Icon="clock"
            headline={t("new_schedule_heading")}
            description={t("new_schedule_description")}
            className="w-full"
            buttonRaw={<NewScheduleButton />}
          />
        </div>
      ) : (
        <>
          {defaultSchedule && (
            <section className="border-subtle bg-default mb-8 overflow-hidden rounded-xl border shadow-sm">
              <div className="border-subtle flex flex-col gap-1 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-subtle text-xs font-medium uppercase tracking-wide">
                    {t("default_week")}
                  </p>
                  <h2 className="text-emphasis mt-1 text-lg font-semibold">
                    {t("bookable_on_days", { count: availableDayCount })}
                  </h2>
                </div>
                <p className="text-subtle text-sm">{defaultSchedule.timeZone ?? user?.timeZone}</p>
              </div>
              <div className="grid grid-cols-7 gap-px bg-subtle p-px">
                {defaultWeek.map(({ day, minutes }) => {
                  const dayName = dayFormatter.format(new Date(Date.UTC(2024, 0, 7 + day)));
                  const hours = minutes / 60;
                  const hoursLabel = Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;

                  return (
                    <div
                      key={day}
                      className="bg-default flex min-w-0 flex-col gap-3 px-2 py-3 sm:px-4"
                      aria-label={
                        minutes > 0
                          ? t("day_hours_available", { day: dayName, hours: hoursLabel })
                          : t("day_unavailable", { day: dayName })
                      }>
                      <span className="text-subtle truncate text-xs font-medium">{dayName}</span>
                      <span
                        className={
                          minutes > 0 ? "text-emphasis text-sm font-semibold" : "text-muted text-sm"
                        }>
                        {minutes > 0 ? hoursLabel : "—"}
                      </span>
                      <span
                        aria-hidden="true"
                        className={
                          minutes > 0 ? "h-1.5 rounded-full bg-brand-default" : "h-1.5 rounded-full bg-subtle"
                        }
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-subtle px-5 py-3 text-sm">{t("default_week_description")}</p>
            </section>
          )}
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-emphasis text-base font-semibold">{t("schedules")}</h2>
              <p className="text-subtle mt-1 text-sm">{t("schedules_description")}</p>
            </div>
            <span className="text-subtle shrink-0 text-sm">
              {t("schedule_count", { count: availabilities.schedules.length })}
            </span>
          </div>
          <div className="border-subtle bg-default overflow-hidden rounded-xl border">
            <ul className="divide-subtle divide-y" data-testid="schedules" ref={animationParentRef}>
              {availabilities.schedules.map((schedule) => (
                <ScheduleListItem
                  redirectUrl={`/availability/${schedule.id}`}
                  displayOptions={{
                    hour12: user?.timeFormat ? user.timeFormat === 12 : undefined,
                    timeZone: user?.timeZone,
                    weekStart: user?.weekStart || "Sunday",
                  }}
                  key={schedule.id}
                  schedule={schedule}
                  isDeletable={availabilities.schedules.length !== 1}
                  updateDefault={updateMutation.mutate}
                  deleteFunction={deleteMutation.mutate}
                  duplicateFunction={duplicateMutation.mutate}
                />
              ))}
            </ul>
          </div>
          <div className="text-default mb-16 mt-4 block text-center text-sm">
            {t("temporarily_out_of_office")}{" "}
            <Link href="settings/my-account/out-of-office" className="underline">
              {t("add_a_redirect")}
            </Link>
          </div>
          {bulkUpdateModal && (
            <BulkEditDefaultForEventsModal
              isPending={bulkUpdateDefaultAvailabilityMutation.isPending}
              open={bulkUpdateModal}
              setOpen={setBulkUpdateModal}
              bulkUpdateFunction={bulkUpdateFunction}
              description={t("default_schedules_bulk_description")}
              eventTypes={eventTypesQueryData?.eventTypes}
              isEventTypesFetching={isEventTypesFetching}
              handleBulkEditDialogToggle={handleBulkEditDialogToggle}
            />
          )}
        </>
      )}
    </>
  );
}

export const AvailabilityCTA = () => {
  const { t } = useLocale();

  return (
    <div className="flex items-center gap-2">
      <NewScheduleButton label={t("new_schedule")} />
    </div>
  );
};
