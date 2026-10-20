import { DailyLocationType } from "@calcom/app-store/constants";
import { OrganizerDefaultConferencingAppType } from "@calcom/app-store/locations";
import { describe, expect, it } from "vitest";
import { resolveLegacyRescheduleLocation } from "./resolveLegacyRescheduleLocation";

type Input = Parameters<typeof resolveLegacyRescheduleLocation>[0];

function createInput(overrides: Partial<Input> = {}): Input {
  return {
    location: DailyLocationType,
    originalBooking: { location: DailyLocationType, metadata: {}, references: [] },
    hasExplicitLocation: false,
    organizerMetadata: {},
    ...overrides,
  };
}

describe("resolveLegacyRescheduleLocation", () => {
  it("routes orphaned Daily locations through the guarded organizer default", () => {
    const input = createInput();
    expect(resolveLegacyRescheduleLocation(input)).toBe(OrganizerDefaultConferencingAppType);
    expect(input.originalBooking?.location).toBe(DailyLocationType);
  });

  it("does not require a metadata object or discard ordinary calendar references", () => {
    const input = createInput({
      originalBooking: {
        location: DailyLocationType,
        metadata: null,
        references: [{ type: "google_calendar", meetingUrl: null }],
      },
    });
    expect(resolveLegacyRescheduleLocation(input)).toBe(OrganizerDefaultConferencingAppType);
  });

  it("leaves new bookings and explicit event locations alone", () => {
    expect(resolveLegacyRescheduleLocation(createInput({ originalBooking: null }))).toBe(DailyLocationType);
    expect(resolveLegacyRescheduleLocation(createInput({ hasExplicitLocation: true }))).toBe(
      DailyLocationType
    );
  });

  it.each([
    "",
    "https://meet.example.com/room",
    "integrations:zoom",
    "integrations:google:meet",
  ])("preserves the requested location %s", (location) =>
    expect(resolveLegacyRescheduleLocation(createInput({ location }))).toBe(location));

  it.each([
    null,
    "",
    "https://meet.example.com/room",
  ])("does not reinterpret an original location %s", (location) => {
    expect(
      resolveLegacyRescheduleLocation(
        createInput({
          originalBooking: {
            location,
            metadata: {},
            references: [],
          },
        })
      )
    ).toBe(DailyLocationType);
  });

  it.each([
    { defaultConferencingApp: { appSlug: "daily-video" } },
    { defaultConferencingApp: { appSlug: "zoom" } },
    { defaultConferencingApp: { appLink: "https://meet.example.com/room" } },
    "unrecognized metadata",
  ])("preserves organizer conferencing preferences or unrecognized data: %j", (organizerMetadata) => {
    expect(resolveLegacyRescheduleLocation(createInput({ organizerMetadata }))).toBe(DailyLocationType);
  });

  it.each([
    { type: "daily_video", meetingUrl: null },
    { type: "zoom_video", meetingUrl: "https://zoom.us/j/123" },
    { type: "example_conferencing", meetingUrl: null },
    { type: "google_calendar", meetingUrl: "https://meet.google.com/abc-defg-hij" },
  ])("preserves existing meeting reference %j", (reference) => {
    expect(
      resolveLegacyRescheduleLocation(
        createInput({
          originalBooking: {
            location: DailyLocationType,
            metadata: {},
            references: [reference],
          },
        })
      )
    ).toBe(DailyLocationType);
  });

  it.each([
    { metadata: { videoCallUrl: "https://meet.example.com/room" } },
    { metadata: { videoCallUrl: { unexpected: "shape" } } },
    { metadata: "unrecognized metadata" },
    { metadata: [] },
  ])("does not discard an existing video URL or unrecognized booking metadata: %j", ({ metadata }) => {
    expect(
      resolveLegacyRescheduleLocation(
        createInput({
          originalBooking: {
            location: DailyLocationType,
            metadata,
            references: [],
          },
        })
      )
    ).toBe(DailyLocationType);
  });
});
