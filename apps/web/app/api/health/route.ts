import process from "node:process";
import { prisma } from "@calcom/prisma";
import { NextResponse } from "next/server";

type CheckStatus = "ok" | "error" | "degraded";

type SubsystemCheck = {
  status: CheckStatus;
  latencyMs?: number;
  detail?: string;
};

async function checkDatabase(): Promise<SubsystemCheck> {
  const start = Date.now();
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Database health check timed out")), 3_000)
      ),
    ]);
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      detail: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

function checkStripe(): SubsystemCheck {
  const key = process.env.STRIPE_PRIVATE_KEY;
  if (!key) return { status: "degraded", detail: "STRIPE_PRIVATE_KEY not configured" };
  if (key.startsWith("sk_live_")) return { status: "ok", detail: "live mode" };
  if (key.startsWith("sk_test_")) return { status: "ok", detail: "test mode" };
  return { status: "degraded", detail: "Unrecognized Stripe key format" };
}

function checkEmail(): SubsystemCheck {
  if (process.env.RESEND_API_KEY) return { status: "ok", detail: "Resend configured" };
  if (process.env.EMAIL_SERVER || process.env.EMAIL_SERVER_HOST) {
    return { status: "ok", detail: "SMTP configured" };
  }
  return { status: "degraded", detail: "No email transport configured" };
}

function checkRedis(): SubsystemCheck {
  if (!process.env.REDIS_URL) return { status: "degraded", detail: "REDIS_URL not configured" };
  return { status: "ok" };
}

export async function GET(): Promise<NextResponse> {
  const checks: Record<string, SubsystemCheck> = {
    database: await checkDatabase(),
    stripe: checkStripe(),
    email: checkEmail(),
    redis: checkRedis(),
  };

  const allOk = Object.values(checks).every((c) => c.status === "ok");
  const hasError = Object.values(checks).some((c) => c.status === "error");
  const hasDegraded = Object.values(checks).some((c) => c.status === "degraded");

  let status: "healthy" | "degraded" | "unhealthy" = "unhealthy";
  let responseStatus = 503;
  if (allOk) {
    status = "healthy";
    responseStatus = 200;
  } else if (!hasError && hasDegraded) {
    status = "degraded";
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
