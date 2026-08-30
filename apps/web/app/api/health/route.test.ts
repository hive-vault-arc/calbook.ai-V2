import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getResendApiKey: vi.fn<() => string | undefined>(),
  queryRaw: vi.fn(),
  verify: vi.fn(),
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  redisDel: vi.fn(),
}));

vi.mock("@calcom/lib/getResendConfig", () => ({
  getResendApiKey: mocks.getResendApiKey,
}));

vi.mock("@calcom/lib/serverConfig", () => ({
  serverConfig: { transport: { host: "smtp.resend.com" } },
}));

vi.mock("@calcom/prisma", () => ({
  prisma: { $queryRaw: mocks.queryRaw },
}));

vi.mock("nodemailer", () => ({
  createTransport: () => ({ verify: mocks.verify }),
}));

vi.mock("@calcom/features/di/containers/Redis", () => ({
  getRedisService: () => ({
    get: mocks.redisGet,
    set: mocks.redisSet,
    del: mocks.redisDel,
  }),
}));

import { GET } from "./route";

type HealthResponse = {
  checks: {
    email: {
      status: string;
      detail: string;
    };
    platformBilling: {
      status: string;
      detail?: string;
    };
    redis: {
      status: string;
      detail?: string;
      latencyMs?: number;
    };
  };
};

describe("GET /api/health email check", () => {
  beforeEach(() => {
    mocks.getResendApiKey.mockReturnValue("re_test");
    mocks.queryRaw.mockResolvedValue([{ result: 1 }]);
    mocks.verify.mockResolvedValue(true);
    mocks.redisSet.mockResolvedValue("OK");
    mocks.redisGet.mockResolvedValue("ok");
    mocks.redisDel.mockResolvedValue(1);
    vi.stubEnv("STRIPE_PRIVATE_KEY", "sk_test_example");
    vi.stubEnv("STRIPE_PLATFORM_BILLING_WEBHOOK_SECRET", "whsec_platform");
    vi.stubEnv("STRIPE_PLATFORM_PRO_MONTHLY_PRICE_ID", "price_pro_monthly");
    vi.stubEnv("STRIPE_PLATFORM_PRO_ANNUAL_PRICE_ID", "price_pro_annual");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("reports Resend as healthy only after transport verification succeeds", async () => {
    const response = await GET();
    const body = (await response.json()) as HealthResponse;

    expect(mocks.verify).toHaveBeenCalledOnce();
    expect(body.checks.email).toEqual({ status: "ok", detail: "Resend reachable" });
  });

  it("reports an error when Resend transport verification fails", async () => {
    mocks.verify.mockRejectedValueOnce(new Error("Authentication failed"));

    const response = await GET();
    const body = (await response.json()) as HealthResponse;

    expect(response.status).toBe(503);
    expect(body.checks.email).toEqual({ status: "error", detail: "Resend unreachable" });
  });

  it("verifies Redis with a short-lived read and write", async () => {
    const response = await GET();
    const body = (await response.json()) as HealthResponse;

    expect(mocks.redisSet).toHaveBeenCalledWith(expect.stringMatching(/^health:redis:/), "ok", {
      ttl: 5_000,
    });
    expect(mocks.redisGet).toHaveBeenCalledWith(expect.stringMatching(/^health:redis:/));
    expect(mocks.redisDel).toHaveBeenCalledWith(expect.stringMatching(/^health:redis:/));
    expect(body.checks.redis.status).toBe("ok");
  });

  it("reports an error when Redis cannot be reached", async () => {
    mocks.redisSet.mockRejectedValueOnce(new Error("Unavailable"));

    const response = await GET();
    const body = (await response.json()) as HealthResponse;

    expect(response.status).toBe(503);
    expect(body.checks.redis).toEqual(
      expect.objectContaining({ status: "error", detail: "Redis unreachable" })
    );
  });

  it("reports which platform billing variable is missing without exposing values", async () => {
    vi.stubEnv("STRIPE_PLATFORM_PRO_ANNUAL_PRICE_ID", "");

    const response = await GET();
    const body = (await response.json()) as HealthResponse;

    expect(response.status).toBe(200);
    expect(body.checks.platformBilling).toEqual({
      status: "degraded",
      detail: "Missing: STRIPE_PLATFORM_PRO_ANNUAL_PRICE_ID",
    });
  });
});
