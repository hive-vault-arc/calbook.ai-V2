import classNames from "@calcom/ui/classNames";
import type { MeetingPlatform } from "../lib/meetingPlatform";

export const MeetingPlatformLogo = ({
  platform,
  showLabel = false,
  className,
}: {
  platform: MeetingPlatform | null;
  showLabel?: boolean;
  className?: string;
}) => {
  if (!platform) return null;

  return (
    <span className={classNames("inline-flex shrink-0 items-center gap-1.5", className)}>
      <img className="h-4 w-4 rounded-sm" src={platform.iconUrl} alt="" aria-hidden="true" />
      {showLabel && <span className="font-medium text-subtle text-xs">{platform.label}</span>}
    </span>
  );
};
