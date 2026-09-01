import { describe, expect, it } from "vitest";
import { getMeetingPlatform } from "./meetingPlatform";

describe("getMeetingPlatform", () => {
  it.each([
    ["Google Meet", "https://meet.google.com/abc-defg-hij", "/app-store/googlevideo/icon.svg"],
    [
      "Microsoft Teams",
      "https://teams.microsoft.com/l/meetup-join/123",
      "/app-store/office365video/icon.svg",
    ],
    ["Zoom", "https://zoom.us/j/123456789", "/app-store/zoomvideo/icon.svg"],
  ])("resolves %s from a generated meeting URL", (label, videoCallUrl, iconUrl) => {
    expect(getMeetingPlatform({ videoCallUrl })).toEqual({ label, iconUrl });
  });

  it("returns null when the booking has no recognised meeting platform", () => {
    expect(getMeetingPlatform({ location: "Main office" })).toBeNull();
  });

  it("uses consistent labels for integration locations", () => {
    expect(getMeetingPlatform({ location: "integrations:office365_video" })).toEqual({
      label: "Microsoft Teams",
      iconUrl: "/app-store/office365video/icon.svg",
    });
  });
});
