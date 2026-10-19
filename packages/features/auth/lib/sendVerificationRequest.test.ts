import path from "node:path";
import process from "node:process";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const testRoot: string = process.cwd();

const mocks: {
  checkRateLimitAndThrowError: ReturnType<typeof vi.fn>;
  hash: ReturnType<typeof vi.fn>;
  sendMail: ReturnType<typeof vi.fn>;
  readFile: ReturnType<typeof vi.fn>;
  logError: ReturnType<typeof vi.fn>;
} = vi.hoisted(() => ({
  checkRateLimitAndThrowError: vi.fn(),
  hash: vi.fn(() => "hashed-email"),
  sendMail: vi.fn(),
  readFile: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    default: { ...actual, readFileSync: mocks.readFile },
    readFileSync: mocks.readFile,
  };
});
vi.mock("@calcom/lib/logger", () => ({ default: { error: mocks.logError } }));
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
    mocks.sendMail.mockReset();
    mocks.readFile.mockReset().mockReturnValue('<a href="{{signin_url}}">Sign in</a>');
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
    ).rejects.toThrow("Unable to send sign-in email (rate_limit).");

    expect(mocks.hash).toHaveBeenCalledWith("user@example.com");
    expect(mocks.checkRateLimitAndThrowError).toHaveBeenCalledWith({
      failClosed: true,
      rateLimitingType: "forcedSlowMode",
      identifier: "emailSignIn:hashed-email",
    });
    expect(mocks.sendMail).not.toHaveBeenCalled();
    expect(mocks.logError).toHaveBeenCalledWith("Sign-in email failed", { stage: "rate_limit" });
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
    expect(mocks.logError).not.toHaveBeenCalled();
  });

  it("propagates email delivery failures", async () => {
    mocks.sendMail.mockRejectedValue(
      new Error("SMTP unavailable: secret-password user@example.com token=test")
    );

    await expect(
      sendVerificationRequest({
        identifier: "user@example.com",
        url: "https://calbook.test/api/auth/callback/email?token=test",
      })
    ).rejects.toThrow("Unable to send sign-in email (transport).");
    expect(mocks.logError.mock.calls).toEqual([["Sign-in email failed", { stage: "transport" }]]);
  });

  it("reports template failures without logging file paths or sending mail", async () => {
    mocks.readFile.mockImplementation(() => {
      throw new Error("ENOENT /private/template/path");
    });
    await expect(
      sendVerificationRequest({
        identifier: "user@example.com",
        url: "https://calbook.test/api/auth/callback/email?token=secret",
      })
    ).rejects.toThrow("Unable to send sign-in email (template).");
    expect(mocks.logError.mock.calls).toEqual([["Sign-in email failed", { stage: "template" }]]);
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
});
