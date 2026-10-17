import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "../http-error";
import { checkCfTurnstileToken, INVALID_CLOUDFLARE_TOKEN_ERROR } from "./checkCfTurnstileToken";

const verification = {
  token: "fresh-token",
  remoteIp: "192.0.2.1",
  expectedAction: "signup",
  expectedHostname: "calbook-ai-v2-web.vercel.app",
};

describe("checkCfTurnstileToken", () => {
  beforeEach(() => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET", "test-secret");
    vi.stubEnv("NEXT_PUBLIC_CLOUDFLARE_SITEKEY", "");
    vi.stubEnv("NEXT_PUBLIC_IS_E2E", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("accepts a valid token for the signup action and expected hostname", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, action: "signup", hostname: verification.expectedHostname }),
    });
    vi.stubGlobal("fetch", fetch);

    await expect(checkCfTurnstileToken(verification)).resolves.toEqual({ success: true });
    expect(fetch).toHaveBeenCalledOnce();
    const [, options] = fetch.mock.calls[0];
    expect(new URLSearchParams(options.body).get("response")).toBe("fresh-token");
  });

  it.each([
    { success: false, action: "signup", hostname: verification.expectedHostname },
    { success: true, action: "login", hostname: verification.expectedHostname },
    { success: true, action: "signup", hostname: "localhost" },
  ])("rejects a failed or mismatched siteverify response", async (response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => response }));

    await expect(checkCfTurnstileToken(verification)).rejects.toMatchObject({
      statusCode: 403,
      message: INVALID_CLOUDFLARE_TOKEN_ERROR,
    });
  });

  it("rejects missing or oversized tokens before contacting Cloudflare", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    await expect(checkCfTurnstileToken({ ...verification, token: undefined })).rejects.toBeInstanceOf(
      HttpError
    );
    await expect(checkCfTurnstileToken({ ...verification, token: "x".repeat(2049) })).rejects.toBeInstanceOf(
      HttpError
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails closed when siteverify is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    await expect(checkCfTurnstileToken(verification)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("leaves Turnstile optional when no secret is configured", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    await expect(checkCfTurnstileToken(verification)).resolves.toEqual({ success: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not allow a configured widget to bypass missing server credentials", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET", "");
    vi.stubEnv("NEXT_PUBLIC_CLOUDFLARE_SITEKEY", "configured-site-key");

    await expect(checkCfTurnstileToken(verification)).rejects.toMatchObject({ statusCode: 503 });
  });
});
