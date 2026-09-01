import { guessEventLocationType } from "@calcom/app-store/locations";

export type MeetingPlatform = {
  label: string;
  iconUrl: string;
};

const urlProviders: Array<{ match: string; platform: MeetingPlatform }> = [
  {
    match: "meet.google.com",
    platform: { label: "Google Meet", iconUrl: "/app-store/googlevideo/icon.svg" },
  },
  {
    match: "teams.microsoft.com",
    platform: { label: "Microsoft Teams", iconUrl: "/app-store/office365video/icon.svg" },
  },
  {
    match: "teams.live.com",
    platform: { label: "Microsoft Teams", iconUrl: "/app-store/office365video/icon.svg" },
  },
  {
    match: "zoom.us",
    platform: { label: "Zoom", iconUrl: "/app-store/zoomvideo/icon.svg" },
  },
];

const integrationProviders: Record<string, MeetingPlatform> = {
  "integrations:google:meet": { label: "Google Meet", iconUrl: "/app-store/googlevideo/icon.svg" },
  "integrations:office365_video": {
    label: "Microsoft Teams",
    iconUrl: "/app-store/office365video/icon.svg",
  },
  "integrations:zoom": { label: "Zoom", iconUrl: "/app-store/zoomvideo/icon.svg" },
};

export const getMeetingPlatform = ({
  location,
  videoCallUrl,
}: {
  location?: string | null;
  videoCallUrl?: string | null;
}): MeetingPlatform | null => {
  if (location && integrationProviders[location]) return integrationProviders[location];

  const meetingUrl = `${location ?? ""} ${videoCallUrl ?? ""}`.toLowerCase();
  const urlProvider = urlProviders.find(({ match }) => meetingUrl.includes(match));
  if (urlProvider) return urlProvider.platform;

  const locationType = guessEventLocationType(location) ?? guessEventLocationType(videoCallUrl);
  if (locationType?.iconUrl) return { label: locationType.label, iconUrl: locationType.iconUrl };
  return null;
};
