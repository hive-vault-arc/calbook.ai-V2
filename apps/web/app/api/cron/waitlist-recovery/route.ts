import { timingSafeEqual } from "node:crypto";
import process from "node:process";
import { waitlistService } from "@calcom/features/bookings/lib/service/WaitlistService";
import { defaultResponderForAppDir } from "@calcom/web/app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function hasValidBearerToken(authorization: string | null, secret: string | undefined): boolean {
  const bearerPrefix = "Bearer ";
  if (!secret || !authorization?.startsWith(bearerPrefix)) return false;

  const expected = Buffer.from(secret);
  const supplied = Buffer.from(authorization.slice(bearerPrefix.length));
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

async function getHandler(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_API_KEY ?? process.env.CRON_SECRET;
  if (!hasValidBearerToken(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const recovery = await waitlistService.recoverExpiredPromotions();
  return NextResponse.json({ ok: true, recovery });
}

export const GET = defaultResponderForAppDir(getHandler);
