import { randomUUID } from "node:crypto";
import process from "node:process";
import { getPlatformBillingReadiness } from "@calcom/features/billing/lib/platform-billing-env";
import { getRedisService } from "@calcom/features/di/containers/Redis";
import { getResendApiKey } from "@calcom/lib/getResendConfig";
import { serverConfig } from "@calcom/lib/serverConfig";
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
  if (key.startsWith("sk_live_") || key.startsWith("sk_test_")) return { status: "ok" };
  return { status: "degraded", detail: "Unrecognized Stripe key format" };
}

function checkPlatformBilling(): SubsystemCheck {
  const readiness = getPlatformBillingReadiness();
  if (readiness.ready) return { status: "ok" };

  const details = [
    readiness.missing.length ? `Missing: ${readiness.missing.join(", ")}` : "",
    readiness.invalid.length ? `Invalid: ${readiness.invalid.join(", ")}` : "",
  ].filter(Boolean);
  return { status: "degraded", detail: details.join("; ") };
}

async function checkEmail(): Promise<SubsystemCheck> {
  const resendApiKey = getResendApiKey();
  const hasSmtp = Boolean(process.env.EMAIL_SERVER || process.env.EMAIL_SERVER_HOST);
  if (!resendApiKey && !hasSmtp) return { status: "degraded", detail: "No email transport configured" };

  try {
    const { createTransport } = await import("nodemailer");
    const transport = createTransport(serverConfig.transport);
    await Promise.race([
      transport.verify(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Email transport health check timed out")), 3_000)
      ),
    ]);
    return { status: "ok", detail: resendApiKey ? "Resend reachable" : "SMTP reachable" };
  } catch {
    return { status: "error", detail: resendApiKey ? "Resend unreachable" : "SMTP unreachable" };
  }
}

async function checkRedis(): Promise<SubsystemCheck> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return { status: "degraded", detail: "Distributed monitoring Redis not configured" };
  }

  const start = Date.now();
  const key = `health:redis:${randomUUID()}`;
  try {
    const redis = getRedisService();
    await redis.set(key, "ok", { ttl: 5_000 });
    const value = await redis.get<string>(key);
    await redis.del(key);
    if (value !== "ok") throw new Error("Redis health value mismatch");
    return { status: "ok", latencyMs: Date.now() - start };
  } catch {
    return { status: "error", latencyMs: Date.now() - start, detail: "Redis unreachable" };
  }
}

export async function GET(): Promise<NextResponse> {
  const [database, email, redis] = await Promise.all([checkDatabase(), checkEmail(), checkRedis()]);
  const checks: Record<string, SubsystemCheck> = {
    database,
    stripe: checkStripe(),
    platformBilling: checkPlatformBilling(),
    email,
    redis,
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
