import { waitlistService } from "@calcom/features/bookings/lib/service/WaitlistService";
import prisma from "@calcom/prisma";
import type { PageProps } from "app/_types";
import { notFound, redirect } from "next/navigation";
import type React from "react";

/**
 * R3.4: Validates a waitlist promotion token and redirects to the booking page.
 * If the token is invalid or expired, returns 404.
 */
const ServerPage = async ({ params }: PageProps): Promise<JSX.Element> => {
  const { token } = await params;
  if (!token || typeof token !== "string") {
    notFound();
  }

  const entry = await waitlistService.validatePromotionToken(token);
  if (!entry) {
    notFound();
  }

  // Get the event type to build the booking URL
  const eventType = await prisma.eventType.findUnique({
    where: { id: entry.eventTypeId },
    select: {
      slug: true,
      users: { select: { username: true } },
      tierSchedules: true,
    },
  });

  if (!eventType || !eventType.users[0]?.username) {
    notFound();
  }

  // Build the booking URL with the slot pre-selected
  const username = eventType.users[0].username;
  const slotIso = entry.slotTime.toISOString();
  const tierParam = entry.tier ? `&tier=${entry.tier}` : "";
  redirect(`/${username}/${eventType.slug}?slot=${slotIso}${tierParam}&promotionToken=${token}`);
};

export default ServerPage;
