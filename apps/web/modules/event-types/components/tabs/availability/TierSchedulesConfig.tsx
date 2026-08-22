"use client";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Label, Select, TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { useFlags } from "@calcom/web/modules/feature-flags/hooks/useFlags";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useEffect } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

type ScheduleOption = {
  value: number;
  label: string;
  isDefault: boolean;
};

type TierSchedulesConfigProps = {
  schedules: ScheduleOption[];
};

type TierEntry = {
  name: string;
  scheduleId: number | null;
};

export function TierSchedulesConfig({ schedules }: TierSchedulesConfigProps) {
  const flags = useFlags();
  if (flags["tiered-availability"] === false) return <></>;
  return <TierSchedulesConfigInner schedules={schedules} />;
}

function TierSchedulesConfigInner({ schedules }: TierSchedulesConfigProps) {
  const { t } = useLocale();
  const form = useFormContext<FormValues>();
  const { watch, setValue } = form;
  const [animationRef] = useAutoAnimate<HTMLDivElement>();

  const tierSchedules = watch("tierSchedules");
  const tiers = tierSchedules ? Object.entries(tierSchedules) : [];

  const { fields, append, remove, update } = useFieldArray<FormValues>({
    control: form.control,
    name: "tierSchedules" as never,
  } as never);

  // Sync the field array with the tierSchedules object
  useEffect(() => {
    if (tiers.length === 0 && fields.length === 0) return;
    if (tiers.length !== fields.length) {
      // Rebuild field array from the tierSchedules object
      const newEntries = tiers.map(([name, scheduleId]) => ({ name, scheduleId }));
      // Clear and refill
      while (fields.length > 0) remove(0);
      newEntries.forEach((entry) => append(entry as never));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierSchedules]);

  const scheduleOptions = schedules.map((s) => ({
    value: s.value,
    label: s.label,
    isDefault: s.isDefault,
    isManaged: false,
  }));

  const updateTier = (index: number, field: "name" | "scheduleId", value: string | number | null) => {
    const currentTiers = tierSchedules ? { ...tierSchedules } : {};
    const entries = Object.entries(currentTiers);
    if (index >= entries.length) return;

    if (field === "name") {
      const oldName = entries[index][0];
      const scheduleId = entries[index][1];
      delete currentTiers[oldName];
      currentTiers[String(value)] = scheduleId;
    } else {
      const name = entries[index][0];
      currentTiers[name] = Number(value);
    }
    setValue("tierSchedules", currentTiers, { shouldDirty: true });
  };

  const addTier = () => {
    const newTierName = `tier_${tiers.length + 1}`;
    const defaultSchedule = schedules.find((s) => s.isDefault)?.value ?? schedules[0]?.value ?? null;
    if (!defaultSchedule) return;
    const currentTiers = tierSchedules ? { ...tierSchedules } : {};
    currentTiers[newTierName] = defaultSchedule;
    setValue("tierSchedules", currentTiers, { shouldDirty: true });
  };

  const removeTier = (index: number) => {
    const currentTiers = tierSchedules ? { ...tierSchedules } : {};
    const entries = Object.entries(currentTiers);
    if (index >= entries.length) return;
    const name = entries[index][0];
    delete currentTiers[name];
    const hasRemaining = Object.keys(currentTiers).length > 0;
    setValue("tierSchedules", hasRemaining ? currentTiers : null, { shouldDirty: true });
  };

  return (
    <div className="stack-y-4">
      <div className="rounded-lg border border-subtle p-6">
        <Label className="mb-1 font-semibold text-sm">{t("tier_schedules")}</Label>
        <p className="wrap-break-word max-w-full text-sm text-subtle leading-tight">
          {t("tier_schedules_description")}
        </p>

        <div ref={animationRef} className="mt-4 stack-y-3">
          {tiers.map(([tierName, scheduleId], index) => (
            <div key={index} className="flex items-center gap-2">
              <TextField
                containerClassName="w-40"
                value={tierName}
                onChange={(e) => updateTier(index, "name", e.target.value)}
                placeholder={t("tier_name")}
              />
              <div className="flex-1">
                <Select
                  options={scheduleOptions}
                  isSearchable={false}
                  value={scheduleOptions.find((opt) => opt.value === scheduleId)}
                  onChange={(selected) => {
                    if (selected) updateTier(index, "scheduleId", selected.value);
                  }}
                  className="block w-full rounded-sm text-sm"
                  isMulti={false}
                />
              </div>
              <Button
                type="button"
                color="minimal"
                size="base"
                onClick={() => removeTier(index)}
                StartIcon="trash">
                <span className="sr-only">{t("remove")}</span>
              </Button>
            </div>
          ))}
        </div>

        {schedules.length > 0 && (
          <Button type="button" color="minimal" StartIcon="plus" onClick={addTier} className="mt-3">
            {t("add_tier")}
          </Button>
        )}

        {schedules.length === 0 && <p className="mt-3 text-sm text-subtle">{t("create_schedule_first")}</p>}
      </div>
    </div>
  );
}
