import googleCalendarMetadata from "@calcom/app-store/googlecalendar/_metadata";
import { prisma } from "@calcom/prisma";

export async function isGoogleCalendarAvailable(): Promise<boolean> {
  if (!googleCalendarMetadata.installed) return false;

  const app = await prisma.app.findUnique({
    where: { slug: "google-calendar" },
    select: { enabled: true },
  });
  return app?.enabled === true;
}
