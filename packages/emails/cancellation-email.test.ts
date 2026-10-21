import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { createInstance } from "i18next";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sendCancelledEmailsAndSMS } from "./email-manager";

const mocks = vi.hoisted(() => ({
  attendee: vi.fn<(event: CalendarEvent, attendee: Person) => void>(),
  organizer: vi.fn<(event: CalendarEvent) => void>(),
  sendEmail: vi.fn(async () => undefined),
  sendSMS: vi.fn(async () => undefined),
}));

vi.mock("@calcom/prisma", () => ({ prisma: {} }));
vi.mock("./templates/attendee-cancelled-email", () => ({
  default: class {
    constructor(event: CalendarEvent, attendee: Person) {
      mocks.attendee(event, attendee);
    }
    sendEmail = mocks.sendEmail;
  },
}));
vi.mock("./templates/organizer-cancelled-email", () => ({
  default: class {
    constructor({ calEvent }: { calEvent: CalendarEvent }) {
      mocks.organizer(calEvent);
    }
    sendEmail = mocks.sendEmail;
  },
}));
vi.mock("../sms/attendee/event-cancelled-sms", () => ({
  default: class {
    sendSMSToAttendees = mocks.sendSMS;
  },
}));

const i18n = createInstance();

beforeAll(async () => {
  await i18n.init({
    lng: "en",
    fallbackLng: "en",
    resources: {
      en: { translation: { event_between_users: "{{eventName}} between {{host}} and {{attendeeName}}" } },
      fr: { translation: { event_between_users: "{{eventName}} entre {{host}} et {{attendeeName}}" } },
    },
  });
});

beforeEach(() => vi.clearAllMocks());

function createPerson(name: string, locale = "en"): Person {
  return {
    name,
    email: `${name.toLowerCase()}@example.com`,
    timeZone: "Africa/Casablanca",
    language: { locale, translate: i18n.getFixedT(locale) },
  };
}

function createEvent(): CalendarEvent {
  return {
    type: "30 min meeting",
    title: "30 min meeting between Host and Candidate",
    startTime: "2026-10-21T12:30:00Z",
    endTime: "2026-10-21T13:00:00Z",
    length: 30,
    organizer: createPerson("Host"),
    attendees: [createPerson("Candidate")],
  };
}

describe("cancellation email titles", () => {
  it("does not append participant names twice or change the organizer's title", async () => {
    const event = createEvent();

    await sendCancelledEmailsAndSMS(event, {});

    expect(mocks.attendee.mock.calls[0][0].title).toBe(event.title);
    expect(mocks.organizer.mock.calls[0][0].title).toBe(event.title);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
    expect(mocks.sendSMS).toHaveBeenCalledOnce();
  });

  it("uses each attendee's language and name without reusing the expanded booking title", async () => {
    const event = createEvent();
    event.attendees.push(createPerson("Camille", "fr"));

    await sendCancelledEmailsAndSMS(event, {});

    expect(mocks.attendee.mock.calls.map(([email]) => email.title)).toEqual([
      "30 min meeting between Host and Candidate",
      "30 min meeting entre Host et Camille",
    ]);
    expect(event.title).toBe("30 min meeting between Host and Candidate");
  });

  it("keeps custom title placeholders based on the original event type", async () => {
    const event = createEvent();
    event.location = "Meeting room";

    await sendCancelledEmailsAndSMS(event, {
      eventName: "{Event type title}: {Organiser} / {Scheduler} ({Event duration}) at {Location}",
    });

    expect(mocks.attendee.mock.calls[0][0].title).toBe(
      "30 min meeting: Host / Candidate (30 mins) at Meeting room"
    );
  });

  it("respects disabled attendee emails", async () => {
    await sendCancelledEmailsAndSMS(
      createEvent(),
      {},
      { disableStandardEmails: { all: { attendee: true } } }
    );

    expect(mocks.attendee).not.toHaveBeenCalled();
    expect(mocks.organizer).toHaveBeenCalledOnce();
  });
});
