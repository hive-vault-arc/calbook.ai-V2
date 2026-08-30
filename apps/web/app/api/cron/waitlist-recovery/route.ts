import process from "node:process";
import { waitlistService } from "@calcom/features/bookings/lib/service/WaitlistService";
import { defaultResponderForAppDir } from "@calcom/web/app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

async function getHandler(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const acceptedCredentials = [
    process.env.CRON_API_KEY,
    process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : undefined,
  ].filter((credential): credential is string => Boolean(credential));

  if (!authorization || !acceptedCredentials.includes(authorization)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const recovery = await waitlistService.recoverExpiredPromotions();
  return NextResponse.json({ ok: true, recovery });
}

export const GET = defaultResponderForAppDir(getHandler);
