import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkRateLimitAndThrowError: vi.fn(),
  totpRawCheck: vi.fn(),
}));

vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({
  checkRateLimitAndThrowError: mocks.checkRateLimitAndThrowError,
}));
vi.mock("@calcom/lib/server/PiiHasher", () => ({ hashEmail: () => "hashed-email" }));
vi.mock("@calcom/lib/totp", () => ({ totpRawCheck: mocks.totpRawCheck }));

import { verifyCodeUnAuthenticated } from "./verifyCodeUnAuthenticated";

describe("verifyCodeUnAuthenticated", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires strict rate limiting before checking an email code", async () => {
    mocks.checkRateLimitAndThrowError.mockRejectedValue(new Error("Limiter unavailable"));

    await expect(verifyCodeUnAuthenticated("person@example.com", "123456")).rejects.toThrow(
      "Limiter unavailable"
    );
    expect(mocks.checkRateLimitAndThrowError).toHaveBeenCalledWith({
      failClosed: true,
      rateLimitingType: "core",
      identifier: "emailVerifyCode.hashed-email",
    });
    expect(mocks.totpRawCheck).not.toHaveBeenCalled();
  });
});
