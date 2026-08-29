import { afterEach, describe, expect, it, vi } from "vitest";

describe("serverConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses Resend through the supported key alias before legacy SMTP", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NEXT_RESEND_API_KEY", "re_alias");
    vi.stubEnv("EMAIL_SERVER_HOST", "localhost");
    vi.stubEnv("EMAIL_SERVER_PORT", "1025");

    const { serverConfig } = await import("./serverConfig");

    expect(serverConfig.transport).toMatchObject({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: { user: "resend", pass: "re_alias" },
    });
  });

  it("prefers the canonical Resend key when both names are configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_canonical");
    vi.stubEnv("NEXT_RESEND_API_KEY", "re_alias");

    const { serverConfig } = await import("./serverConfig");

    expect(serverConfig.transport).toMatchObject({
      auth: { user: "resend", pass: "re_canonical" },
    });
  });

  it("uses the dedicated Resend sender before the legacy sender", async () => {
    vi.stubEnv("RESEND_FROM", "bookings@calbook.test");
    vi.stubEnv("EMAIL_FROM", "legacy@calbook.test");

    const { serverConfig } = await import("./serverConfig");

    expect(serverConfig.from).toBe("bookings@calbook.test");
  });

  it("retains authenticated SMTP when Resend is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NEXT_RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_SERVER_HOST", "smtp.example.com");
    vi.stubEnv("EMAIL_SERVER_PORT", "587");
    vi.stubEnv("EMAIL_SERVER_USER", "mailer");
    vi.stubEnv("EMAIL_SERVER_PASSWORD", "password");

    const { serverConfig } = await import("./serverConfig");

    expect(serverConfig.transport).toMatchObject({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      auth: { user: "mailer", pass: "password" },
    });
  });
});
