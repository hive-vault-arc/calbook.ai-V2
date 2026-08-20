"use client";

import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import type { BookerEvent } from "@calcom/features/bookings/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { useRouter, useSearchParams } from "next/navigation";

export const TierSelector = ({ event }: { event: Pick<BookerEvent, "tierSchedules"> }) => {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTier = useBookerStoreContext((state) => state.selectedTier);
  const setSelectedTier = useBookerStoreContext((state) => state.setSelectedTier);

  const tierSchedules = event.tierSchedules as Record<string, number> | null;
  if (!tierSchedules || Object.keys(tierSchedules).length === 0) return null;

  const tierNames = Object.keys(tierSchedules);
  const currentTier = selectedTier ?? searchParams?.get("tier") ?? tierNames[0];

  const handleTierChange = (tier: string) => {
    setSelectedTier(tier);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tier", tier);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="border-default relative mr-5 flex flex-row items-center justify-between rounded-md border">
      <ul className="bg-default no-scrollbar flex max-w-full items-center gap-0.5 overflow-x-auto rounded-md p-1">
        {tierNames.map((tier) => (
          <li
            data-testId={`tier-${tier}`}
            data-active={currentTier === tier ? "true" : "false"}
            key={tier}
            onClick={() => handleTierChange(tier)}
            className={classNames(
              currentTier === tier ? "bg-emphasis" : "hover:text-emphasis",
              "text-default cursor-pointer rounded-[4px] px-3 py-1.5 text-sm leading-tight transition"
            )}>
            <div className="w-max">{t(`tier_${tier}`, tier)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};
