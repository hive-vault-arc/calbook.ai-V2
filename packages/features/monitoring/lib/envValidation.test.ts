import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertProductionEnv, validateProductionEnv } from "./envValidation";

describe("envValidation", () => {
  const validEnv = {
    DATABASE_URL: "postgresql://user:pass@host:5432/db",
    NEXTAUTH_SECRET: "a".repeat(32),
    NEXTAUTH_URL: "https://calbook.test",
    NEXT_PUBLIC_WEBAPP_URL: "https://calbook.test",
    NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS: "support@calbook.test",
    STRIPE_PRIVATE_KEY: "sk_live_abc123",
    NEXT_PUBLIC_STRIPE_PUBLIC_KEY: "pk_live_abc123",
    STRIPE_WEBHOOK_SECRET: "whsec_abc123",
    STRIPE_PLATFORM_BILLING_WEBHOOK_SECRET: "whsec_platform123",
    STRIPE_PLATFORM_PRO_MONTHLY_PRICE_ID: "price_pro_monthly",
    STRIPE_PLATFORM_PRO_ANNUAL_PRICE_ID: "price_pro_annual",
    RESEND_API_KEY: "re_abc123",
    RESEND_FROM: "noreply@calbook.test",
    UPSTASH_REDIS_REST_URL: "https://redis.example.com",
    UPSTASH_REDIS_REST_TOKEN: "redis-token",
  } as NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("passes with a fully valid environment", () => {
    const result = validateProductionEnv(validEnv);
    expect(result.valid).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it("fails when DATABASE_URL is missing or not PostgreSQL", () => {
    const result = validateProductionEnv({ ...validEnv, DATABASE_URL: "mysql://localhost" });
    expect(result.valid).toBe(false);
    expect(result.findings).toContainEqual({
      key: "DATABASE_URL",
      severity: "error",
      message: "Database URL must be a valid PostgreSQL connection string",
    });
  });

  it("fails when NEXTAUTH_SECRET is too short", () => {
    const result = validateProductionEnv({ ...validEnv, NEXTAUTH_SECRET: "short" });
    expect(result.valid).toBe(false);
    expect(result.findings.some((f) => f.key === "NEXTAUTH_SECRET")).toBe(true);
  });

  it("fails when distributed monitoring Redis is not configured", () => {
    const result = validateProductionEnv({ ...validEnv, UPSTASH_REDIS_REST_TOKEN: undefined });

    expect(result.valid).toBe(false);
    expect(result.findings).toContainEqual({
      key: "UPSTASH_REDIS_REST_TOKEN",
      severity: "error",
      message: "Upstash Redis REST token is required for distributed production monitoring",
    });
  });

  it("fails when NEXTAUTH_URL is not a valid URL", () => {
    const result = validateProductionEnv({ ...validEnv, NEXTAUTH_URL: "not-a-url" });
    expect(result.valid).toBe(false);
    expect(result.findings.some((f) => f.key === "NEXTAUTH_URL")).toBe(true);
  });

  it("fails when production application URLs point to localhost", () => {
    const result = validateProductionEnv({
      ...validEnv,
      NEXTAUTH_URL: "http://localhost:3000/api/auth",
      NEXT_PUBLIC_WEBAPP_URL: "http://127.0.0.1:3000",
    });

    expect(result.valid).toBe(false);
    expect(result.findings.some((finding) => finding.key === "NEXTAUTH_URL")).toBe(true);
    expect(result.findings.some((finding) => finding.key === "NEXT_PUBLIC_WEBAPP_URL")).toBe(true);
  });

  it("fails when the public support email is missing or invalid", () => {
    const result = validateProductionEnv({ ...validEnv, NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS: undefined });

    expect(result.valid).toBe(false);
    expect(result.findings).toContainEqual({
      key: "NEXT_PUBLIC_SUPPORT_MAIL_ADDRESS",
      severity: "error",
      message: "A public support email is required for legal notices and customer support",
    });
  });

  it("warns when Stripe key format is unrecognized", () => {
    const result = validateProductionEnv({ ...validEnv, STRIPE_PRIVATE_KEY: "wrong_format" });
    expect(result.valid).toBe(false);
    expect(result.findings.some((f) => f.key === "STRIPE_PRIVATE_KEY" && f.severity === "error")).toBe(true);
  });

  it("fails when a required platform billing price is missing", () => {
    const result = validateProductionEnv({ ...validEnv, STRIPE_PLATFORM_PRO_ANNUAL_PRICE_ID: undefined });

    expect(result.valid).toBe(false);
    expect(result.findings).toContainEqual({
      key: "STRIPE_PLATFORM_PRO_ANNUAL_PRICE_ID",
      severity: "error",
      message: "Platform billing configuration is required for paid plans",
    });
  });

  it("accepts the existing organization billing variables as compatibility aliases", () => {
    const env = { ...validEnv } as NodeJS.ProcessEnv;
    delete env.STRIPE_PLATFORM_BILLING_WEBHOOK_SECRET;
    delete env.STRIPE_PLATFORM_PRO_MONTHLY_PRICE_ID;
    delete env.STRIPE_PLATFORM_PRO_ANNUAL_PRICE_ID;
    env.STRIPE_WEBHOOK_SECRET_BILLING = "whsec_legacy";
    env.STRIPE_ORG_MONTHLY_PRICE_ID = "price_legacy_monthly";
    env.STRIPE_ORG_ANNUAL_PRICE_ID = "price_legacy_annual";

    const result = validateProductionEnv(env);

    expect(result.valid).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it("warns when no email transport is configured", () => {
    const env = { ...validEnv } as NodeJS.ProcessEnv;
    delete env.RESEND_API_KEY;
    delete env.RESEND_FROM;
    const result = validateProductionEnv(env);
    expect(result.findings.some((f) => f.key === "EMAIL_TRANSPORT")).toBe(true);
  });

  it("does not warn about email when SMTP is configured", () => {
    const env = { ...validEnv } as NodeJS.ProcessEnv;
    delete env.RESEND_API_KEY;
    delete env.RESEND_FROM;
    env.EMAIL_SERVER_HOST = "smtp.example.com";
    const result = validateProductionEnv(env);
    expect(result.findings.some((f) => f.key === "EMAIL_TRANSPORT")).toBe(false);
  });

  it("accepts NEXT_RESEND_API_KEY as a server-side Resend key alias", () => {
    const env = { ...validEnv } as NodeJS.ProcessEnv;
    delete env.RESEND_API_KEY;
    env.NEXT_RESEND_API_KEY = "re_alias123";
    const result = validateProductionEnv(env);
    expect(result.findings.some((f) => f.key === "EMAIL_TRANSPORT")).toBe(false);
    expect(result.findings.some((f) => f.key === "RESEND_API_KEY")).toBe(false);
  });

  it("warns when RESEND_FROM is not a valid email", () => {
    const result = validateProductionEnv({ ...validEnv, RESEND_FROM: "not-an-email" });
    expect(result.findings.some((f) => f.key === "RESEND_FROM")).toBe(true);
  });

  it("assertProductionEnv throws on error findings", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(() => assertProductionEnv({ ...validEnv, DATABASE_URL: undefined } as NodeJS.ProcessEnv)).toThrow(
      "Production environment validation failed"
    );
    spy.mockRestore();
    warnSpy.mockRestore();
  });

  it("assertProductionEnv does not throw when only email warnings exist", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(() =>
      assertProductionEnv({ ...validEnv, EMAIL_SERVER_HOST: "bad host" } as NodeJS.ProcessEnv)
    ).not.toThrow();
    warnSpy.mockRestore();
  });
});
