import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkRateLimitAndThrowError: vi.fn(),
  hash: vi.fn(() => "hashed-email"),
  sendMail: vi.fn(),
}));

vi.mock("@calcom/lib/constants", () => ({ APP_NAME: "CalBook.ai", WEBAPP_URL: "https://calbook.test" }));
vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({
  checkRateLimitAndThrowError: mocks.checkRateLimitAndThrowError,
}));
vi.mock("@calcom/lib/server/PiiHasher", () => ({ piiHasher: { hash: mocks.hash } }));
vi.mock("@calcom/lib/serverConfig", () => ({ serverConfig: { transport: {} } }));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail: mocks.sendMail }) },
}));

import sendVerificationRequest from "./sendVerificationRequest";

describe("sendVerificationRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimitAndThrowError.mockResolvedValue(undefined);
  });

  it("throttles email sign-in links with a normalized, hashed email identifier", async () => {
    mocks.checkRateLimitAndThrowError.mockRejectedValue(new Error("Rate limit exceeded"));

    await expect(
      sendVerificationRequest({
        identifier: " User@Example.com ",
        url: "https://calbook.test/api/auth/callback/email?token=test",
      })
    ).rejects.toThrow("Rate limit exceeded");

    expect(mocks.hash).toHaveBeenCalledWith("user@example.com");
    expect(mocks.checkRateLimitAndThrowError).toHaveBeenCalledWith({
      failClosed: true,
      rateLimitingType: "forcedSlowMode",
      identifier: "emailSignIn:hashed-email",
    });
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
});
