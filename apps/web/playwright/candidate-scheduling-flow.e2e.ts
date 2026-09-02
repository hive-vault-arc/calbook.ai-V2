import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";
import {
  bookTimeSlot,
  confirmReschedule,
  selectFirstAvailableTimeSlotNextMonth,
  selectSecondAvailableTimeSlotNextMonth,
} from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test("candidate can book, reschedule, and cancel an interview in their timezone", async ({ page, users }) => {
  const candidateTimezone = "America/New_York";
  const candidateEmail = users.trackEmail({ username: "candidate-journey", domain: "example.com" });
  const candidateName = "Candidate Journey";
  await users.create();
  const [organizer] = users.get();

  await page.goto(`/${organizer.username}/30-min?cal.tz=${candidateTimezone}`);
  await selectFirstAvailableTimeSlotNextMonth(page);
  await bookTimeSlot(page, { email: candidateEmail, name: candidateName });

  await expect(page.getByTestId("success-page")).toBeVisible();
  await expect(page.getByTestId(`attendee-name-${candidateName}`)).toHaveText(candidateName);
  await expect(page.getByTestId(`attendee-email-${candidateEmail}`)).toHaveText(candidateEmail);

  const firstBookingUid = page.url().split("/").at(-1);
  if (!firstBookingUid) {
    throw new Error("Candidate booking did not redirect to a booking URL");
  }

  const firstBooking = await prisma.booking.findUniqueOrThrow({
    where: { uid: firstBookingUid },
    select: {
      attendees: {
        select: {
          email: true,
          timeZone: true,
        },
      },
    },
  });

  expect(firstBooking.attendees).toContainEqual({ email: candidateEmail, timeZone: candidateTimezone });

  await page.getByTestId("reschedule-link").click();
  await page.waitForURL((url) => url.pathname.startsWith("/reschedule/"));
  await selectSecondAvailableTimeSlotNextMonth(page);
  await confirmReschedule(page);

  await expect(page.getByTestId("success-page")).toBeVisible();
  const rescheduledBookingUid = page.url().split("/").at(-1);
  if (!rescheduledBookingUid) {
    throw new Error("Candidate reschedule did not redirect to a booking URL");
  }

  const [originalBooking, rescheduledBooking] = await Promise.all([
    prisma.booking.findUniqueOrThrow({
      where: { uid: firstBookingUid },
      select: { status: true },
    }),
    prisma.booking.findUniqueOrThrow({
      where: { uid: rescheduledBookingUid },
      select: {
        fromReschedule: true,
        status: true,
      },
    }),
  ]);

  expect(originalBooking.status).toBe(BookingStatus.CANCELLED);
  expect(rescheduledBooking.fromReschedule).toBe(firstBookingUid);
  expect(rescheduledBooking.status).toBe(BookingStatus.ACCEPTED);

  await page.getByTestId("cancel").click();
  await page.getByTestId("cancel_reason").fill("Candidate selected another interview time");
  await page.getByTestId("confirm_cancel").click();

  await expect(page.getByTestId("cancelled-headline")).toBeVisible();

  const cancelledBooking = await prisma.booking.findUniqueOrThrow({
    where: { uid: rescheduledBookingUid },
    select: {
      cancellationReason: true,
      status: true,
    },
  });

  expect(cancelledBooking.status).toBe(BookingStatus.CANCELLED);
  expect(cancelledBooking.cancellationReason).toBe("Candidate selected another interview time");
});
