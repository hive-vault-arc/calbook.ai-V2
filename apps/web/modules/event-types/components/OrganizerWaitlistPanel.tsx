"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import dayjs from "dayjs";

type OrganizerWaitlistPanelProps = {
  eventTypeId: number;
};

export function OrganizerWaitlistPanel({ eventTypeId }: OrganizerWaitlistPanelProps) {
  const { t } = useLocale();
  const { data, isPending } = trpc.viewer.slots.getWaitlistForEventType.useQuery({ eventTypeId });

  if (isPending) {
    return (
      <div className="rounded-lg border border-subtle p-6">
        <SkeletonText className="block h-6 w-40" />
        <div className="mt-4 stack-y-2">
          <SkeletonText className="block h-4 w-full" />
          <SkeletonText className="block h-4 w-full" />
        </div>
      </div>
    );
  }

  const entries = data?.entries ?? [];

  return (
    <div className="rounded-lg border border-subtle p-6">
      <h3 className="font-semibold text-sm">{t("waitlist")}</h3>
      <p className="mt-1 text-sm text-subtle">
        {entries.length > 0 ? t("waitlist_count", { count: entries.length }) : t("no_waitlist_entries")}
      </p>

      {entries.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-subtle border-b text-left">
                <th className="pb-2 pr-4 font-medium">{t("email")}</th>
                <th className="pb-2 pr-4 font-medium">{t("name")}</th>
                <th className="pb-2 pr-4 font-medium">{t("slot")}</th>
                <th className="pb-2 pr-4 font-medium">{t("tier")}</th>
                <th className="pb-2 pr-4 font-medium">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-subtle border-b last:border-0">
                  <td className="py-2 pr-4">{entry.email}</td>
                  <td className="py-2 pr-4">{entry.name || "—"}</td>
                  <td className="py-2 pr-4">{dayjs(entry.slotTime).format("MMM D, h:mm A")}</td>
                  <td className="py-2 pr-4">
                    {entry.tier ? <Badge variant="blue">{entry.tier}</Badge> : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {entry.notifiedAt ? (
                      entry.expiresAt && new Date(entry.expiresAt) > new Date() ? (
                        <Badge variant="warning">{t("notified")}</Badge>
                      ) : (
                        <Badge variant="red">{t("expired")}</Badge>
                      )
                    ) : (
                      <Badge variant="gray">{t("waiting")}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
