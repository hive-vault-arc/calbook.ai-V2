import path from "node:path";
import process from "node:process";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const testRoot: string = process.cwd();

const mocks: {
  checkRateLimitAndThrowError: ReturnType<typeof vi.fn>;
  hash: ReturnType<typeof vi.fn>;
  sendMail: ReturnType<typeof vi.fn>;
} = vi.hoisted(() => ({
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
    process.chdir(path.join(testRoot, "apps", "web"));
    vi.clearAllMocks();
    mocks.checkRateLimitAndThrowError.mockResolvedValue(undefined);
  });

  afterAll(() => process.chdir(testRoot));

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

  it("waits for the verification email to be delivered", async () => {
    await sendVerificationRequest({
      identifier: "user@example.com",
      url: "https://calbook.test/api/auth/callback/email?token=test",
    });

    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Your sign-in link for CalBook.ai",
      })
    );
  });

  it("propagates email delivery failures", async () => {
    mocks.sendMail.mockRejectedValue(new Error("SMTP unavailable"));

    await expect(
      sendVerificationRequest({
        identifier: "user@example.com",
        url: "https://calbook.test/api/auth/callback/email?token=test",
      })
    ).rejects.toThrow("SMTP unavailable");
  });
});
