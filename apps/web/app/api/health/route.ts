import process from "node:process";
import { prisma } from "@calcom/prisma";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  const checks: Record<string, "ok" | "error"> = {};

  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Database health check timed out")), 3_000)
      ),
    ]);
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const allOk = Object.values(checks).every((status) => status === "ok");
  let status: "healthy" | "degraded" = "degraded";
  let responseStatus = 503;
  if (allOk) {
    status = "healthy";
    responseStatus = 200;
  }

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_CALCOM_VERSION ?? "unknown",
      checks,
    },
    { status: responseStatus }
  );
}
