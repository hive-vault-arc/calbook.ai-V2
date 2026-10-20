import prismaMock from "@calcom/testing/lib/__mocks__/prisma";
import {
  createBookingScenario,
  getBooker,
  getOrganizer,
  getScenarioData,
  TestData,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { DailyLocationType } from "@calcom/app-store/constants";
import * as videoClient from "@calcom/features/conferencing/lib/videoClient";
import { BookingStatus } from "@calcom/prisma/enums";
import { getMockRequestDataForBooking } from "@calcom/testing/lib/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";
import { test } from "@calcom/testing/lib/fixtures/fixtures";
import { afterEach, beforeEach, describe, expect, vi } from "vitest";
import { getNewBookingHandler } from "./getNewBookingHandler";

describe("rescheduling an orphaned implicit Cal Video location", () => {
  setupAndTeardown();
  beforeEach(() => vi.setSystemTime(new Date("2026-10-20T00:00:00Z")));
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("persists a location-free booking and emails without promising an unavailable video link", async ({
    emails,
  }) => {
    const createMeeting = vi.spyOn(videoClient, "createMeeting");
    const updateMeeting = vi.spyOn(videoClient, "updateMeeting");
    const booker = getBooker({ name: "Candidate", email: "candidate@example.com" });
    const organizer = getOrganizer({
      id: 101,
      name: "Host",
      email: "host@example.com",
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [],
      selectedCalendars: [],
      metadata: {},
    });
    const dateString = "2026-10-21";
    const previousUid = "legacy-daily-without-meeting";

    await createBookingScenario(
      getScenarioData({
        organizer,
        apps: [],
        eventTypes: [{ id: 1, length: 15, slotInterval: 15, users: [{ id: organizer.id }], locations: [] }],
        bookings: [
          {
            uid: previousUid,
            eventTypeId: 1,
            status: BookingStatus.ACCEPTED,
            startTime: `${dateString}T05:00:00.000Z`,
            endTime: `${dateString}T05:15:00.000Z`,
            location: DailyLocationType,
            metadata: {},
            references: [],
          },
        ],
      })
    );

    const created = await getNewBookingHandler()({
      bookingData: getMockRequestDataForBooking({
        data: {
          eventTypeId: 1,
          rescheduleUid: previousUid,
          start: `${dateString}T04:00:00.000Z`,
          end: `${dateString}T04:15:00.000Z`,
          rescheduledBy: booker.email,
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: DailyLocationType },
          },
        },
      }),
    });

    const saved = await prismaMock.booking.findUnique({
      where: { uid: created.uid },
      select: { location: true, references: { select: { type: true, meetingUrl: true } } },
    });
    const previous = await prismaMock.booking.findUnique({
      where: { uid: previousUid },
      select: { status: true, rescheduled: true, location: true },
    });

    expect(saved?.location).toBe("");
    expect(saved?.references).toEqual([]);
    expect(previous).toEqual({
      status: BookingStatus.CANCELLED,
      rescheduled: true,
      location: DailyLocationType,
    });
    expect(createMeeting).not.toHaveBeenCalled();
    expect(updateMeeting).not.toHaveBeenCalled();
    expect(emails.get()).toHaveLength(2);
    for (const email of emails.get()) {
      expect(email.html).not.toContain("Cal Video");
    }
  });
});
