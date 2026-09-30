"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { Icon } from "@calcom/ui/components/icon";
import { RadioAreaGroup } from "@calcom/ui/components/radio";

type WorkspaceType = "recruiting" | "scheduling";

type WorkspaceTypeSelectorProps = {
  value?: WorkspaceType | null;
  onValueChange: (value: WorkspaceType) => void;
  testIdPrefix?: string;
};

const workspaceOptions = [
  {
    value: "recruiting",
    icon: "users",
    badge: "onboarding_workspace_recruiting_badge",
    title: "onboarding_workspace_recruiting_title",
    description: "onboarding_workspace_recruiting_description",
  },
  {
    value: "scheduling",
    icon: "calendar",
    badge: "onboarding_workspace_scheduling_badge",
    title: "onboarding_workspace_scheduling_title",
    description: "onboarding_workspace_scheduling_description",
  },
] as const;

export const WorkspaceTypeSelector = ({
  value,
  onValueChange,
  testIdPrefix = "workspace",
}: WorkspaceTypeSelectorProps) => {
  const { t } = useLocale();

  return (
    <RadioAreaGroup.Group
      value={value ?? undefined}
      onValueChange={(nextValue) => {
        if (nextValue !== "recruiting" && nextValue !== "scheduling") return;
        onValueChange(nextValue);
      }}
      className="grid w-full items-stretch gap-3 sm:grid-cols-2">
      {workspaceOptions.map((option) => {
        const isSelected = value === option.value;

        return (
          <RadioAreaGroup.Item
            key={option.value}
            value={option.value}
            data-testid={`${testIdPrefix}-${option.value}`}
            className={classNames(
              "group relative h-full overflow-hidden rounded-2xl border bg-default transition-all duration-200",
              "hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-sm",
              "focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-2",
              "[&>button]:right-4 [&>button]:top-4",
              isSelected
                ? "border-violet-500 bg-violet-50/70 shadow-[0_10px_30px_-20px_rgba(109,40,217,0.8)]"
                : "border-subtle"
            )}
            classNames={{ container: "flex min-h-40 w-full flex-col p-5 pr-12" }}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <span
                className={classNames(
                  "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                  isSelected
                    ? "border-violet-200 bg-violet-100 text-violet-700"
                    : "border-subtle bg-muted text-subtle group-hover:text-violet-700"
                )}>
                <Icon name={option.icon} className="h-4 w-4" aria-hidden="true" />
              </span>
              <Badge
                variant={option.value === "recruiting" ? "purple" : "gray"}
                size="sm"
                className="max-w-[calc(100%-48px)] truncate rounded-md">
                {t(option.badge)}
              </Badge>
            </div>
            <p className="font-cal text-base font-semibold leading-5 text-emphasis">{t(option.title)}</p>
            <p className="mt-2 text-sm leading-5 text-subtle">{t(option.description)}</p>
          </RadioAreaGroup.Item>
        );
      })}
    </RadioAreaGroup.Group>
  );
};

export type { WorkspaceType };
