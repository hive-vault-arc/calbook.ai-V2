import { DailyLocationType } from "@calcom/app-store/constants";
import { appKeysSchema } from "@calcom/app-store/dailyvideo/zod";
import { prisma } from "@calcom/prisma";

export async function getDefaultVideoLocation(): Promise<string> {
  const app = await prisma.app.findUnique({
    where: { slug: "daily-video" },
    select: { enabled: true, keys: true },
  });

  if (!app?.enabled) return "";
  const keys = appKeysSchema.safeParse(app.keys);
  if (!keys.success || !keys.data.api_key.trim()) return "";

  return DailyLocationType;
}
